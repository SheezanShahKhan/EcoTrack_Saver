/**
 * EcoTrack Unified API Client
 * Supports both live REST backend (http://localhost:5000/api) and offline demo persistence.
 */
(function(window){
  'use strict';

  var API_BASE = 'http://localhost:5000/api';
  var BACKEND_PING = 'http://localhost:5000/';
  var STORE_KEY = 'ecotrack_state_v2';
  var AUTH_KEY = 'ecotrack_auth';

  var COLLECTORS = [
    { id: 'c1', name: 'Alex Rivera', email: 'alex@ecotrack.org', vehicle: 'EV-Truck #104' },
    { id: 'c2', name: 'Priya Nair', email: 'priya@ecotrack.org', vehicle: 'Eco-Van #202' },
    { id: 'c3', name: 'Sam Okafor', email: 'sam@ecotrack.org', vehicle: 'Compact Compactor #308' },
    { id: 'c4', name: 'Jordan Lee', email: 'jordan@ecotrack.org', vehicle: 'Recycle Hauler #415' }
  ];

  var DAY = 24 * 60 * 60 * 1000;

  function seedInitialState() {
    var now = Date.now();
    return {
      reports: [
        {
          _id: 'rep_1001',
          id: 'WR-1001',
          wasteType: 'Household',
          location: '14 Elm Street, Downtown',
          description: 'Two bags of mixed household trash left near storm drain, requires standard pickup.',
          status: 'Completed',
          assignedCollector: { _id: 'c1', name: 'Alex Rivera' },
          userId: { _id: 'u1', name: 'Sarah Jenkins', email: 'sarah.j@example.com' },
          image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
          proofImage: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80',
          createdAt: new Date(now - 4 * DAY).toISOString(),
          completedAt: new Date(now - 2 * DAY).toISOString(),
          priority: 'Normal'
        },
        {
          _id: 'rep_1002',
          id: 'WR-1002',
          wasteType: 'Recyclable',
          location: 'Riverside Park, North Entrance',
          description: 'Overflowing public recycling receptacle with plastics and cardboard blowing onto the pathway.',
          status: 'Completed',
          assignedCollector: { _id: 'c2', name: 'Priya Nair' },
          userId: { _id: 'u2', name: 'David Cho', email: 'david.c@example.com' },
          image: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=400&q=80',
          proofImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80',
          createdAt: new Date(now - 7 * DAY).toISOString(),
          completedAt: new Date(now - 5 * DAY).toISOString(),
          priority: 'Normal'
        },
        {
          _id: 'rep_1003',
          id: 'WR-1003',
          wasteType: 'E-waste',
          location: '88 Birch Avenue, Westside',
          description: 'Old television set, microwave, and computer tower left on the curb during heavy rain.',
          status: 'In Progress',
          assignedCollector: { _id: 'c1', name: 'Alex Rivera' },
          userId: { _id: 'u1', name: 'Sarah Jenkins', email: 'sarah.j@example.com' },
          image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=400&q=80',
          proofImage: null,
          createdAt: new Date(now - 1.5 * DAY).toISOString(),
          completedAt: null,
          priority: 'High'
        },
        {
          _id: 'rep_1004',
          id: 'WR-1004',
          wasteType: 'Organic',
          location: 'Market Street, Behind Produce Stalls',
          description: 'Four wooden crates of spoiled fruit and vegetable trimmings attracting pests.',
          status: 'Assigned',
          assignedCollector: { _id: 'c3', name: 'Sam Okafor' },
          userId: { _id: 'u3', name: 'Elena Ramos', email: 'elena.r@example.com' },
          image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
          proofImage: null,
          createdAt: new Date(now - 0.8 * DAY).toISOString(),
          completedAt: null,
          priority: 'High'
        },
        {
          _id: 'rep_1005',
          id: 'WR-1005',
          wasteType: 'Hazardous',
          location: '22 Cedar Lane, Industrial District',
          description: 'Three rusted paint thinner buckets and spent motor oil canisters abandoned near gutter.',
          status: 'Pending',
          assignedCollector: null,
          userId: { _id: 'u1', name: 'Sarah Jenkins', email: 'sarah.j@example.com' },
          image: 'https://images.unsplash.com/photo-1516992654410-9309d4587e94?auto=format&fit=crop&w=400&q=80',
          proofImage: null,
          createdAt: new Date(now - 0.2 * DAY).toISOString(),
          completedAt: null,
          priority: 'Urgent'
        }
      ],
      pickups: [
        {
          _id: 'pk_101',
          id: 'PK-101',
          userId: { _id: 'u1', name: 'Sarah Jenkins', email: 'sarah.j@example.com' },
          location: '14 Elm Street, Apt 3B',
          wasteType: 'E-waste',
          description: 'Bulky refrigerator removal and 2 desktop monitors',
          scheduledDate: new Date(now + 2 * DAY).toISOString().split('T')[0],
          status: 'Confirmed',
          assignedCollector: { _id: 'c1', name: 'Alex Rivera' },
          createdAt: new Date(now - 1 * DAY).toISOString()
        },
        {
          _id: 'pk_102',
          id: 'PK-102',
          userId: { _id: 'u2', name: 'David Cho', email: 'david.c@example.com' },
          location: '45 Oak Ridge, Driveway',
          wasteType: 'Recyclable',
          description: 'Large volume cardboard bundling after moving',
          scheduledDate: new Date(now + 1 * DAY).toISOString().split('T')[0],
          status: 'Pending',
          assignedCollector: null,
          createdAt: new Date(now - 0.5 * DAY).toISOString()
        }
      ],
      notifications: [
        {
          id: 'notif_1',
          userId: 'u1',
          message: 'Your report WR-1003 has been accepted by Alex Rivera (EV-Truck #104) and is In Progress.',
          createdAt: new Date(now - 1.2 * DAY).toISOString(),
          read: false
        },
        {
          id: 'notif_2',
          userId: 'u1',
          message: 'Pickup request PK-101 has been confirmed for collection on schedule.',
          createdAt: new Date(now - 0.9 * DAY).toISOString(),
          read: false
        },
        {
          id: 'notif_3',
          userId: 'u1',
          message: 'Report WR-1001 was completed with photo verification uploaded.',
          createdAt: new Date(now - 2 * DAY).toISOString(),
          read: true
        }
      ]
    };
  }

  function getLocalStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        var fresh = seedInitialState();
        localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seedInitialState();
    }
  }

  function saveLocalStore(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }

  var currentUser = {
    id: 'u1',
    _id: 'u1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    role: 'citizen',
    address: '14 Elm Street, Downtown',
    ecoScore: 340,
    divertedKg: 82.5
  };

  var EcoTrackAPI = {
    COLLECTORS: COLLECTORS,
    isLiveBackend: false,

    async checkBackend() {
      try {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 1200);
        var res = await fetch(BACKEND_PING, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          EcoTrackAPI.isLiveBackend = true;
          return true;
        }
      } catch (e) {
        EcoTrackAPI.isLiveBackend = false;
      }
      return false;
    },

    getUser() {
      try {
        var raw = localStorage.getItem(AUTH_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return currentUser;
    },

    setUser(user) {
      currentUser = user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    },

    // --- Reports ---
    async getReports(params) {
      params = params || {};
      if (EcoTrackAPI.isLiveBackend) {
        var query = new URLSearchParams(params).toString();
        var token = localStorage.getItem('ecotrack_jwt');
        var res = await fetch(`${API_BASE}/reports?${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) return await res.json();
      }

      var store = getLocalStore();
      var list = store.reports.slice();

      if (params.userOnly) {
        var uid = params.userId || currentUser.id;
        list = list.filter(function(r) {
          return (r.userId && (r.userId._id === uid || r.userId.id === uid || r.userId === uid));
        });
      }

      if (params.status && params.status !== 'All') {
        list = list.filter(function(r) { return r.status === params.status; });
      }

      if (params.wasteType && params.wasteType !== 'All') {
        list = list.filter(function(r) { return r.wasteType === params.wasteType; });
      }

      if (params.search) {
        var q = params.search.toLowerCase();
        list = list.filter(function(r) {
          return (r.location && r.location.toLowerCase().includes(q)) ||
                 (r.description && r.description.toLowerCase().includes(q)) ||
                 (r.id && r.id.toLowerCase().includes(q));
        });
      }

      return list.sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    },

    async createReport(reportData) {
      if (EcoTrackAPI.isLiveBackend) {
        var token = localStorage.getItem('ecotrack_jwt');
        var formData = new FormData();
        formData.append('wasteType', reportData.wasteType);
        formData.append('description', reportData.description);
        formData.append('location', reportData.location);
        if (reportData.file) formData.append('photo', reportData.file);

        var res = await fetch(`${API_BASE}/reports`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        if (res.ok) return await res.json();
      }

      var store = getLocalStore();
      var nextNum = 1000 + store.reports.length + 1;
      var newReport = {
        _id: 'rep_' + Date.now(),
        id: 'WR-' + nextNum,
        wasteType: reportData.wasteType,
        location: reportData.location,
        description: reportData.description,
        priority: reportData.priority || 'Normal',
        status: 'Pending',
        assignedCollector: null,
        userId: {
          _id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email
        },
        image: reportData.imageUrl || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
        proofImage: null,
        createdAt: new Date().toISOString(),
        completedAt: null
      };

      store.reports.unshift(newReport);
      
      // Auto notification
      store.notifications.unshift({
        id: 'notif_' + Date.now(),
        userId: currentUser.id,
        message: `Report ${newReport.id} for "${newReport.wasteType}" waste submitted successfully.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      saveLocalStore(store);
      return newReport;
    },

    async updateReport(id, updates) {
      var store = getLocalStore();
      var report = store.reports.find(function(r) { return r._id === id || r.id === id; });
      if (!report) throw new Error('Report not found');

      Object.assign(report, updates);
      if (updates.status === 'Completed' && !report.completedAt) {
        report.completedAt = new Date().toISOString();
      }

      saveLocalStore(store);
      return report;
    },

    async deleteReport(id) {
      var store = getLocalStore();
      store.reports = store.reports.filter(function(r) { return r._id !== id && r.id !== id; });
      saveLocalStore(store);
      return { success: true };
    },

    // --- Admin Dispatch & Assign ---
    async assignCollector(reportId, collectorId) {
      if (EcoTrackAPI.isLiveBackend) {
        var token = localStorage.getItem('ecotrack_jwt');
        var res = await fetch(`${API_BASE}/admin/assign`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ reportId: reportId, collectorId: collectorId })
        });
        if (res.ok) return await res.json();
      }

      var store = getLocalStore();
      var report = store.reports.find(function(r) { return r._id === reportId || r.id === reportId; });
      var collector = COLLECTORS.find(function(c) { return c.id === collectorId || c.name === collectorId; });

      if (!report) throw new Error('Report not found');
      if (!collector) throw new Error('Collector not found');

      report.assignedCollector = { _id: collector.id, name: collector.name };
      report.status = 'Assigned';

      store.notifications.unshift({
        id: 'notif_' + Date.now(),
        userId: report.userId ? (report.userId._id || report.userId.id) : currentUser.id,
        message: `Your report ${report.id} was assigned to ${collector.name} (${collector.vehicle}).`,
        createdAt: new Date().toISOString(),
        read: false
      });

      saveLocalStore(store);
      return report;
    },

    // --- Admin Dashboard Stats ---
    async getAdminDashboard() {
      if (EcoTrackAPI.isLiveBackend) {
        var token = localStorage.getItem('ecotrack_jwt');
        var res = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) return await res.json();
      }

      var store = getLocalStore();
      var reports = store.reports;

      var total = reports.length;
      var pending = reports.filter(function(r) { return r.status === 'Pending'; }).length;
      var assigned = reports.filter(function(r) { return r.status === 'Assigned'; }).length;
      var inProgress = reports.filter(function(r) { return r.status === 'In Progress'; }).length;
      var completedList = reports.filter(function(r) { return r.status === 'Completed'; });
      var completed = completedList.length;

      var avgResolutionDays = 1.4;
      if (completedList.length > 0) {
        var totalDiffMs = completedList.reduce(function(sum, r) {
          if (!r.completedAt) return sum + 2 * DAY;
          return sum + (new Date(r.completedAt) - new Date(r.createdAt));
        }, 0);
        avgResolutionDays = +(totalDiffMs / completedList.length / DAY).toFixed(1);
      }

      var typeMap = {};
      reports.forEach(function(r) {
        typeMap[r.wasteType] = (typeMap[r.wasteType] || 0) + 1;
      });
      var byWasteType = Object.keys(typeMap).map(function(k) {
        return { _id: k, count: typeMap[k] };
      });

      var locMap = {};
      reports.forEach(function(r) {
        var locBase = r.location.split(',')[0].trim();
        locMap[locBase] = (locMap[locBase] || 0) + 1;
      });
      var topLocations = Object.keys(locMap)
        .map(function(k) { return { _id: k, count: locMap[k] }; })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 5);

      return {
        total: total,
        pending: pending,
        assigned: assigned,
        inProgress: inProgress,
        completed: completed,
        avgResolutionDays: avgResolutionDays,
        byWasteType: byWasteType,
        topLocations: topLocations,
        activePickups: store.pickups.length
      };
    },

    // --- Pickups ---
    async getPickups() {
      var store = getLocalStore();
      return store.pickups;
    },

    async createPickup(pickupData) {
      var store = getLocalStore();
      var nextId = 'PK-' + (100 + store.pickups.length + 1);
      var item = {
        _id: 'pk_' + Date.now(),
        id: nextId,
        userId: { _id: currentUser.id, name: currentUser.name, email: currentUser.email },
        location: pickupData.location,
        wasteType: pickupData.wasteType,
        description: pickupData.description,
        scheduledDate: pickupData.scheduledDate,
        status: 'Pending',
        assignedCollector: null,
        createdAt: new Date().toISOString()
      };

      store.pickups.unshift(item);
      store.notifications.unshift({
        id: 'notif_' + Date.now(),
        userId: currentUser.id,
        message: `Pickup ${item.id} scheduled for ${item.scheduledDate} submitted.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      saveLocalStore(store);
      return item;
    },

    async assignPickupCollector(pickupId, collectorId) {
      var store = getLocalStore();
      var pickup = store.pickups.find(function(p) { return p._id === pickupId || p.id === pickupId; });
      var collector = COLLECTORS.find(function(c) { return c.id === collectorId || c.name === collectorId; });
      if (!pickup || !collector) throw new Error('Pickup or collector not found');

      pickup.assignedCollector = { _id: collector.id, name: collector.name };
      pickup.status = 'Confirmed';
      saveLocalStore(store);
      return pickup;
    },

    // --- Notifications ---
    async getNotifications() {
      var store = getLocalStore();
      return store.notifications;
    },

    async markNotificationsRead() {
      var store = getLocalStore();
      store.notifications.forEach(function(n) { n.read = true; });
      saveLocalStore(store);
      return store.notifications;
    },

    resetData() {
      var fresh = seedInitialState();
      saveLocalStore(fresh);
      return fresh;
    }
  };

  window.EcoTrackAPI = EcoTrackAPI;

})(window);
