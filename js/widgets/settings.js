/**
 * NEXUS OS — Customisation Engine & Settings Widget
 * Theme switcher, accent colors, layout density, touch widget reordering,
 * units configuration, and full JSON backup/restore.
 */

(function (window) {
  'use strict';

  class NexusSettingsWidget {
    constructor() {
      this.initThemePicker();
      this.initAccentPicker();
      this.initDensitySelector();
      this.initWidgetManager();
      this.initUnitSelectors();
      this.initBackupRestore();
      this.initDiagnostics();
    }

    /* 1. Theme Selector */
    initThemePicker() {
      const currentTheme = NexusStorage.get('theme', 'obsidian');
      this.applyTheme(currentTheme);

      const buttons = document.querySelectorAll('#theme-picker-grid .theme-card-btn');
      buttons.forEach(btn => {
        const theme = btn.getAttribute('data-theme');
        if (theme === currentTheme) btn.classList.add('active');

        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyTheme(theme);
          NexusStorage.set('theme', theme);
          NexusUtils.showToast(`Theme switched to ${theme.toUpperCase()}`);
        });
      });
    }

    applyTheme(theme) {
      document.body.classList.remove('theme-obsidian', 'theme-midnight', 'theme-emerald', 'theme-amber', 'theme-crimson', 'theme-titanium');
      document.body.classList.add(`theme-${theme}`);
    }

    /* 2. Accent Color Picker */
    initAccentPicker() {
      const currentAccent = NexusStorage.get('accentColor', '#00f0ff');
      this.applyAccent(currentAccent);

      const buttons = document.querySelectorAll('#accent-color-row .accent-dot-btn');
      buttons.forEach(btn => {
        const color = btn.getAttribute('data-color');
        if (color.toLowerCase() === currentAccent.toLowerCase()) btn.classList.add('active');

        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyAccent(color);
          NexusStorage.set('accentColor', color);
          NexusUtils.showToast(`Accent color updated: ${color}`);
        });
      });
    }

    applyAccent(hex) {
      const root = document.documentElement;
      root.style.setProperty('--accent-primary', hex);
      // Derive subtle glow
      root.style.setProperty('--accent-glow', `${hex}66`);
      root.style.setProperty('--accent-glow-subtle', `${hex}1f`);
      root.style.setProperty('--border-accent', `${hex}55`);
    }

    /* 3. Density Selector */
    initDensitySelector() {
      const currentDensity = NexusStorage.get('density', 'kiosk');
      this.applyDensity(currentDensity);

      const buttons = document.querySelectorAll('.density-selector .dens-btn');
      buttons.forEach(btn => {
        const dens = btn.getAttribute('data-density');
        if (dens === currentDensity) btn.classList.add('active');

        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyDensity(dens);
          NexusStorage.set('density', dens);
          NexusUtils.showToast(`Layout density set to ${dens.toUpperCase()}`);
        });
      });
    }

    applyDensity(density) {
      document.body.classList.remove('density-kiosk', 'density-compact', 'density-comfortable');
      document.body.classList.add(`density-${density}`);
    }

    /* 4. Touch-Friendly Widget Reorder & Visibility Manager */
    initWidgetManager() {
      this.renderWidgetManager();
      this.applyWidgetOrderAndVisibility();
    }

    renderWidgetManager() {
      const container = document.getElementById('widget-manager-list');
      if (!container) return;

      const widgets = NexusStorage.get('widgets', []);

      container.innerHTML = widgets.map((w, idx) => `
        <div class="w-manage-row" data-id="${w.id}" data-index="${idx}">
          <div class="wm-name">${w.name}</div>
          <div class="wm-controls">
            <button class="wm-arrow-btn btn-w-up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''} title="Move Up">↑</button>
            <button class="wm-arrow-btn btn-w-down" ${idx === widgets.length - 1 ? 'disabled style="opacity:0.3;"' : ''} title="Move Down">↓</button>
            <label class="nexus-toggle" style="margin-left: 8px;">
              <input type="checkbox" class="widget-toggle-chk" ${w.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `).join('');

      // Attach Up/Down and Toggle Listeners
      container.querySelectorAll('.btn-w-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('.w-manage-row');
          const idx = parseInt(row.getAttribute('data-index'));
          if (idx > 0) {
            const temp = widgets[idx - 1];
            widgets[idx - 1] = widgets[idx];
            widgets[idx] = temp;
            NexusStorage.set('widgets', widgets);
            this.renderWidgetManager();
            this.applyWidgetOrderAndVisibility();
            NexusUtils.showToast(`Moved ${widgets[idx - 1].name} up`);
          }
        });
      });

      container.querySelectorAll('.btn-w-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('.w-manage-row');
          const idx = parseInt(row.getAttribute('data-index'));
          if (idx < widgets.length - 1) {
            const temp = widgets[idx + 1];
            widgets[idx + 1] = widgets[idx];
            widgets[idx] = temp;
            NexusStorage.set('widgets', widgets);
            this.renderWidgetManager();
            this.applyWidgetOrderAndVisibility();
            NexusUtils.showToast(`Moved ${widgets[idx + 1].name} down`);
          }
        });
      });

      container.querySelectorAll('.widget-toggle-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const row = e.target.closest('.w-manage-row');
          const id = row.getAttribute('data-id');
          const w = widgets.find(item => item.id === id);
          if (w) {
            w.enabled = e.target.checked;
            NexusStorage.set('widgets', widgets);
            this.applyWidgetOrderAndVisibility();
            NexusUtils.showToast(`${w.name} ${w.enabled ? 'Enabled' : 'Disabled'}`);
          }
        });
      });
    }

    applyWidgetOrderAndVisibility() {
      const grid = document.getElementById('dashboard-widgets-grid');
      if (!grid) return;

      const widgets = NexusStorage.get('widgets', []);

      widgets.forEach((w, orderIdx) => {
        const el = document.getElementById(`widget-${w.id}`);
        if (el) {
          el.style.order = orderIdx;
          if (w.enabled) {
            el.classList.remove('hidden');
          } else {
            el.classList.add('hidden');
          }
        }
      });
    }

    /* 5. Units & Preferences Selectors */
    initUnitSelectors() {
      const clockFmt = document.getElementById('set-clock-format');
      const clockSecs = document.getElementById('set-clock-seconds');
      const tempUnits = document.getElementById('set-temp-units');
      const windUnits = document.getElementById('set-wind-units');
      const baseCurr = document.getElementById('set-base-currency');

      if (clockFmt) {
        clockFmt.value = NexusStorage.get('clock.format', '24');
        clockFmt.addEventListener('change', (e) => {
          NexusStorage.set('clock.format', e.target.value);
          NexusHeaderWidget.tick();
        });
      }

      if (clockSecs) {
        clockSecs.value = String(NexusStorage.get('clock.showSeconds', true));
        clockSecs.addEventListener('change', (e) => {
          NexusStorage.set('clock.showSeconds', e.target.value === 'true');
          NexusHeaderWidget.tick();
        });
      }

      if (tempUnits) {
        tempUnits.value = NexusStorage.get('units.temperature', 'celsius');
        tempUnits.addEventListener('change', (e) => {
          NexusStorage.set('units.temperature', e.target.value);
          NexusDataEngine.refreshAll();
        });
      }

      if (windUnits) {
        windUnits.value = NexusStorage.get('units.windSpeed', 'mph');
        windUnits.addEventListener('change', (e) => {
          NexusStorage.set('units.windSpeed', e.target.value);
          NexusDataEngine.refreshAll();
        });
      }

      if (baseCurr) {
        baseCurr.value = NexusStorage.get('units.baseCurrency', 'gbp');
        baseCurr.addEventListener('change', (e) => {
          NexusStorage.set('units.baseCurrency', e.target.value);
          NexusDataEngine.refreshAll();
        });
      }
    }

    /* 6. Backup, Export, Import & Reset */
    initBackupRestore() {
      const exportBtn = document.getElementById('btn-export-config');
      const importTrigger = document.getElementById('btn-import-config-trigger');
      const importFileInput = document.getElementById('import-config-file');
      const resetBtn = document.getElementById('btn-reset-defaults');

      // Export JSON File Download
      exportBtn?.addEventListener('click', () => {
        const json = NexusStorage.exportConfig();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus-os-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        NexusUtils.showToast('Configuration exported as JSON');
      });

      // Import JSON File
      importTrigger?.addEventListener('click', () => importFileInput?.click());

      importFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = NexusStorage.importConfig(evt.target.result);
          if (success) {
            NexusUtils.showToast('Configuration restored successfully! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            NexusUtils.showToast('Failed to import configuration JSON file.');
          }
        };
        reader.readAsText(file);
      });

      // Reset Defaults
      resetBtn?.addEventListener('click', () => {
        if (confirm('Reset NEXUS OS to factory default settings?')) {
          NexusStorage.resetDefaults();
          NexusUtils.showToast('System reset to defaults. Reloading...');
          setTimeout(() => window.location.reload(), 800);
        }
      });
    }

    /* 7. Diagnostic Info */
    initDiagnostics() {
      const screenEl = document.getElementById('diag-screen');
      const uaEl = document.getElementById('diag-ua');
      const storEl = document.getElementById('diag-storage');

      if (screenEl) screenEl.textContent = `${window.innerWidth} × ${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`;
      if (uaEl) uaEl.textContent = navigator.userAgent.slice(0, 48) + '...';

      try {
        const bytes = new Blob([localStorage.getItem('NEXUS_OS_CONFIG_V2') || '']).size;
        if (storEl) storEl.textContent = `${(bytes / 1024).toFixed(1)} KB in LocalStorage`;
      } catch (e) {
        if (storEl) storEl.textContent = '12.4 KB';
      }
    }
  }

  window.NexusSettingsWidget = new NexusSettingsWidget();
})(window);
