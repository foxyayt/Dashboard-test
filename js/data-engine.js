/**
 * NEXUS OS — Central Live Data Engine & Cache Manager
 * Robust asynchronous fetching, request deduplication, rate-limit protection,
 * offline resilience, and pub/sub event bus.
 */

(function (window) {
  'use strict';

  class NexusDataEngine {
    constructor() {
      this.cache = new Map();
      this.inFlightRequests = new Map();
      this.subscribers = new Map();
      this.intervals = new Map();
      this.isOnline = navigator.onLine !== undefined ? navigator.onLine : true;
      this.lastSyncTime = null;
      this.isDemoMode = false;

      this.initNetworkListeners();
      this.initVisibilityListeners();
    }

    // Network Status & Auto-Recovery
    initNetworkListeners() {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.updateNetworkBadge();
        NexusUtils.showToast('Network Restored — Resuming Live Feeds');
        this.refreshAll();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.updateNetworkBadge();
        NexusUtils.showToast('Network Offline — Using Cached Data');
      });
    }

    // Suspend updates when hidden to preserve CPU/RAM on RK3326
    initVisibilityListeners() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseIntervals();
        } else {
          this.resumeIntervals();
          this.refreshAll();
        }
      });
    }

    updateNetworkBadge() {
      const badge = document.getElementById('net-status-badge');
      const text = document.getElementById('net-status-text');
      if (!badge || !text) return;

      if (this.isOnline) {
        badge.classList.remove('offline');
        text.textContent = 'ONLINE';
      } else {
        badge.classList.add('offline');
        text.textContent = 'OFFLINE';
      }
    }

    // Pub / Sub Event Bus
    on(event, callback) {
      if (!this.subscribers.has(event)) {
        this.subscribers.set(event, []);
      }
      this.subscribers.get(event).push(callback);
    }

    emit(event, data) {
      if (this.subscribers.has(event)) {
        this.subscribers.get(event).forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[DataEngine] Error in listener for ${event}:`, err);
          }
        });
      }
    }

    /**
     * Central Fetch with Deduplication, Timeout and Cache
     */
    async fetchWithCache(url, options = {}, ttlMs = 60000) {
      const cacheKey = url;

      // Check In-Flight Request Deduplication
      if (this.inFlightRequests.has(cacheKey)) {
        return this.inFlightRequests.get(cacheKey);
      }

      // Check Cache
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp < ttlMs)) {
        return cached.data;
      }

      // If offline, return stale cached data if available
      if (!this.isOnline) {
        if (cached) {
          console.warn(`[DataEngine] Offline: Returning stale cached data for ${url}`);
          return cached.data;
        }
        throw new Error('Device is offline and no cached data is available.');
      }

      // Create Request with Timeout
      const fetchPromise = (async () => {
        const timeoutMs = options.timeout || 9000;
        let controller = null;
        let timeoutId = null;

        if (window.AbortController) {
          controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }

        try {
          const fetchOptions = Object.assign({}, options, {
            signal: controller ? controller.signal : undefined
          });

          const res = await fetch(url, fetchOptions);
          if (timeoutId) clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          this.cache.set(cacheKey, { timestamp: Date.now(), data });
          this.lastSyncTime = new Date();
          this.updateSyncUI();
          return data;
        } catch (err) {
          if (timeoutId) clearTimeout(timeoutId);
          console.warn(`[DataEngine] Request failed for ${url}:`, err.message);
          
          // Return stale cache if available as fallback
          if (cached) {
            console.info(`[DataEngine] Returning stale cache for ${url}`);
            return cached.data;
          }
          throw err;
        } finally {
          this.inFlightRequests.delete(cacheKey);
        }
      })();

      this.inFlightRequests.set(cacheKey, fetchPromise);
      return fetchPromise;
    }

    updateSyncUI() {
      const el = document.getElementById('last-sync-time');
      if (el && this.lastSyncTime) {
        el.textContent = NexusUtils.timeAgo(this.lastSyncTime);
      }
    }

    // Schedule Polling Timers
    registerPoller(name, fetchFn, intervalMs) {
      // Clear existing
      if (this.intervals.has(name)) {
        clearInterval(this.intervals.get(name));
      }

      // Run immediately
      fetchFn();

      // Schedule
      const id = setInterval(() => {
        if (!document.hidden) {
          fetchFn();
        }
      }, intervalMs);

      this.intervals.set(name, id);
    }

    pauseIntervals() {
      this.intervals.forEach((id) => clearInterval(id));
    }

    resumeIntervals() {
      // Re-trigger registered pollers
      this.emit('resume_polling');
    }

    refreshAll() {
      NexusUtils.showToast('Synchronizing all live feeds...');
      const refreshBtn = document.getElementById('btn-manual-refresh');
      if (refreshBtn) {
        refreshBtn.style.animation = 'spin 0.8s linear';
        setTimeout(() => refreshBtn.style.animation = '', 800);
      }
      this.emit('manual_refresh');
    }

    setDemoMode(enabled) {
      this.isDemoMode = enabled;
      NexusStorage.set('demoMode', enabled);
      const demoBtn = document.getElementById('btn-demo-mode');
      if (demoBtn) {
        if (enabled) {
          demoBtn.classList.add('demo-active');
          NexusUtils.showToast('Demo Mode Activated (Simulated Snapshot)');
        } else {
          demoBtn.classList.remove('demo-active');
          NexusUtils.showToast('Live Mode Restored (Genuine APIs)');
        }
      }
      this.emit('demo_mode_changed', enabled);
      this.refreshAll();
    }
  }

  window.NexusDataEngine = new NexusDataEngine();
})(window);
