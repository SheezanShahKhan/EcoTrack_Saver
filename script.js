(function(){

  var WASTE_TYPES = ['Household','Recyclable','Organic','E-waste','Hazardous','Other'];
  var COLLECTORS = ['Alex Rivera','Priya Nair','Sam Okafor','Jordan Lee'];
  var STORE_KEY = 'ecotrack_demo_v1';

  var DAY = 24*60*60*1000;

  function seedData(){
    var now = Date.now();
    return {
      nextId: 1006,
      viewingCollector: 'Alex Rivera',
      reports: [
        {
          id:'WR-1001', wasteType:'Household', location:'14 Elm Street',
          description:'Two bags of trash left out past collection day, starting to smell.',
          photo:null, status:'Completed', collector:'Alex Rivera',
          createdAt: now - 6*DAY, completedAt: now - 4*DAY, proofPhoto:null
        },
        {
          id:'WR-1002', wasteType:'Recyclable', location:'Riverside Park, north entrance',
          description:'Overflowing recycling bin near the picnic area.',
          photo:null, status:'Completed', collector:'Priya Nair',
          createdAt: now - 9*DAY, completedAt: now - 7*DAY, proofPhoto:null
        },
        {
          id:'WR-1003', wasteType:'E-waste', location:'88 Birch Avenue',
          description:'Old washing machine dumped on the curb.',
          photo:null, status:'In Progress', collector:'Alex Rivera',
          createdAt: now - 2*DAY, completedAt:null, proofPhoto:null
        },
        {
          id:'WR-1004', wasteType:'Organic', location:'Market Street, behind the grocery stalls',
          description:'Food waste from the weekend market not picked up.',
          photo:null, status:'Assigned', collector:'Alex Rivera',
          createdAt: now - 1*DAY, completedAt:null, proofPhoto:null
        },
        {
          id:'WR-1005', wasteType:'Hazardous', location:'22 Cedar Lane',
          description:'Leaking paint cans left at the roadside.',
          photo:null, status:'Pending', collector:null,
          createdAt: now - 0.4*DAY, completedAt:null, proofPhoto:null
        }
      ],
      notifications: [
        { id:1, message:'Report WR-1001 was marked Completed.', createdAt: now - 4*DAY },
        { id:2, message:'Report WR-1002 was marked Completed.', createdAt: now - 7*DAY },
        { id:3, message:'Report WR-1003 was assigned to Alex Rivera.', createdAt: now - 2*DAY },
        { id:4, message:'Collector started work on WR-1003.', createdAt: now - 1.8*DAY },
        { id:5, message:'Report WR-1004 was assigned to Alex Rivera.', createdAt: now - 1*DAY }
      ]
    };
  }

  var state = load();

  function load(){
    try{
      var raw = localStorage.getItem(STORE_KEY);
      if(!raw) return seedData();
      var parsed = JSON.parse(raw);
      if(!parsed || !parsed.reports) return seedData();
      return parsed;
    }catch(e){
      return seedData();
    }
  }

  function save(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch(e){ /* storage unavailable — demo still works in-memory */ }
  }

  function notify(message){
    state.notifications.unshift({ id: Date.now(), message: message, createdAt: Date.now() });
  }

  function fmtDate(ts){
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
  }

  function timeAgo(ts){
    var mins = Math.round((Date.now()-ts)/60000);
    if(mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins/60);
    if(hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs/24);
    return days + 'd ago';
  }

  function statusClass(s){
    return { Pending:'pending', Assigned:'assigned', 'In Progress':'progress', Completed:'completed' }[s] || 'pending';
  }

  // ---------- tabs ----------
  var tabButtons = document.querySelectorAll('#tabs button');
  tabButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      tabButtons.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ---------- citizen: photo preview ----------
  var photoDataUrl = null;
  var photoInput = document.getElementById('photoInput');
  photoInput.addEventListener('change', function(){
    var file = photoInput.files[0];
    if(!file){ photoDataUrl = null; return; }
    var reader = new FileReader();
    reader.onload = function(e){
      photoDataUrl = e.target.result;
      var img = document.getElementById('photoPreview');
      img.src = photoDataUrl;
      img.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('reportForm').addEventListener('submit', function(e){
    e.preventDefault();
    var wasteType = document.getElementById('wasteType').value;
    var location = document.getElementById('location').value.trim();
    var description = document.getElementById('description').value.trim();
    if(!wasteType || !location || !description) return;

    var id = 'WR-' + state.nextId;
    state.nextId += 1;

    state.reports.unshift({
      id: id, wasteType: wasteType, location: location, description: description,
      photo: photoDataUrl, status: 'Pending', collector: null,
      createdAt: Date.now(), completedAt: null, proofPhoto: null
    });
    notify('Report ' + id + ' was submitted and is waiting for review.');

    e.target.reset();
    photoDataUrl = null;
    document.getElementById('photoPreview').style.display = 'none';

    save();
    renderAll();
  });

  // ---------- render: citizen ----------
  function renderCitizen(){
    var list = document.getElementById('myReports');
    if(state.reports.length === 0){
      list.innerHTML = '<div class="empty">No reports yet — submit one on the left.</div>';
    } else {
      list.innerHTML = state.reports.map(function(r){
        return '' +
        '<div class="report-row">' +
          '<div class="top-line">' +
            '<span class="waste-type">' + r.wasteType + '</span>' +
            '<span class="status ' + statusClass(r.status) + '">' + r.status + '</span>' +
          '</div>' +
          '<div class="loc">' + escapeHtml(r.location) + '</div>' +
          '<div class="desc">' + escapeHtml(r.description) + '</div>' +
          (r.photo ? '<img class="thumb" src="' + r.photo + '">' : '') +
          '<div class="meta">' + r.id + ' · reported ' + fmtDate(r.createdAt) +
            (r.collector ? ' · collector: ' + r.collector : '') + '</div>' +
        '</div>';
      }).join('');
    }

    var notifList = document.getElementById('notifList');
    if(state.notifications.length === 0){
      notifList.innerHTML = '<li>No notifications yet.</li>';
    } else {
      notifList.innerHTML = state.notifications.slice(0,8).map(function(n){
        return '<li>' + escapeHtml(n.message) + '<div class="when">' + timeAgo(n.createdAt) + '</div></li>';
      }).join('');
    }
  }

  // ---------- render: collector ----------
  var collectorSelect = document.getElementById('collectorSelect');
  collectorSelect.innerHTML = COLLECTORS.map(function(c){ return '<option>' + c + '</option>'; }).join('');
  collectorSelect.value = state.viewingCollector;
  collectorSelect.addEventListener('change', function(){
    state.viewingCollector = collectorSelect.value;
    save();
    renderCollector();
  });

  function renderCollector(){
    var who = state.viewingCollector;
    var active = state.reports.filter(function(r){
      return r.collector === who && (r.status === 'Assigned' || r.status === 'In Progress');
    });
    var done = state.reports.filter(function(r){ return r.collector === who && r.status === 'Completed'; });

    var listEl = document.getElementById('collectorList');
    if(active.length === 0){
      listEl.innerHTML = '<div class="empty">No pickups assigned to ' + who + ' right now.</div>';
    } else {
      listEl.innerHTML = active.map(function(r){
        var actionBtn = r.status === 'Assigned'
          ? '<button class="btn small" data-action="start" data-id="' + r.id + '">Start collection</button>'
          : '<button class="btn small" data-action="complete" data-id="' + r.id + '">Mark complete</button>';
        var proofField = r.status === 'In Progress'
          ? '<input type="file" accept="image/*" data-proof="' + r.id + '" style="max-width:220px;">'
          : '';
        return '' +
        '<div class="report-row">' +
          '<div class="top-line">' +
            '<span class="waste-type">' + r.wasteType + '</span>' +
            '<span class="status ' + statusClass(r.status) + '">' + r.status + '</span>' +
          '</div>' +
          '<div class="loc">' + escapeHtml(r.location) + '</div>' +
          '<div class="desc">' + escapeHtml(r.description) + '</div>' +
          (r.photo ? '<img class="thumb" src="' + r.photo + '">' : '') +
          '<div class="meta">' + r.id + ' · reported ' + fmtDate(r.createdAt) + '</div>' +
          '<div class="actions">' + actionBtn + proofField + '</div>' +
        '</div>';
      }).join('');
    }

    var histEl = document.getElementById('collectorHistory');
    if(done.length === 0){
      histEl.innerHTML = '<div class="empty">Nothing completed yet.</div>';
    } else {
      histEl.innerHTML = done.map(function(r){
        return '<div class="report-row">' +
          '<div class="top-line"><span class="waste-type">' + r.wasteType + '</span>' +
          '<span class="status completed">Completed</span></div>' +
          '<div class="loc">' + escapeHtml(r.location) + '</div>' +
          '<div class="meta">' + r.id + ' · closed ' + fmtDate(r.completedAt) + '</div>' +
        '</div>';
      }).join('');
    }
  }

  document.getElementById('collectorList').addEventListener('click', function(e){
    var btn = e.target.closest('button[data-action]');
    if(!btn) return;
    var id = btn.dataset.id;
    var report = state.reports.find(function(r){ return r.id === id; });
    if(!report) return;

    if(btn.dataset.action === 'start'){
      report.status = 'In Progress';
      notify(report.id + ' is now in progress.');
      save();
      renderAll();
    }

    if(btn.dataset.action === 'complete'){
      var fileInput = document.querySelector('[data-proof="' + id + '"]');
      var file = fileInput && fileInput.files[0];
      var finish = function(dataUrl){
        report.status = 'Completed';
        report.completedAt = Date.now();
        report.proofPhoto = dataUrl || null;
        notify(report.id + ' was marked Completed.');
        save();
        renderAll();
      };
      if(file){
        var reader = new FileReader();
        reader.onload = function(e2){ finish(e2.target.result); };
        reader.readAsDataURL(file);
      } else {
        finish(null);
      }
    }
  });

  // ---------- render: admin ----------
  function renderAdmin(){
    var reports = state.reports;
    var total = reports.length;
    var pending = reports.filter(function(r){ return r.status === 'Pending'; }).length;
    var inProgress = reports.filter(function(r){ return r.status === 'In Progress'; }).length;
    var completed = reports.filter(function(r){ return r.status === 'Completed'; });

    var avgDays = 0;
    if(completed.length){
      var totalMs = completed.reduce(function(sum,r){ return sum + (r.completedAt - r.createdAt); }, 0);
      avgDays = (totalMs / completed.length / DAY).toFixed(1);
    }

    var stats = [
      { n: total, l: 'Total reports' },
      { n: pending, l: 'Pending' },
      { n: inProgress, l: 'In progress' },
      { n: completed.length, l: 'Completed' },
      { n: completed.length ? avgDays + 'd' : '—', l: 'Avg. resolution time' }
    ];
    document.getElementById('statRow').innerHTML = stats.map(function(s){
      return '<div class="stat"><div class="n">' + s.n + '</div><div class="l">' + s.l + '</div></div>';
    }).join('');

    var counts = {};
    WASTE_TYPES.forEach(function(t){ counts[t] = 0; });
    reports.forEach(function(r){ counts[r.wasteType] = (counts[r.wasteType]||0) + 1; });
    var max = Math.max.apply(null, Object.values(counts).concat([1]));
    document.getElementById('wasteBreakdown').innerHTML = WASTE_TYPES.map(function(t){
      var c = counts[t];
      var pct = Math.round((c/max)*100);
      return '<div class="bar-row"><span class="label">' + t + '</span>' +
        '<span class="track"><span class="fill" style="width:' + pct + '%"></span></span>' +
        '<span class="num">' + c + '</span></div>';
    }).join('');

    renderReportsTable();
  }

  function renderReportsTable(){
    var search = (document.getElementById('searchInput').value || '').toLowerCase();
    var statusFilter = document.getElementById('statusFilter').value;

    var rows = state.reports.filter(function(r){
      var matchesSearch = !search ||
        r.location.toLowerCase().indexOf(search) !== -1 ||
        r.description.toLowerCase().indexOf(search) !== -1;
      var matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    var tbody = document.getElementById('reportsTableBody');
    if(rows.length === 0){
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;">No reports match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function(r){
      var assignCell;
      if(r.status === 'Pending'){
        assignCell = '<select class="assign-select" data-id="' + r.id + '">' +
          COLLECTORS.map(function(c){ return '<option>' + c + '</option>'; }).join('') +
          '</select> ' +
          '<button class="btn small" data-assign="' + r.id + '">Assign</button>';
      } else {
        assignCell = '<span style="color:var(--muted);">—</span>';
      }
      return '<tr>' +
        '<td>' + r.id + '</td>' +
        '<td>' + r.wasteType + '</td>' +
        '<td>' + escapeHtml(r.location) + '</td>' +
        '<td class="desc-cell">' + escapeHtml(r.description) + '</td>' +
        '<td><span class="status ' + statusClass(r.status) + '">' + r.status + '</span></td>' +
        '<td>' + (r.collector || '—') + '</td>' +
        '<td>' + assignCell + '</td>' +
      '</tr>';
    }).join('');
  }

  document.getElementById('searchInput').addEventListener('input', renderReportsTable);
  document.getElementById('statusFilter').addEventListener('change', renderReportsTable);

  document.getElementById('reportsTableBody').addEventListener('click', function(e){
    var btn = e.target.closest('button[data-assign]');
    if(!btn) return;
    var id = btn.dataset.assign;
    var select = document.querySelector('select[data-id="' + id + '"]');
    var collectorName = select.value;
    var report = state.reports.find(function(r){ return r.id === id; });
    if(!report) return;
    report.status = 'Assigned';
    report.collector = collectorName;
    notify(report.id + ' was assigned to ' + collectorName + '.');
    save();
    renderAll();
  });

  // ---------- reset ----------
  document.getElementById('resetBtn').addEventListener('click', function(){
    if(!confirm('Reset all demo data back to the starting example reports?')) return;
    state = seedData();
    save();
    renderAll();
  });

  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderAll(){
    renderCitizen();
    renderCollector();
    renderAdmin();
  }

  renderAll();

})();
