/**
 * EcoTrack Citizen / User Page Controller
 */
(function(){
  'use strict';

  var selectedCategory = 'Household';
  var uploadedFile = null;
  var uploadedDataUrl = null;

  // Toast notification helper
  function showToast(message, isError) {
    var shelf = document.getElementById('toastShelf');
    if (!shelf) return;
    var toast = document.createElement('div');
    toast.className = 'toast-message';
    if (isError) toast.style.borderLeftColor = '#e11d48';
    toast.innerHTML = (isError ? '⚠️ ' : '✅ ') + message;
    shelf.appendChild(toast);
    setTimeout(function(){
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function(){ toast.remove(); }, 300);
    }, 3500);
  }

  // Format relative timestamp
  function timeAgo(dateString) {
    var ts = new Date(dateString).getTime();
    var diff = Date.now() - ts;
    var mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs / 24);
    return days + 'd ago';
  }

  function formatDate(dateString) {
    var d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Init page
  async function init() {
    setupBackendStatus();
    setupNavigationTabs();
    setupCategoryPicker();
    setupDropzone();
    setupGpsButton();
    setupForms();
    setupResetBtn();
    setupPhotoModal();

    await refreshAllData();
  }

  async function setupBackendStatus() {
    var pulse = document.getElementById('backendPulse');
    var text = document.getElementById('backendStatusText');

    var isLive = await window.EcoTrackAPI.checkBackend();
    if (isLive) {
      if (pulse) pulse.className = 'pulse-dot';
      if (text) text.textContent = 'Live API Connected';
    } else {
      if (pulse) pulse.className = 'pulse-dot demo';
      if (text) text.textContent = 'Demo Mode (Local)';
    }
  }

  function setupNavigationTabs() {
    var tabBtns = document.querySelectorAll('#userSubTabs .section-tab-btn');
    var panels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        panels.forEach(function(p) { p.style.display = 'none'; });

        btn.classList.add('active');
        var targetId = btn.getAttribute('data-tab');
        var targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.style.display = 'block';

        if (targetId === 'tab-history') renderReportsFeed();
        if (targetId === 'tab-scheduled-pickups') renderPickupsFeed();
        if (targetId === 'tab-notifications') renderNotificationsFeed();
      });
    });

    // Sub-search and filter
    var searchInput = document.getElementById('userReportSearch');
    var statusFilter = document.getElementById('userStatusFilter');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(renderReportsFeed, 250));
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', renderReportsFeed);
    }
  }

  function debounce(fn, ms) {
    var timer;
    return function() {
      clearTimeout(timer);
      var args = arguments;
      timer = setTimeout(function(){ fn.apply(null, args); }, ms);
    };
  }

  function setupCategoryPicker() {
    var buttons = document.querySelectorAll('.category-option-btn');
    var hiddenInput = document.getElementById('selectedWasteType');

    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedCategory = btn.getAttribute('data-type');
        if (hiddenInput) hiddenInput.value = selectedCategory;
      });
    });
  }

  function setupDropzone() {
    var dropzone = document.getElementById('reportDropzone');
    var fileInput = document.getElementById('reportPhotoInput');
    var promptBox = document.getElementById('dropzonePrompt');
    var previewBox = document.getElementById('photoPreviewBox');
    var previewImage = document.getElementById('previewImage');
    var fileName = document.getElementById('previewFileName');
    var fileSize = document.getElementById('previewFileSize');
    var removeBtn = document.getElementById('removePhotoBtn');

    if (!dropzone || !fileInput) return;

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        showToast('Please select an image file (JPG, PNG, WebP).', true);
        return;
      }
      uploadedFile = file;
      var reader = new FileReader();
      reader.onload = function(e) {
        uploadedDataUrl = e.target.result;
        previewImage.src = uploadedDataUrl;
        fileName.textContent = file.name;
        fileSize.textContent = Math.round(file.size / 1024) + ' KB';
        promptBox.style.display = 'none';
        previewBox.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.style.borderColor = '#10b981';
      dropzone.style.background = '#ecfdf5';
    });

    dropzone.addEventListener('dragleave', function() {
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    });

    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        uploadedFile = null;
        uploadedDataUrl = null;
        fileInput.value = '';
        previewBox.style.display = 'none';
        promptBox.style.display = 'block';
      });
    }
  }

  function setupGpsButton() {
    var btn = document.getElementById('useGpsBtn');
    var locInput = document.getElementById('reportLocation');
    if (!btn || !locInput) return;

    btn.addEventListener('click', function() {
      btn.textContent = '📍 Locating...';
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            btn.textContent = '📍 Detected!';
            locInput.value = `Geo: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Downtown Sector)`;
            showToast('Location coordinates captured.');
            setTimeout(function(){ btn.textContent = '📍 Auto-Detect GPS'; }, 2000);
          },
          function() {
            btn.textContent = '📍 Auto-Detect GPS';
            locInput.value = '14 Elm Street, Downtown';
            showToast('Using registered neighborhood address.');
          },
          { timeout: 5000 }
        );
      } else {
        locInput.value = '14 Elm Street, Downtown';
        btn.textContent = '📍 Auto-Detect GPS';
      }
    });
  }

  function setupForms() {
    // Waste Report Form
    var reportForm = document.getElementById('wasteReportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var submitBtn = document.getElementById('submitReportBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        var location = document.getElementById('reportLocation').value.trim();
        var description = document.getElementById('reportDescription').value.trim();
        var priority = document.getElementById('reportPriority').value;

        try {
          await window.EcoTrackAPI.createReport({
            wasteType: selectedCategory,
            location: location,
            description: description,
            priority: priority,
            file: uploadedFile,
            imageUrl: uploadedDataUrl || undefined
          });

          showToast('Incident report submitted! Municipal teams notified.');
          reportForm.reset();
          uploadedFile = null;
          uploadedDataUrl = null;
          document.getElementById('photoPreviewBox').style.display = 'none';
          document.getElementById('dropzonePrompt').style.display = 'block';

          await refreshAllData();

          // Switch to submissions tab
          var historyTabBtn = document.querySelector('[data-tab="tab-history"]');
          if (historyTabBtn) historyTabBtn.click();
        } catch (err) {
          showToast('Failed to submit report: ' + err.message, true);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Incident Report`;
        }
      });
    }

    // Schedule Pickup Form
    var pickupForm = document.getElementById('schedulePickupForm');
    var pickupDateInput = document.getElementById('pickupDate');
    if (pickupDateInput) {
      var tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      pickupDateInput.min = tomorrow;
      pickupDateInput.value = tomorrow;
    }

    if (pickupForm) {
      pickupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var submitBtn = document.getElementById('submitPickupBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';

        var wasteType = document.getElementById('pickupWasteType').value;
        var scheduledDate = document.getElementById('pickupDate').value;
        var address = document.getElementById('pickupAddress').value.trim();
        var notes = document.getElementById('pickupNotes').value.trim();

        try {
          await window.EcoTrackAPI.createPickup({
            wasteType: wasteType,
            scheduledDate: scheduledDate,
            location: address,
            description: notes
          });

          showToast(`Bulky collection booked for ${scheduledDate}!`);
          pickupForm.reset();
          if (pickupDateInput) pickupDateInput.value = tomorrow;

          await refreshAllData();

          var pickupTabBtn = document.querySelector('[data-tab="tab-scheduled-pickups"]');
          if (pickupTabBtn) pickupTabBtn.click();
        } catch (err) {
          showToast('Failed to schedule pickup: ' + err.message, true);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Confirm &amp; Book Collection`;
        }
      });
    }

    // Mark notifications read
    var markReadBtn = document.getElementById('markAllReadBtn');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', async function() {
        await window.EcoTrackAPI.markNotificationsRead();
        await refreshAllData();
        showToast('All notifications marked as read.');
      });
    }
  }

  function setupResetBtn() {
    var resetBtn = document.getElementById('resetDataBtn');
    if (!resetBtn) return;
    resetBtn.addEventListener('click', function() {
      if (confirm('Reset demo data back to default sample state?')) {
        window.EcoTrackAPI.resetData();
        showToast('Demo data restored.');
        refreshAllData();
      }
    });
  }

  function setupPhotoModal() {
    var modal = document.getElementById('photoModal');
    var closeBtn = document.getElementById('closePhotoModalBtn');
    var footerBtn = document.getElementById('closePhotoModalFooterBtn');

    function closeModal() {
      if (modal) modal.classList.remove('open');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (footerBtn) footerBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  window.openPhotoPreview = function(url, title) {
    var modal = document.getElementById('photoModal');
    var img = document.getElementById('modalPhotoImage');
    var titleElem = document.getElementById('modalPhotoTitle');
    if (modal && img) {
      img.src = url;
      if (titleElem) titleElem.textContent = title || 'Evidence Photo';
      modal.classList.add('open');
    }
  };

  // Render My Reports Feed
  async function renderReportsFeed() {
    var container = document.getElementById('userReportsFeed');
    if (!container) return;

    var searchVal = (document.getElementById('userReportSearch')?.value || '').trim();
    var statusVal = document.getElementById('userStatusFilter')?.value || 'All';

    var reports = await window.EcoTrackAPI.getReports({
      userOnly: true,
      search: searchVal,
      status: statusVal
    });

    var badge = document.getElementById('mySubmissionsBadge');
    if (badge) badge.textContent = reports.length;

    if (reports.length === 0) {
      container.innerHTML = `
        <div class="eco-card" style="text-align:center; padding:40px 20px;">
          <div style="font-size:36px; margin-bottom:10px;">🍃</div>
          <h4 style="font-size:16px; margin-bottom:4px;">No matching reports found</h4>
          <p style="color:var(--text-muted); font-size:13.5px;">You have no waste reports matching the active filters.</p>
        </div>
      `;
      return;
    }

    var html = reports.map(function(r) {
      var stepClassPending = 'completed';
      var stepClassAssigned = (r.status === 'Assigned' || r.status === 'In Progress' || r.status === 'Completed') ? 'completed' : '';
      var stepClassProgress = (r.status === 'In Progress' || r.status === 'Completed') ? 'completed' : (r.status === 'Assigned' ? 'active' : '');
      var stepClassCompleted = (r.status === 'Completed') ? 'completed active' : '';

      var collectorInfo = r.assignedCollector ? `
        <div class="collector-pill">
          <div class="collector-avatar-mini">👷</div>
          <span>Assigned: <strong>${r.assignedCollector.name}</strong></span>
        </div>
      ` : '';

      var deleteBtn = (r.status === 'Pending') ? `
        <button class="btn-secondary btn-sm btn-danger" onclick="window.handleCancelReport('${r._id || r.id}')" style="margin-left:auto;">
          Cancel Report
        </button>
      ` : '';

      var proofBadge = r.proofImage ? `
        <span class="status-tag Completed" style="cursor:pointer;" onclick="window.openPhotoPreview('${r.proofImage}', 'Resolution Proof Photo - ${r.id}')">
          📷 View Proof Photo
        </span>
      ` : '';

      return `
        <article class="report-feed-card">
          <div class="feed-card-header">
            <div class="feed-header-left">
              <span class="ticket-id">${r.id}</span>
              <span class="status-tag ${r.status}">${r.status}</span>
              <span class="priority-tag ${r.priority || 'Normal'}">${r.priority || 'Normal'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:12px; color:var(--text-muted);">Submitted ${timeAgo(r.createdAt)}</span>
              ${deleteBtn}
            </div>
          </div>

          <div class="feed-card-content">
            <img src="${r.image || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80'}"
                 class="feed-img-thumb" alt="Report image"
                 onclick="window.openPhotoPreview('${r.image}', 'Report ${r.id} Evidence Photo')"
                 title="Click to zoom evidence">
            <div class="feed-details">
              <h4>${r.wasteType} Waste Issue</h4>
              <div class="feed-location">
                📍 <span>${r.location}</span>
              </div>
              <p class="feed-desc">${escapeHtml(r.description)}</p>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:8px;">
                ${collectorInfo}
                ${proofBadge}
              </div>
            </div>
          </div>

          <!-- Progress Pipeline -->
          <div class="pipeline-stepper">
            <div class="pipeline-step ${stepClassPending}">
              <div class="step-indicator">✓</div>
              <div class="step-label">1. Reported</div>
            </div>
            <div class="pipeline-step ${stepClassAssigned}">
              <div class="step-indicator">${stepClassAssigned ? '✓' : '2'}</div>
              <div class="step-label">2. Assigned</div>
            </div>
            <div class="pipeline-step ${stepClassProgress}">
              <div class="step-indicator">${stepClassProgress.includes('completed') ? '✓' : '3'}</div>
              <div class="step-label">3. In Route</div>
            </div>
            <div class="pipeline-step ${stepClassCompleted}">
              <div class="step-indicator">${stepClassCompleted ? '✓' : '4'}</div>
              <div class="step-label">4. Cleaned</div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Handle report cancellation
  window.handleCancelReport = async function(id) {
    if (confirm('Are you sure you want to withdraw this pending report?')) {
      try {
        await window.EcoTrackAPI.deleteReport(id);
        showToast('Report cancelled successfully.');
        await refreshAllData();
      } catch (err) {
        showToast('Could not delete report: ' + err.message, true);
      }
    }
  };

  // Render Pickups Feed
  async function renderPickupsFeed() {
    var container = document.getElementById('userPickupsFeed');
    if (!container) return;

    var pickups = await window.EcoTrackAPI.getPickups();
    var badge = document.getElementById('myPickupsBadge');
    if (badge) badge.textContent = pickups.length;

    if (pickups.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px 0; color:var(--text-muted);">
          No scheduled pickups yet. Click "Schedule Pickup" to request bulky waste removal.
        </div>
      `;
      return;
    }

    var html = pickups.map(function(p) {
      return `
        <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
              <span class="ticket-id">${p.id}</span>
              <span class="status-tag ${p.status}">${p.status}</span>
              <span style="font-weight:700; font-size:14px;">${p.wasteType}</span>
            </div>
            <div style="font-size:13.5px; color:var(--text-muted); margin-bottom:4px;">
              📅 Pickup scheduled for: <strong style="color:var(--text);">${formatDate(p.scheduledDate)}</strong>
            </div>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">
              📍 Address: ${p.location}
            </div>
            <div style="font-size:13px; color:var(--text);">${escapeHtml(p.description)}</div>
          </div>
          <div>
            ${p.assignedCollector ? `
              <div class="collector-pill">
                <div class="collector-avatar-mini">🚛</div>
                <span>Collector: <strong>${p.assignedCollector.name}</strong></span>
              </div>
            ` : '<span style="font-size:12px; color:var(--text-muted);">Dispatcher reviewing request</span>'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Render Notifications Feed
  async function renderNotificationsFeed() {
    var container = document.getElementById('userNotificationList');
    if (!container) return;

    var notifs = await window.EcoTrackAPI.getNotifications();
    var unreadCount = notifs.filter(function(n){ return !n.read; }).length;
    var badge = document.getElementById('unreadNotifBadge');
    if (badge) badge.textContent = unreadCount;

    if (notifs.length === 0) {
      container.innerHTML = '<li style="color:var(--text-muted); padding:20px 0; text-align:center;">No notifications yet.</li>';
      return;
    }

    var html = notifs.map(function(n) {
      return `
        <li style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13.5px; font-weight:${n.read ? '500' : '700'}; color:var(--text);">
              ${n.read ? '' : '<span style="color:#10b981;">● </span>'}
              ${escapeHtml(n.message)}
            </div>
            <div class="when" style="margin-top:3px;">${timeAgo(n.createdAt)}</div>
          </div>
        </li>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Refresh all summary stats
  async function refreshAllData() {
    var reports = await window.EcoTrackAPI.getReports({ userOnly: true });
    var pickups = await window.EcoTrackAPI.getPickups();
    var notifs = await window.EcoTrackAPI.getNotifications();

    var activeTickets = reports.filter(function(r){ return r.status === 'Pending' || r.status === 'Assigned' || r.status === 'In Progress'; }).length;
    var unreadCount = notifs.filter(function(n){ return !n.read; }).length;

    var statReportCount = document.getElementById('statReportCount');
    var statActiveCount = document.getElementById('statActiveCount');
    var mySubmissionsBadge = document.getElementById('mySubmissionsBadge');
    var myPickupsBadge = document.getElementById('myPickupsBadge');
    var unreadNotifBadge = document.getElementById('unreadNotifBadge');

    if (statReportCount) statReportCount.textContent = reports.length;
    if (statActiveCount) statActiveCount.textContent = activeTickets;
    if (mySubmissionsBadge) mySubmissionsBadge.textContent = reports.length;
    if (myPickupsBadge) myPickupsBadge.textContent = pickups.length;
    if (unreadNotifBadge) unreadNotifBadge.textContent = unreadCount;

    renderReportsFeed();
    renderPickupsFeed();
    renderNotificationsFeed();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
