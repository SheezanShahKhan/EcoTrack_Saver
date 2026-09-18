/**
 * EcoTrack Municipal Admin Operations Dashboard Controller
 */
(function(){
  'use strict';

  var currentReports = [];
  var activeInspectReportId = null;

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

  async function init() {
    setupBackendStatus();
    setupFilters();
    setupModal();
    setupActions();
    renderLiveTimestamp();

    await loadDashboard();
  }

  function renderLiveTimestamp() {
    var elem = document.getElementById('liveDateStamp');
    if (elem) {
      var now = new Date();
      elem.textContent = 'Municipal Command Live Feed • ' + now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  async function setupBackendStatus() {
    var pulse = document.getElementById('adminBackendPulse');
    var text = document.getElementById('adminBackendStatusText');

    var isLive = await window.EcoTrackAPI.checkBackend();
    if (isLive) {
      if (pulse) pulse.className = 'pulse-dot';
      if (text) text.textContent = 'Live API Connected';
    } else {
      if (pulse) pulse.className = 'pulse-dot demo';
      if (text) text.textContent = 'Demo Mode (Local)';
    }
  }

  function setupFilters() {
    var searchInput = document.getElementById('adminSearchInput');
    var statusFilter = document.getElementById('adminStatusFilter');
    var typeFilter = document.getElementById('adminWasteTypeFilter');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(loadReportsTable, 250));
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', loadReportsTable);
    }
    if (typeFilter) {
      typeFilter.addEventListener('change', loadReportsTable);
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

  function setupActions() {
    var refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function() {
        refreshBtn.disabled = true;
        await loadDashboard();
        showToast('Dashboard feed refreshed.');
        setTimeout(function(){ refreshBtn.disabled = false; }, 600);
      });
    }

    var resetBtn = document.getElementById('adminResetDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('Reset demo state back to default sample data?')) {
          window.EcoTrackAPI.resetData();
          showToast('Sample dataset restored.');
          loadDashboard();
        }
      });
    }

    var exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportToCsv);
    }
  }

  function setupModal() {
    var modal = document.getElementById('inspectModal');
    var closeBtn = document.getElementById('closeInspectModalBtn');
    var footerBtn = document.getElementById('closeInspectModalFooterBtn');

    function closeModal() {
      if (modal) modal.classList.remove('open');
      activeInspectReportId = null;
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (footerBtn) footerBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  // Master Dashboard Loader
  async function loadDashboard() {
    try {
      var stats = await window.EcoTrackAPI.getAdminDashboard();

      // KPIs
      document.getElementById('kpiTotal').textContent = stats.total;
      document.getElementById('kpiPending').textContent = stats.pending;
      document.getElementById('kpiAssigned').textContent = stats.assigned;
      document.getElementById('kpiInProgress').textContent = stats.inProgress;
      document.getElementById('kpiCompleted').textContent = stats.completed;
      document.getElementById('kpiAvgDays').innerHTML = stats.avgResolutionDays + ' <span style="font-size:16px; font-weight:500;">days</span>';

      // Visualizations
      renderWasteDistribution(stats.byWasteType, stats.total);
      renderHotspots(stats.topLocations);

      // Tables
      await loadReportsTable();
      await loadPickupsTable();
    } catch (err) {
      console.error('Error loading admin dashboard', err);
      showToast('Error loading dashboard: ' + err.message, true);
    }
  }

  // Render Waste Distribution Bar Chart
  function renderWasteDistribution(breakdown, total) {
    var container = document.getElementById('wasteTypeBreakdownList');
    if (!container) return;

    if (!breakdown || breakdown.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No category statistics recorded yet.</div>';
      return;
    }

    var colorMap = {
      'Household': '#10b981',
      'Recyclable': '#2563eb',
      'Organic': '#84cc16',
      'E-waste': '#7c3aed',
      'Hazardous': '#e11d48',
      'Other': '#d97706'
    };

    var html = breakdown.map(function(item) {
      var pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
      var color = colorMap[item._id] || '#10b981';

      return `
        <div class="category-stat-row">
          <div class="category-stat-name">${item._id}</div>
          <div class="category-progress-track">
            <div class="category-progress-fill" style="width:${pct}%; background:${color};"></div>
          </div>
          <div class="category-stat-count">${item.count} <span style="font-size:11px; font-weight:normal; color:var(--text-light);">(${pct}%)</span></div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Render Hotspot Locations
  function renderHotspots(locations) {
    var container = document.getElementById('hotspotLocationsList');
    if (!container) return;

    if (!locations || locations.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No location reports recorded.</div>';
      return;
    }

    var html = locations.map(function(loc, index) {
      return `
        <div class="location-item">
          <div class="location-name">
            <span style="font-size:12px; font-weight:700; color:var(--text-muted); width:18px;">#${index + 1}</span>
            <span>📍 ${loc._id}</span>
          </div>
          <div class="hotspot-badge">${loc.count} ${loc.count === 1 ? 'incident' : 'incidents'}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Load and Render Reports Table
  async function loadReportsTable() {
    var tbody = document.getElementById('adminReportsTableBody');
    if (!tbody) return;

    var search = (document.getElementById('adminSearchInput')?.value || '').trim();
    var status = document.getElementById('adminStatusFilter')?.value || 'All';
    var wasteType = document.getElementById('adminWasteTypeFilter')?.value || 'All';

    currentReports = await window.EcoTrackAPI.getReports({
      search: search,
      status: status,
      wasteType: wasteType
    });

    if (currentReports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px 10px; color:var(--text-muted);">
            No matching incident reports found.
          </td>
        </tr>
      `;
      return;
    }

    var collectors = window.EcoTrackAPI.COLLECTORS;

    var html = currentReports.map(function(r) {
      var reporterName = (r.userId && r.userId.name) ? r.userId.name : 'Anonymous';
      var reporterEmail = (r.userId && r.userId.email) ? r.userId.email : 'citizen@portal.org';

      var assignedId = r.assignedCollector ? (r.assignedCollector._id || r.assignedCollector.id || r.assignedCollector) : '';

      var optionsHtml = `<option value="">-- Assign Collector --</option>` + collectors.map(function(c) {
        var isSel = (assignedId === c.id || (r.assignedCollector && r.assignedCollector.name === c.name)) ? 'selected' : '';
        return `<option value="${c.id}" ${isSel}>${c.name} (${c.vehicle})</option>`;
      }).join('');

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${r.image || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80'}"
                   style="width:40px; height:40px; border-radius:4px; object-fit:cover; border:1px solid var(--border); cursor:pointer;"
                   onclick="window.openInspectModal('${r._id || r.id}')"
                   title="Click to inspect report">
              <div>
                <span class="ticket-id" style="display:block; cursor:pointer;" onclick="window.openInspectModal('${r._id || r.id}')">${r.id}</span>
                <span style="font-size:11px; color:var(--text-muted);">${timeAgo(r.createdAt)}</span>
              </div>
            </div>
          </td>
          <td>
            <strong>${r.wasteType}</strong>
            <div><span class="priority-tag ${r.priority || 'Normal'}">${r.priority || 'Normal'}</span></div>
          </td>
          <td>
            <div class="table-location-cell" title="${r.location}">
              📍 ${r.location}
            </div>
          </td>
          <td>
            <div class="table-reporter">
              <span class="name">${reporterName}</span>
              <span class="email">${reporterEmail}</span>
            </div>
          </td>
          <td>
            <span class="status-tag ${r.status}">${r.status}</span>
          </td>
          <td>
            <select class="assign-dropdown" onchange="window.handleAssignCollector('${r._id || r.id}', this.value)">
              ${optionsHtml}
            </select>
          </td>
          <td style="text-align:right;">
            <button class="btn-secondary btn-sm" onclick="window.openInspectModal('${r._id || r.id}')">
              Inspect
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  }

  // Handle Collector Assignment
  window.handleAssignCollector = async function(reportId, collectorId) {
    if (!collectorId) return;

    try {
      var updated = await window.EcoTrackAPI.assignCollector(reportId, collectorId);
      showToast(`Assigned ${updated.id} to ${updated.assignedCollector.name}!`);
      await loadDashboard();
    } catch (err) {
      showToast('Assignment error: ' + err.message, true);
    }
  };

  // Load Pickups Table
  async function loadPickupsTable() {
    var tbody = document.getElementById('adminPickupsTableBody');
    if (!tbody) return;

    var pickups = await window.EcoTrackAPI.getPickups();
    if (pickups.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:24px 10px; color:var(--text-muted);">
            No scheduled bulky pickups booked at this time.
          </td>
        </tr>
      `;
      return;
    }

    var collectors = window.EcoTrackAPI.COLLECTORS;

    var html = pickups.map(function(p) {
      var assignedId = p.assignedCollector ? (p.assignedCollector._id || p.assignedCollector.id) : '';

      var optionsHtml = `<option value="">-- Assign Hauler --</option>` + collectors.map(function(c) {
        var isSel = (assignedId === c.id || (p.assignedCollector && p.assignedCollector.name === c.name)) ? 'selected' : '';
        return `<option value="${c.id}" ${isSel}>${c.name} (${c.vehicle})</option>`;
      }).join('');

      var residentName = (p.userId && p.userId.name) ? p.userId.name : 'Resident';

      return `
        <tr>
          <td><span class="ticket-id">${p.id}</span></td>
          <td><strong>${formatDate(p.scheduledDate)}</strong></td>
          <td><span class="status-tag Assigned">${p.wasteType}</span></td>
          <td>📍 ${p.location}</td>
          <td>${residentName}</td>
          <td><span class="status-tag ${p.status}">${p.status}</span></td>
          <td>
            <select class="assign-dropdown" onchange="window.handleAssignPickup('${p._id || p.id}', this.value)">
              ${optionsHtml}
            </select>
          </td>
          <td style="text-align:right;">
            <button class="btn-secondary btn-sm" onclick="alert('Pickup notes: ${escapeHtml(p.description)}')">Notes</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  }

  // Handle Pickup Assignment
  window.handleAssignPickup = async function(pickupId, collectorId) {
    if (!collectorId) return;
    try {
      var updated = await window.EcoTrackAPI.assignPickupCollector(pickupId, collectorId);
      showToast(`Hauler ${updated.assignedCollector.name} assigned to pickup ${updated.id}!`);
      await loadDashboard();
    } catch (err) {
      showToast('Could not assign pickup: ' + err.message, true);
    }
  };

  // Inspect Modal
  window.openInspectModal = function(reportId) {
    activeInspectReportId = reportId;
    var report = currentReports.find(function(r) { return (r._id === reportId || r.id === reportId); });
    if (!report) return;

    var modal = document.getElementById('inspectModal');
    var title = document.getElementById('inspectModalTitle');
    var content = document.getElementById('inspectModalContent');
    var footer = document.getElementById('inspectModalFooter');

    title.textContent = `Incident Inspection — ${report.id} (${report.wasteType})`;

    var reporterName = (report.userId && report.userId.name) ? report.userId.name : 'Citizen';
    var reporterEmail = (report.userId && report.userId.email) ? report.userId.email : 'N/A';

    var proofHtml = report.proofImage ? `
      <div style="margin-top:16px;">
        <label class="form-label">Resolution Proof (Uploaded by Collector):</label>
        <img src="${report.proofImage}" style="max-width:100%; max-height:220px; border-radius:var(--radius-md); object-fit:cover; border:1px solid var(--border);" alt="Proof">
      </div>
    ` : '';

    content.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div>
          <label class="form-label">Submitted Photo Evidence:</label>
          <img src="${report.image || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80'}"
               style="width:100%; height:180px; object-fit:cover; border-radius:var(--radius-md); border:1px solid var(--border);" alt="Incident photo">
        </div>
        <div>
          <div style="margin-bottom:10px;">
            <label class="form-label">Current Status</label>
            <span class="status-tag ${report.status}">${report.status}</span>
          </div>
          <div style="margin-bottom:10px;">
            <label class="form-label">Reported By</label>
            <div style="font-weight:600;">${reporterName}</div>
            <div style="font-size:12px; color:var(--text-muted);">${reporterEmail}</div>
          </div>
          <div style="margin-bottom:10px;">
            <label class="form-label">Assigned Fleet Collector</label>
            <div>${report.assignedCollector ? report.assignedCollector.name : '<em>Unassigned</em>'}</div>
          </div>
          <div>
            <label class="form-label">Reported At</label>
            <div style="font-size:13px;">${formatDate(report.createdAt)} (${timeAgo(report.createdAt)})</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label class="form-label">Incident Location</label>
        <div style="background:var(--bg-subtle); padding:8px 12px; border-radius:var(--radius-sm); font-size:13.5px;">
          📍 ${report.location}
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label class="form-label">Citizen Description</label>
        <div style="background:var(--bg-subtle); padding:10px 12px; border-radius:var(--radius-sm); font-size:13.5px; line-height:1.45;">
          ${escapeHtml(report.description)}
        </div>
      </div>

      ${proofHtml}

      <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border);">
        <label class="form-label">Admin Status Override</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
          <button class="btn-secondary btn-sm" onclick="window.overrideStatus('${report._id || report.id}', 'Pending')">Set Pending</button>
          <button class="btn-secondary btn-sm" onclick="window.overrideStatus('${report._id || report.id}', 'Assigned')">Set Assigned</button>
          <button class="btn-secondary btn-sm" onclick="window.overrideStatus('${report._id || report.id}', 'In Progress')">Set In Progress</button>
          <button class="btn-primary btn-sm" onclick="window.overrideStatus('${report._id || report.id}', 'Completed')">Mark Cleaned / Completed</button>
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn-secondary btn-sm btn-danger" onclick="window.deleteIncident('${report._id || report.id}')" style="margin-right:auto;">
        Delete Incident
      </button>
      <button class="btn-secondary" id="closeInspectModalFooterBtn2">Close</button>
    `;

    document.getElementById('closeInspectModalFooterBtn2')?.addEventListener('click', function() {
      modal.classList.remove('open');
    });

    modal.classList.add('open');
  };

  window.overrideStatus = async function(reportId, newStatus) {
    try {
      await window.EcoTrackAPI.updateReport(reportId, { status: newStatus });
      showToast(`Status of ${reportId} updated to ${newStatus}`);
      document.getElementById('inspectModal')?.classList.remove('open');
      await loadDashboard();
    } catch (err) {
      showToast('Could not update status: ' + err.message, true);
    }
  };

  window.deleteIncident = async function(reportId) {
    if (confirm(`Permanently delete incident ticket ${reportId}?`)) {
      try {
        await window.EcoTrackAPI.deleteReport(reportId);
        showToast(`Incident ticket deleted.`);
        document.getElementById('inspectModal')?.classList.remove('open');
        await loadDashboard();
      } catch (err) {
        showToast('Could not delete: ' + err.message, true);
      }
    }
  };

  // CSV Exporter
  function exportToCsv() {
    if (!currentReports || currentReports.length === 0) {
      showToast('No report records to export.', true);
      return;
    }

    var headers = ['ID', 'WasteType', 'Priority', 'Status', 'Location', 'CitizenName', 'CollectorName', 'CreatedAt', 'CompletedAt'];
    var rows = currentReports.map(function(r) {
      return [
        r.id,
        r.wasteType,
        r.priority || 'Normal',
        r.status,
        `"${(r.location || '').replace(/"/g, '""')}"`,
        `"${(r.userId ? r.userId.name : '').replace(/"/g, '""')}"`,
        `"${(r.assignedCollector ? r.assignedCollector.name : '').replace(/"/g, '""')}"`,
        r.createdAt,
        r.completedAt || ''
      ].join(',');
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecotrack_operations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV Export generated and downloaded.');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
