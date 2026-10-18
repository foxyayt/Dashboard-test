/**
 * NEXUS OS — Top System Bar & Clock Widget
 * High-precision timekeeping, date synchronization, and global controls
 */

(function (window) {
  'use strict';

  class NexusHeaderWidget {
    constructor() {
      this.hrsEl = document.getElementById('clock-hrs');
      this.minsEl = document.getElementById('clock-mins');
      this.secsEl = document.getElementById('clock-secs');
      this.ampmEl = document.getElementById('clock-ampm');
      this.dayEl = document.getElementById('clock-day');
      this.dateEl = document.getElementById('clock-date');
      this.tzEl = document.getElementById('clock-tz');

      this.initClock();
      this.initActionButtons();
    }

    initClock() {
      const run = () => {
        clearTimeout(this.clockTimer);
        if (document.hidden) return;
        this.tick();
        const step = NexusStorage.get('clock.showSeconds', false) && document.body.getAttribute('data-active-view') !== 'overview' ? 1000 : 60000;
        this.clockTimer = setTimeout(run, step - Date.now() % step + 20);
      };
      this.restartClock = run;
      document.addEventListener('visibilitychange', run);
      NexusDataEngine.on('location_changed', run);
      run();
    }

    tick() {
      const now = NexusTime.current();
      const is12Hour = NexusStorage.get('clock.format', '24') === '12';
      const showSeconds = NexusStorage.get('clock.showSeconds', false);
      const hours = now ? Number(now.hour) : 0;
      const set = (el, value) => { if (el && el.textContent !== value) el.textContent = value; };
      set(this.hrsEl, now ? String(is12Hour ? hours % 12 || 12 : hours).padStart(2,'0') : '—');
      set(this.minsEl, now ? now.minute : '—');
      set(this.secsEl, now && showSeconds ? ':' + now.second : '');
      set(this.ampmEl, now && is12Hour ? (hours >= 12 ? 'PM' : 'AM') : '');
      set(this.dayEl, now ? now.weekday : '');
      set(this.dateEl, now ? now.day + '/' + now.month + '/' + now.year : 'Resolving timezone');
      set(this.tzEl, NexusStorage.get('location.name', 'Glasgow'));
      if (window.NexusHome) NexusHome.tick();
      NexusDataEngine.updateSyncUI();
    }

    initActionButtons() {
      // Manual Refresh Button
      document.getElementById('btn-manual-refresh') && document.getElementById('btn-manual-refresh').addEventListener('click', () => {
        NexusDataEngine.refreshAll();
      });

      // Demo Mode Toggle
      document.getElementById('btn-demo-mode') && document.getElementById('btn-demo-mode').addEventListener('click', () => {
        const current = NexusDataEngine.isDemoMode;
        NexusDataEngine.setDemoMode(!current);
      });

      // Fullscreen Toggle
      document.getElementById('btn-fullscreen') && document.getElementById('btn-fullscreen').addEventListener('click', () => {
        NexusUtils.toggleFullscreen();
      });

      // Quick Settings Button
      document.getElementById('btn-quick-settings') && document.getElementById('btn-quick-settings').addEventListener('click', () => {
        if (window.NexusApp) {
          window.NexusApp.switchView('settings');
        }
      });

      // Clock Tap -> Switch to World Time
      document.getElementById('header-clock-trigger') && document.getElementById('header-clock-trigger').addEventListener('click', () => {
        if (window.NexusApp) {
          window.NexusApp.switchView('world');
        }
      });

      // Header Weather Pill Tap -> Switch to Weather Centre
      document.getElementById('header-weather-pill') && document.getElementById('header-weather-pill').addEventListener('click', () => {
        if (window.NexusApp) {
          window.NexusApp.switchView('weather');
        }
      });
    }

    updateHeaderWeather(tempStr, icon, condition) {
      const hwIcon = document.getElementById('hw-icon');
      const hwTemp = document.getElementById('hw-temp');
      const hwCond = document.getElementById('hw-cond');
      const locName = NexusStorage.get('location.name', 'Glasgow');

      if (hwIcon) hwIcon.textContent = icon;
      if (hwTemp) hwTemp.textContent = tempStr;
      if (hwCond) hwCond.textContent = `${condition} • ${locName}`;
    }
  }

  window.NexusHeaderWidget = new NexusHeaderWidget();
})(window);
