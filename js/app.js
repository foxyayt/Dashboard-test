/**
 * NEXUS OS — Main Application Bootstrap & Client-Side Router
 * Full touch navigation, hash routing, modal system, and kiosk life-cycle
 */

(function (window) {
  'use strict';

  class NexusApp {
    constructor() {
      this.currentView = 'overview';
      this.initRouter();
      this.initDockNavigation();
      this.initExpandButtons();
      this.initModalSystem();
      this.initTouchGestures();
    }

    /* 1. Client-Side Hash Router */
    initRouter() {
      // Listen for hash change
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'overview';
        this.switchView(hash, false);
      });

      // Initial route from URL hash or default
      const initialHash = window.location.hash.replace('#', '') || 'overview';
      this.switchView(initialHash, false);

      // Back buttons on all sub-pages
      document.querySelectorAll('.nav-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target-view') || 'overview';
          this.switchView(target);
        });
      });
    }

    switchView(viewName, updateHash = true) {
      const targetPane = document.getElementById(`view-${viewName}`);
      if (!targetPane) {
        viewName = 'overview';
      }

      this.currentView = viewName;
      document.body.setAttribute('data-active-view', viewName);

      // Update View Panes
      document.querySelectorAll('.view-panel').forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(`view-${viewName}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      // Update Dock Active States
      document.querySelectorAll('.dock-item').forEach(item => {
        const target = item.getAttribute('data-target-view');
        if (target === viewName) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // Scroll viewport back to top
      const mainEl = document.getElementById('nexus-main');
      if (mainEl) mainEl.scrollTop = 0;

      // Update URL hash without reload
      if (updateHash) {
        window.location.hash = `#${viewName}`;
      }

      // Notify widgets that may need resize or redrawing
      if (viewName === 'weather' && window.NexusWeatherWidget && window.NexusWeatherWidget.currentData) {
        const hourly = window.NexusWeatherWidget.currentData.hourly;
        if (hourly) {
          setTimeout(() => {
            NexusCharts.renderWeatherHourlyChart('weather-hourly-canvas', {
              temperatures: hourly.temperature_2m,
              precipitation: hourly.precipitation_probability,
              times: hourly.time
            });
          }, 50);
        }
      }

      if (viewName === 'markets' && window.NexusCryptoWidget) {
        setTimeout(() => {
          window.NexusCryptoWidget.renderDetailChart('bitcoin');
        }, 50);
      }
    }

    /* 2. Persistent Bottom Dock Navigation */
    initDockNavigation() {
      document.querySelectorAll('.dock-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target-view');
          if (target) this.switchView(target);
        });
      });
    }

    /* 3. Card Expand Buttons */
    initExpandButtons() {
      document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = btn.getAttribute('data-target-view');
          if (target) this.switchView(target);
        });
      });
    }

    /* 4. Fullscreen Modal Inspection System */
    initModalSystem() {
      const overlay = document.getElementById('nexus-modal-overlay');
      const closeBtn = document.getElementById('modal-close-btn');

      closeBtn?.addEventListener('click', () => this.closeModal());
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });

      // Keyboard Esc key fallback
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeModal();
      });
    }

    openModal(title, htmlContent) {
      const overlay = document.getElementById('nexus-modal-overlay');
      const titleEl = document.getElementById('modal-title');
      const bodyEl = document.getElementById('modal-body');

      if (!overlay || !titleEl || !bodyEl) return;

      titleEl.textContent = title;
      bodyEl.innerHTML = htmlContent;
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    }

    closeModal() {
      const overlay = document.getElementById('nexus-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }

    /* 5. Touch Gestures & Kiosk Optimizations */
    initTouchGestures() {
      // Prevent browser default pull-to-refresh or unwanted navigation bounce
      document.body.addEventListener('touchmove', (e) => {
        const isScrollable = e.target.closest('.nexus-main, .modal-body, .news-scroll-container, .todo-items-list, .sw-laps-box');
        if (!isScrollable) {
          e.preventDefault();
        }
      }, { passive: false });

      // Brand logo tap returns to Overview
      document.getElementById('brand-logo-btn')?.addEventListener('click', () => {
        this.switchView('overview');
      });
    }
  }

  // Bootstrap when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.NexusApp = new NexusApp();
    NexusUtils.showToast('NEXUS OS Initialized • All Systems Operational');
  });
})(window);
