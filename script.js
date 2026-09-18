/**
 * EcoTrack Landing & Collector Workspace Controller
 */
(function(){
  'use strict';

  var currentCollector = 'Alex Rivera';

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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function init() {
    setupBackendPill();
    setupCollectorSelect();
    setupResetBtn();
    setupNav();

    await renderCollectorWorkspace();
  }

  async function setupBackendPill() {
    var pulse = document.getElementById('homeBackendPulse');
    var text = document.getElementById('homeBackendStatusText');
    var isLive = await window.EcoTrackAPI.checkBackend();
    if (isLive) {
      if (pulse) pulse.className = 'pulse-dot';
      if (text) text.textContent = 'Live API';
    } else {
      if (pulse) pulse.className = 'pulse-dot demo';
      if (text) text.textContent = 'Demo Mode';
    }
  }

  function setupNav() {
    var link = document.getElementById('navToCollector');
    if (link) {
      link.addEventListener('click', function(e) {
        var section = document.getElementById('collector-section');
        if (section) {
          e.preventDefault();
          section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  function setupResetBtn() {
    var btn = document.getElementById('resetBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
      if (confirm('Reset demo state back to default sample data?')) {
        window.EcoTrackAPI.resetData();
        renderCollectorWorkspace();
        alert('Demo state restored to clean initial sample data.');
      }
    });
  }

  function setupCollectorSelect() {
    var sel = document.getElementById('collectorSelect');
    if (!sel) return;

    var collectors = window.EcoTrackAPI.COLLECTORS;
    sel.innerHTML = collectors.map(function(c) {
      return `<option value="${c.name}">${c.name} (${c.vehicle})</option>`;
    }).join('');

    sel.value = currentCollector;
    sel.addEventListener('change', function() {
      currentCollector = sel.value;
      renderCollectorWorkspace();
    });
  }

  async function renderCollectorWorkspace() {
    var activeListEl = document.getElementById('collectorList');
    var histListEl = document.getElementById('collectorHistory');
    if (!activeListEl || !histListEl) return;

    var allReports = await window.EcoTrackAPI.getReports();

    var assignedReports = allReports.filter(function(r) {
      var cName = r.assignedCollector ? r.assignedCollector.name : null;
      return cName === currentCollector && (r.status === 'Assigned' || r.status === 'In Progress');
    });

    var completedReports = allReports.filter(function(r) {
      var cName = r.assignedCollector ? r.assignedCollector.name : null;
      return cName === currentCollector && r.status === 'Completed';
    });

    // Render In Progress / Assigned
    if (assignedReports.length === 0) {
      activeListEl.innerHTML = `
        <div style="padding:24px; text-align:center; border:1px dashed var(--border); border-radius:var(--radius-md); color:var(--text-muted); font-size:13.5px;">
          No active pickups currently dispatched to ${currentCollector}.
        </div>
      `;
    } else {
      activeListEl.innerHTML = assignedReports.map(function(r) {
        var actionBtn = r.status === 'Assigned'
          ? `<button class="btn-primary btn-sm" onclick="window.collectorStart('${r._id || r.id}')">Start Route</button>`
          : `<button class="btn-primary btn-sm" style="background:#059669;" onclick="window.collectorComplete('${r._id || r.id}')">Mark Cleaned &amp; Upload Proof</button>`;

        return `
          <div class="eco-card" style="padding:16px; margin-bottom:12px; border-left:4px solid ${r.status === 'In Progress' ? '#7c3aed' : '#2563eb'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <span class="ticket-id">${r.id}</span>
              <span class="status-tag ${r.status}">${r.status}</span>
            </div>
            <h5 style="font-size:14px; font-weight:700; margin-bottom:4px;">${r.wasteType} Waste</h5>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">📍 ${r.location}</div>
            <p style="font-size:13px; margin-bottom:12px;">${escapeHtml(r.description)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11.5px; color:var(--text-muted);">${timeAgo(r.createdAt)}</span>
              ${actionBtn}
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Completed
    if (completedReports.length === 0) {
      histListEl.innerHTML = `
        <div style="padding:24px; text-align:center; border:1px dashed var(--border); border-radius:var(--radius-md); color:var(--text-muted); font-size:13.5px;">
          No completed pickups logged for this shift yet.
        </div>
      `;
    } else {
      histListEl.innerHTML = completedReports.map(function(r) {
        return `
          <div class="eco-card" style="padding:14px; margin-bottom:10px; border-left:4px solid #10b981;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="ticket-id">${r.id}</span>
              <span class="status-tag Completed">Completed</span>
            </div>
            <div style="font-size:13.5px; font-weight:600;">${r.wasteType}</div>
            <div style="font-size:12.5px; color:var(--text-muted);">📍 ${r.location}</div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Resolved ${formatDate(r.completedAt || r.createdAt)}</div>
          </div>
        `;
      }).join('');
    }
  }

  window.collectorStart = async function(id) {
    try {
      await window.EcoTrackAPI.updateReport(id, { status: 'In Progress' });
      await renderCollectorWorkspace();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.collectorComplete = async function(id) {
    var proof = prompt('Enter resolution verification note or image URL:', 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80');
    if (proof !== null) {
      try {
        await window.EcoTrackAPI.updateReport(id, {
          status: 'Completed',
          proofImage: proof || 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80'
        });
        await renderCollectorWorkspace();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
