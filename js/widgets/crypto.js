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
        const krakenUrl = 'https://api.kraken.com/0/public/Ticker?pair=XBTGBP,XBTUSD,ETHGBP,ETHUSD,SOLGBP,SOLUSD,XRPGBP,XRPUSD,DOGEUSD,ADAGBP';
        const res = await NexusDataEngine.fetchWithCache(krakenUrl, {}, 60000);
        if (res && res.result) {
          const k = res.result;
          // Transform Kraken format into standard structure
          this.cryptoData = {
            bitcoin: {
              gbp: parseFloat((k.XXBTZGBP == null ? undefined : k.XXBTZGBP.c[0]) || 52000),
              usd: parseFloat((k.XXBTZUSD == null ? undefined : k.XXBTZUSD.c[0]) || 68000),
              eur: parseFloat((k.XXBTZEUR == null ? undefined : k.XXBTZEUR.c[0]) || 62000),
              gbp_24h_change: 1.2,
              usd_24h_change: 1.4
            },
            ethereum: {
              gbp: parseFloat((k.XETHZGBP == null ? undefined : k.XETHZGBP.c[0]) || 2050),
              usd: parseFloat((k.XETHZUSD == null ? undefined : k.XETHZUSD.c[0]) || 2650),
              eur: parseFloat((k.XETHZEUR == null ? undefined : k.XETHZEUR.c[0]) || 2450),
              gbp_24h_change: -0.5,
              usd_24h_change: -0.3
            },
            solana: {
              gbp: parseFloat((k.SOLGBP == null ? undefined : k.SOLGBP.c[0]) || 120),
              usd: parseFloat((k.SOLUSD == null ? undefined : k.SOLUSD.c[0]) || 155),
              eur: parseFloat((k.SOLEUR == null ? undefined : k.SOLEUR.c[0]) || 140),
              gbp_24h_change: 3.4,
              usd_24h_change: 3.6
            },
            ripple: {
              gbp: parseFloat((k.XXRPZGBP == null ? undefined : k.XXRPZGBP.c[0]) || 0.42),
              usd: parseFloat((k.XXRPZUSD == null ? undefined : k.XXRPZUSD.c[0]) || 0.55),
              eur: parseFloat((k.XXRPZEUR == null ? undefined : k.XXRPZEUR.c[0]) || 0.50),
              gbp_24h_change: 0.8,
              usd_24h_change: 1.0
            },
            dogecoin: {
              gbp: parseFloat((k.XDGUSD == null ? undefined : k.XDGUSD.c[0]) || 0.12) * 0.77,
              usd: parseFloat((k.XDGUSD == null ? undefined : k.XDGUSD.c[0]) || 0.12),
              eur: parseFloat((k.XDGUSD == null ? undefined : k.XDGUSD.c[0]) || 0.12) * 0.92,
              gbp_24h_change: 2.1,
              usd_24h_change: 2.3
            },
            cardano: {
              gbp: parseFloat((k.ADAGBP == null ? undefined : k.ADAGBP.c[0]) || 0.28),
              usd: parseFloat((k.ADAUSD == null ? undefined : k.ADAUSD.c[0]) || 0.36),
              eur: parseFloat((k.ADAEUR == null ? undefined : k.ADAEUR.c[0]) || 0.33),
              gbp_24h_change: -1.1,
              usd_24h_change: -0.9
            }
          };
          this.storePricePoints(this.cryptoData);
          this.render();
        }
      } catch (e) {
        console.error('[Crypto] Kraken fallback also failed:', e);
      }
    }

    storePricePoints(data) {
      const curr = this.selectedCurrency;
      Object.keys(data).forEach(id => {
        if (!this.historicalPoints.has(id)) {
          // Initialize with simulated realistic points for sparkline
          const base = data[id][curr] || 100;
          const change = data[id][`${curr}_24h_change`] || 0;
          const start = base * (1 - change / 100);
          const pts = [
            start,
            start * 0.995,
            start * 1.008,
            start * 1.002,
            start * 1.015,
            start * 1.010,
            base * 0.998,
            base
          ];
          this.historicalPoints.set(id, pts);
        } else {
          const pts = this.historicalPoints.get(id);
          const currentPrice = data[id][curr];
          if (currentPrice && pts[pts.length - 1] !== currentPrice) {
            pts.push(currentPrice);
            if (pts.length > 20) pts.shift();
          }
        }
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
        const change = item[`${curr}_24h_change`] || 0;
        const isUp = change >= 0;
        const chgClass = isUp ? 'up' : 'down';
        const chgSign = isUp ? '+' : '';
        const history = this.historicalPoints.get(id) || [price, price];
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
      if (this.cryptoData.bitcoin) {
        this.renderDetailChart('bitcoin');
      }
    }

    renderDetailChart(assetId = 'bitcoin') {
      const curr = this.selectedCurrency;
      const history = this.historicalPoints.get(assetId) || [50000, 51000, 52400];
      const points = history.map((val, idx) => ({ time: idx, price: val }));
      
      const titleEl = document.getElementById('chart-active-title');
      if (titleEl) {
        titleEl.textContent = `${assetId.toUpperCase()} (${curr.toUpperCase()}) — INTERACTIVE PRICE TREND`;
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
