/**
 * NEXUS OS — Cryptocurrency Command Centre Widget
 * Real-time data from CoinGecko with Kraken public ticker fallback
 */

(function (window) {
  'use strict';

  class NexusCryptoWidget {
    constructor() {
      this.selectedCurrency = NexusStorage.get('units.baseCurrency', 'gbp');
      this.cryptoData = null;
      this.historicalPoints = new Map();

      this.initEvents();
      this.initCurrencySelector();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => this.fetchCrypto());
      NexusDataEngine.on('resume_polling', () => this.fetchCrypto());
      NexusDataEngine.on('demo_mode_changed', () => this.fetchCrypto());

      // Register polling every 60 seconds
      NexusDataEngine.registerPoller('crypto', () => this.fetchCrypto(), 60000);
    }

    initCurrencySelector() {
      const btns = document.querySelectorAll('.crypto-currency-selector .curr-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedCurrency = btn.getAttribute('data-curr') || 'gbp';
          this.render();
        });
      });
    }

    async fetchCrypto() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoCrypto();
        return;
      }

      const ids = NexusStorage.get('cryptoWatchlist', ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin', 'cardano']).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=gbp,usd,eur&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

      try {
        const data = await NexusDataEngine.fetchWithCache(url, {}, 50000);
        this.cryptoData = data;
        this.storePricePoints(data);
        this.render();
      } catch (err) {
        console.warn('[Crypto] Primary CoinGecko fetch failed, attempting Kraken fallback...', err.message);
        await this.fetchKrakenFallback();
      }
    }

    async fetchKrakenFallback() {
      try {
        const res = await NexusDataEngine.fetchWithCache('https://api.kraken.com/0/public/Ticker?pair=XBTGBP,XBTUSD,XBTEUR,ETHGBP,ETHUSD,ETHEUR', {}, 60000);
        const pairs = res.result || {}, data = {};
        [{id:'bitcoin',prefix:'XXBTZ'}, {id:'ethereum',prefix:'XETHZ'}].forEach(asset => {
          data[asset.id] = {};
          ['gbp','usd','eur'].forEach(currency => {
            const ticker = pairs[asset.prefix + currency.toUpperCase()];
            if (!ticker || !ticker.c) return;
            const price = Number(ticker.c[0]), open = Number(ticker.o);
            data[asset.id][currency] = price;
            data[asset.id][currency + '_24h_change'] = open ? (price-open)/open*100 : null;
          });
        });
        this.cryptoData = data; this.storePricePoints(data); this.render();
      } catch (e) {
        const el = document.getElementById('crypto-overview-list');
        if (el) el.textContent = 'Crypto prices unavailable. Please try later.';
      }
    }

    storePricePoints(data) {
      Object.keys(data).forEach(id => {
        ['gbp','usd','eur'].forEach(currency => {
          const key = id + ':' + currency, price = data[id][currency];
          if (!Number.isFinite(price)) return;
          const points = this.historicalPoints.get(key) || [];
          if (points[points.length-1] !== price) points.push(price);
          if (points.length > 20) points.shift();
          this.historicalPoints.set(key, points);
        });
      });
    }

    render() {
      if (!this.cryptoData) return;

      const curr = this.selectedCurrency;
      const overviewContainer = document.getElementById('crypto-overview-list');
      const tableBody = document.getElementById('crypto-full-tbody');

      const assetMeta = {
        bitcoin: { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
        ethereum: { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
        solana: { symbol: 'SOL', name: 'Solana', icon: '◎' },
        ripple: { symbol: 'XRP', name: 'Ripple', icon: '✕' },
        dogecoin: { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
        cardano: { symbol: 'ADA', name: 'Cardano', icon: '₳' }
      };

      const overviewRows = [];
      const tableRows = [];

      Object.keys(this.cryptoData).forEach(id => {
        const item = this.cryptoData[id];
        const meta = assetMeta[id] || { symbol: id.toUpperCase().slice(0, 4), name: id, icon: '•' };
        const price = item[curr];
        if (!Number.isFinite(price)) return;
        const change = item[`${curr}_24h_change`] || 0;
        const isUp = change >= 0;
        const chgClass = isUp ? 'up' : 'down';
        const chgSign = isUp ? '+' : '';
        const history = this.historicalPoints.get(id + ':' + curr) || [];
        const sparklineSvg = NexusCharts.renderSVGSparkline(history, isUp, 70, 24);

        // Overview Row
        overviewRows.push(`
          <div class="crypto-row" data-crypto-id="${id}">
            <div class="c-asset-info">
              <span class="c-icon">${meta.icon}</span>
              <span class="c-sym">${meta.symbol}</span>
            </div>
            <div class="c-sparkline">
              ${sparklineSvg}
            </div>
            <div class="c-price-info">
              <span class="c-price">${NexusUtils.formatCurrency(price, curr)}</span>
              <span class="c-chg ${chgClass}">${chgSign}${change.toFixed(2)}%</span>
            </div>
          </div>
        `);

        // Full Table Row
        const marketCap = item[`${curr}_market_cap`];
        const capStr = marketCap ? NexusUtils.formatCurrency(marketCap / 1e9, curr, 1) + 'B' : '--';

        tableRows.push(`
          <tr>
            <td>
              <strong style="color: var(--text-highlight);">${meta.name}</strong> 
              <span style="color: var(--text-dim); margin-left: 4px;">${meta.symbol}</span>
            </td>
            <td><strong>${NexusUtils.formatCurrency(price, curr)}</strong></td>
            <td class="${chgClass}"><strong>${chgSign}${change.toFixed(2)}%</strong></td>
            <td>${capStr}</td>
            <td>${sparklineSvg}</td>
          </tr>
        `);
      });

      if (overviewContainer) overviewContainer.innerHTML = overviewRows.join('');
      if (tableBody) tableBody.innerHTML = tableRows.join('');

      // Render interactive chart on markets page for Bitcoin
      if (this.cryptoData.bitcoin && document.body.getAttribute('data-active-view') === 'markets') {
        this.renderDetailChart('bitcoin');
      }
    }

    renderDetailChart(assetId = 'bitcoin') {
      const curr = this.selectedCurrency;
      const history = this.historicalPoints.get(assetId + ':' + curr) || [];
      const points = history.map((val, idx) => ({ time: idx, price: val }));
      
      const titleEl = document.getElementById('chart-active-title');
      if (titleEl) {
        titleEl.textContent = `${assetId.toUpperCase()} (${curr.toUpperCase()}) — OBSERVED THIS SESSION`;
      }

      NexusCharts.renderFinancialChart('market-detail-canvas', assetId, points);
    }

    renderDemoCrypto() {
      this.cryptoData = {
        bitcoin: { gbp: 52430.50, usd: 68350.00, eur: 62890.00, gbp_24h_change: 2.14, usd_24h_change: 2.30, gbp_market_cap: 1030000000000 },
        ethereum: { gbp: 2012.80, usd: 2625.50, eur: 2415.00, gbp_24h_change: -0.45, usd_24h_change: -0.32, gbp_market_cap: 242000000000 },
        solana: { gbp: 122.40, usd: 159.60, eur: 146.80, gbp_24h_change: 4.82, usd_24h_change: 5.10, gbp_market_cap: 57000000000 },
        ripple: { gbp: 0.425, usd: 0.554, eur: 0.510, gbp_24h_change: 1.15, usd_24h_change: 1.28, gbp_market_cap: 24000000000 },
        dogecoin: { gbp: 0.098, usd: 0.128, eur: 0.117, gbp_24h_change: 3.40, usd_24h_change: 3.55, gbp_market_cap: 14000000000 },
        cardano: { gbp: 0.275, usd: 0.358, eur: 0.330, gbp_24h_change: -1.25, usd_24h_change: -1.10, gbp_market_cap: 9800000000 }
      };
      this.storePricePoints(this.cryptoData);
      this.render();
    }
  }

  window.NexusCryptoWidget = new NexusCryptoWidget();
})(window);
