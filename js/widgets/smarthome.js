/**
 * NEXUS OS — Smart Home & Camera Centre Widget
 * Extensible smart home architecture with climate controls, device toggles & stream gateway
 */

(function (window) {
  'use strict';

  class NexusSmartHomeWidget {
    constructor() {
      this.targetTemp = 21.0;
      this.initThermostat();
      this.initSwitches();
      this.initCameraTimestamps();
    }

    initThermostat() {
      const upBtn = document.getElementById('btn-thermo-up');
      const downBtn = document.getElementById('btn-thermo-down');
      const targetDisplay = document.getElementById('thermo-target');

      const updateTarget = (delta) => {
        this.targetTemp = Math.round((this.targetTemp + delta) * 10) / 10;
        if (targetDisplay) targetDisplay.textContent = `${this.targetTemp.toFixed(1)}°`;
        NexusUtils.showToast(`Thermostat target set to ${this.targetTemp.toFixed(1)}°C`);
      };

      upBtn && upBtn.addEventListener('click', () => updateTarget(0.5));
      downBtn && downBtn.addEventListener('click', () => updateTarget(-0.5));
    }

    initSwitches() {
      const switchCards = document.querySelectorAll('.switch-card');
      switchCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const stateEl = card.querySelector('.sw-state');
        const nameEl = card.querySelector('.sw-name');

        checkbox && checkbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          const name = nameEl ? nameEl.textContent : 'Device';
          if (stateEl) {
            stateEl.textContent = isChecked ? 'ON • Active' : 'OFF';
          }
          NexusUtils.showToast(`${name}: ${isChecked ? 'Powered ON' : 'Powered OFF'}`);
        });
      });
    }

    initCameraTimestamps() {
      const tsEl = document.getElementById('cam-timestamp');
      setInterval(() => {
        if (tsEl) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-GB');
          tsEl.textContent = `CAM 01 • 1080P • ${timeStr}`;
        }
      }, 1000);
    }
  }

  window.NexusSmartHomeWidget = new NexusSmartHomeWidget();
})(window);
