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
      this.tick();
      setInterval(() => this.tick(), 1000);
    }

    tick() {
      const now = new Date();
      const is12Hour = NexusStorage.get('clock.format', '24') === '12';
      const showSeconds = NexusStorage.get('clock.showSeconds', true);

      let hours = now.getHours();
      let ampm = '';

      if (is12Hour) {
        ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
      }

      const hrsStr = String(hours).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');
      const secsStr = ':' + String(now.getSeconds()).padStart(2, '0');

      if (this.hrsEl) this.hrsEl.textContent = hrsStr;
      if (this.minsEl) this.minsEl.textContent = minsStr;
      
      if (this.secsEl) {
        this.secsEl.textContent = showSeconds ? secsStr : '';
      }
      
      if (this.ampmEl) {
        this.ampmEl.textContent = is12Hour ? ampm : '';
      }

      // Date & Day
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

      if (this.dayEl) this.dayEl.textContent = days[now.getDay()];
      if (this.dateEl) {
        this.dateEl.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      }

      // Timezone / Location label
      const loc = NexusStorage.get('location.name', 'Glasgow');
      if (this.tzEl) {
        this.tzEl.textContent = `${loc.toUpperCase()} (LOCAL)`;
      }

      // Update sync indicator relative time
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
