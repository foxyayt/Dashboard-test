/**
 * NEXUS OS — Currency & Economics Centre Widget
 * Real-time ECB daily reference rates via the open-source Frankfurter API
 */

(function (window) {
  'use strict';

  class NexusFxWidget {
    constructor() {
      this.rates = null;
      this.base = 'GBP';

      this.initEvents();
      this.initConverter();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => this.fetchRates());
      NexusDataEngine.on('resume_polling', () => this.fetchRates());
      NexusDataEngine.on('demo_mode_changed', () => this.fetchRates());

      // Polling every 6 hours (Frankfurter publishes ECB daily rates once per working day)
      NexusDataEngine.registerPoller('fx', () => this.fetchRates(), 21600000);
    }

    initConverter() {
      const input = document.getElementById('fqc-amount');
      if (input) {
        input.addEventListener('input', () => this.updateConverterResults());
      }
    }

    async fetchRates() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoRates();
        return;
      }

      const url = `https://api.frankfurter.dev/v1/latest?base=${this.base}`;

      try {
        const data = await NexusDataEngine.fetchWithCache(url, {}, 7200000); // 2 hr cache
        this.rates = data.rates;
        this.render();
      } catch (err) {
        console.warn('[FX] Frankfurter API fetch failed:', err.message);
        ['fx-gbp-usd','fx-gbp-eur','fx-eur-usd','fx-gbp-jpy'].forEach(id => {
          const el = document.getElementById(id); if (el) el.textContent = 'Unavailable';
        });
      }
    }

    render() {
      if (!this.rates) return;

      const gbpUsd = this.rates.USD || 1.3042;
      const gbpEur = this.rates.EUR || 1.2005;
      const gbpJpy = this.rates.JPY || 195.40;
      const eurUsd = gbpUsd / gbpEur;

      const elGbpUsd = document.getElementById('fx-gbp-usd');
      const elGbpEur = document.getElementById('fx-gbp-eur');
      const elEurUsd = document.getElementById('fx-eur-usd');
      const elGbpJpy = document.getElementById('fx-gbp-jpy');

      if (elGbpUsd) elGbpUsd.textContent = gbpUsd.toFixed(4);
      if (elGbpEur) elGbpEur.textContent = gbpEur.toFixed(4);
      if (elEurUsd) elEurUsd.textContent = eurUsd.toFixed(4);
      if (elGbpJpy) elGbpJpy.textContent = gbpJpy.toFixed(2);

      this.updateConverterResults();
    }

    updateConverterResults() {
      const input = document.getElementById('fqc-amount');
      const usdOut = document.getElementById('fqc-usd-res');
      const eurOut = document.getElementById('fqc-eur-res');

      if (!input || !usdOut || !eurOut) return;
      const amount = parseFloat(input.value) || 0;

      const usdRate = (this.rates == null ? undefined : this.rates.USD) || 1.3042;
      const eurRate = (this.rates == null ? undefined : this.rates.EUR) || 1.2005;

      usdOut.textContent = `$${(amount * usdRate).toFixed(2)}`;
      eurOut.textContent = `€${(amount * eurRate).toFixed(2)}`;
    }

    renderDemoRates() {
      this.rates = {
        USD: 1.3042,
        EUR: 1.2005,
        JPY: 195.40,
        CAD: 1.7950,
        AUD: 1.9540,
        CHF: 1.1290
      };
      this.render();
    }
  }

  window.NexusFxWidget = new NexusFxWidget();
})(window);
