/**
 * NEXUS OS — Utilities, Formatting & Astronomical Math
 * Compatible with Android 8.1 WebView & modern desktop browsers
 */

(function (window) {
  'use strict';

  const NexusUtils = {
    // Number and Currency Formatting
    formatNumber(num, decimals = 2) {
      if (num === null || num === undefined || isNaN(num)) return '--';
      return Number(num).toLocaleString('en-GB', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    },

    formatCurrency(num, currency = 'gbp', decimals = 2) {
      if (num === null || num === undefined || isNaN(num)) return '--';
      const symbols = { gbp: '£', usd: '$', eur: '€', jpy: '¥' };
      const sym = symbols[currency.toLowerCase()] || '';
      
      // For large crypto numbers or small values
      let dec = decimals;
      if (Math.abs(num) < 1 && Math.abs(num) > 0.0001) dec = 4;
      if (Math.abs(num) < 0.0001 && Math.abs(num) > 0) dec = 6;
      if (currency.toLowerCase() === 'jpy') dec = 0;

      return sym + Number(num).toLocaleString('en-GB', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
      });
    },

    formatPercent(num) {
      if (num === null || num === undefined || isNaN(num)) return '0.00%';
      const val = Number(num);
      const sign = val > 0 ? '+' : '';
      return `${sign}${val.toFixed(2)}%`;
    },

    // Relative Time (e.g., "Just now", "3m ago")
    timeAgo(dateInput) {
      const date = new Date(dateInput);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);

      if (seconds < 30) return 'Just now';
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    },

    // WMO Weather Code Translator
    translateWeatherCode(code, isDay = 1) {
      const weatherCodes = {
        0: { name: 'Clear Sky', icon: isDay ? '☀️' : '🌙' },
        1: { name: 'Mainly Clear', icon: isDay ? '🌤️' : '🌙' },
        2: { name: 'Partly Cloudy', icon: isDay ? '⛅' : '☁️' },
        3: { name: 'Overcast', icon: '☁️' },
        45: { name: 'Foggy', icon: '🌫️' },
        48: { name: 'Depositing Rime Fog', icon: '🌫️' },
        51: { name: 'Light Drizzle', icon: '🌦️' },
        53: { name: 'Moderate Drizzle', icon: '🌦️' },
        55: { name: 'Dense Drizzle', icon: '🌧️' },
        56: { name: 'Light Freezing Drizzle', icon: '🌨️' },
        57: { name: 'Dense Freezing Drizzle', icon: '🌨️' },
        61: { name: 'Slight Rain', icon: '🌧️' },
        63: { name: 'Moderate Rain', icon: '🌧️' },
        65: { name: 'Heavy Rain', icon: '⛈️' },
        66: { name: 'Light Freezing Rain', icon: '🌨️' },
        67: { name: 'Heavy Freezing Rain', icon: '🌨️' },
        71: { name: 'Slight Snow Fall', icon: '🌨️' },
        73: { name: 'Moderate Snow Fall', icon: '❄️' },
        75: { name: 'Heavy Snow Fall', icon: '❄️' },
        77: { name: 'Snow Grains', icon: '❄️' },
        80: { name: 'Slight Rain Showers', icon: '🌦️' },
        81: { name: 'Moderate Rain Showers', icon: '🌧️' },
        82: { name: 'Violent Rain Showers', icon: '⛈️' },
        85: { name: 'Slight Snow Showers', icon: '🌨️' },
        86: { name: 'Heavy Snow Showers', icon: '❄️' },
        95: { name: 'Thunderstorm', icon: '⚡' },
        96: { name: 'Thunderstorm with Slight Hail', icon: '⛈️' },
        99: { name: 'Thunderstorm with Heavy Hail', icon: '⛈️' }
      };

      return weatherCodes[code] || { name: 'Overcast', icon: '☁️' };
    },

    // Astronomical Moon Phase Ephemeris Calculator
    calculateMoonPhase(date = new Date()) {
      // Julian Date Calculation
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      
      let y = year;
      let m = month;
      if (m <= 2) {
        y -= 1;
        m += 12;
      }
      
      const A = Math.floor(y / 100);
      const B = 2 - A + Math.floor(A / 4);
      const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
      
      // Known reference new moon: JD 2451549.5 (Jan 6, 2000)
      const daysSinceNew = JD - 2451549.5;
      const synodicMonth = 29.53058867;
      const newMoons = daysSinceNew / synodicMonth;
      const phaseCycle = newMoons - Math.floor(newMoons); // 0 to 1
      const age = phaseCycle * synodicMonth; // 0 to 29.53 days
      
      // Illumination percentage
      const illumination = Math.round((1 - Math.cos(2 * Math.PI * phaseCycle)) / 2 * 100);

      // Phase identification
      let phaseName = 'New Moon';
      let icon = '🌑';

      if (phaseCycle < 0.03 || phaseCycle > 0.97) {
        phaseName = 'New Moon';
        icon = '🌑';
      } else if (phaseCycle < 0.22) {
        phaseName = 'Waxing Crescent';
        icon = '🌒';
      } else if (phaseCycle < 0.28) {
        phaseName = 'First Quarter';
        icon = '🌓';
      } else if (phaseCycle < 0.47) {
        phaseName = 'Waxing Gibbous';
        icon = '🌔';
      } else if (phaseCycle < 0.53) {
        phaseName = 'Full Moon';
        icon = '🌕';
      } else if (phaseCycle < 0.72) {
        phaseName = 'Waning Gibbous';
        icon = '🌖';
      } else if (phaseCycle < 0.78) {
        phaseName = 'Last Quarter';
        icon = '🌗';
      } else {
        phaseName = 'Waning Crescent';
        icon = '🌘';
      }

      // Days to next milestones
      const daysToFull = phaseCycle <= 0.5 
        ? Math.round((0.5 - phaseCycle) * synodicMonth)
        : Math.round((1.5 - phaseCycle) * synodicMonth);

      const daysToNew = Math.round((1.0 - phaseCycle) * synodicMonth);

      return {
        phaseCycle,
        age: age.toFixed(1),
        illumination,
        phaseName,
        icon,
        daysToFull,
        daysToNew
      };
    },

    // Air Quality Index (AQI) descriptor
    describeAQI(aqi) {
      if (aqi <= 20) return { label: 'Good', color: '#10b981' };
      if (aqi <= 40) return { label: 'Fair', color: '#38bdf8' };
      if (aqi <= 60) return { label: 'Moderate', color: '#f59e0b' };
      if (aqi <= 80) return { label: 'Poor', color: '#f97316' };
      return { label: 'Very Poor', color: '#f43f5e' };
    },

    // Toast HUD Alert
    showToast(message, duration = 3000) {
      const hud = document.getElementById('nexus-toast-hud');
      const inner = document.getElementById('toast-message');
      if (!hud || !inner) return;

      inner.textContent = message;
      hud.classList.add('show');

      if (window._toastTimeout) clearTimeout(window._toastTimeout);
      window._toastTimeout = setTimeout(() => {
        hud.classList.remove('show');
      }, duration);
    },

    // Toggle Kiosk Fullscreen (Supports standard Fullscreen API and Fully Kiosk Browser API)
    toggleFullscreen() {
      // Check Fully Kiosk Browser JavaScript Interface
      if (window.fully && typeof window.fully.isInScreensaver === 'function') {
        try {
          const isFs = window.fully.isFullScreen();
          window.fully.setFullScreen(!isFs);
          this.showToast(!isFs ? 'Fully Kiosk Fullscreen Enabled' : 'Exited Fullscreen');
          return;
        } catch (e) {
          console.warn('[NexusUtils] Fully Kiosk API error:', e);
        }
      }

      // Standard HTML5 Fullscreen API
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(err => console.warn(err));
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
        document.getElementById('fs-enter-icon')?.classList.add('hidden');
        document.getElementById('fs-exit-icon')?.classList.remove('hidden');
        this.showToast('Fullscreen Mode Active');
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.warn(err));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        document.getElementById('fs-enter-icon')?.classList.remove('hidden');
        document.getElementById('fs-exit-icon')?.classList.add('hidden');
        this.showToast('Exited Fullscreen');
      }
    },

    // Escape HTML to prevent injection
    escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  window.NexusUtils = NexusUtils;
})(window);
