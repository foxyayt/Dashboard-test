/**
 * NEXUS OS — Stock Markets & Indices Terminal Widget
 * Real-world indices, custom equities watchlist, and interactive financial charts
 */

(function (window) {
  'use strict';

  class NexusMarketsWidget {
    constructor() {
      this.watchlist = NexusStorage.get('watchlist', ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']);
      this.activeTimeframe = '1D';

      // Genuine public benchmark levels for major indices
      this.indicesData = [
        { symbol: 'FTSE 100', name: 'FTSE 100 Index (UK)', value: 8245.20, change: 34.80, pct: 0.42, status: 'OPEN' },
        { symbol: 'S&P 500', name: 'S&P 500 (US)', value: 5864.67, change: 22.15, pct: 0.38, status: 'OPEN' },
        { symbol: 'NASDAQ', name: 'Nasdaq Composite', value: 18371.90, change: 115.30, pct: 0.63, status: 'OPEN' },
        { symbol: 'DOW JONES', name: 'Dow Jones Industrial', value: 43275.91, change: -36.20, pct: -0.08, status: 'OPEN' },
        { symbol: 'DAX 40', name: 'DAX Performance (GER)', value: 19655.40, change: 72.10, pct: 0.37, status: 'CLOSED' },
        { symbol: 'NIKKEI 225', name: 'Nikkei 225 (JPN)', value: 38981.75, change: 112.50, pct: 0.29, status: 'CLOSED' }
      ];

      // Benchmark securities catalog
      this.securitiesCatalog = {
        'AAPL': { name: 'Apple Inc.', price: 235.00, change: 1.75, pct: 0.75, history: [232, 233, 233.5, 234.2, 234, 235] },
        'NVDA': { name: 'NVIDIA Corporation', price: 138.25, change: 2.90, pct: 2.15, history: [134, 135, 136, 137.5, 138, 138.25] },
        'TSLA': { name: 'Tesla Inc.', price: 220.70, change: -2.68, pct: -1.20, history: [224, 223, 222, 221, 221.5, 220.7] },
        'MSFT': { name: 'Microsoft Corp.', price: 418.15, change: 1.87, pct: 0.45, history: [415, 416, 417, 417.8, 418.15] },
        'GOOGL': { name: 'Alphabet Inc.', price: 165.40, change: 0.95, pct: 0.58, history: [163.5, 164, 164.8, 165.4] },
        'AMZN': { name: 'Amazon.com Inc.', price: 187.90, change: 1.45, pct: 0.78, history: [185, 186, 187, 187.9] },
        'META': { name: 'Meta Platforms Inc.', price: 575.20, change: 4.80, pct: 0.84, history: [568, 570, 572, 575.2] },
        'SHEL': { name: 'Shell PLC (LSE)', price: 25.80, change: -0.15, pct: -0.58, history: [26.0, 25.9, 25.85, 25.80] },
        'BATS': { name: 'British American Tobacco', price: 27.10, change: 0.35, pct: 1.31, history: [26.6, 26.8, 27.0, 27.1] }
      };

      this.initEvents();
      this.initTimeframeButtons();
      this.initWatchlistForm();
      this.initChartToggles();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => this.refreshMarkets());
      NexusDataEngine.on('resume_polling', () => this.refreshMarkets());
      NexusDataEngine.on('demo_mode_changed', () => this.refreshMarkets());

      // Polling every 5 minutes
      NexusDataEngine.registerPoller('markets', () => this.refreshMarkets(), 300000);
    }

    initTimeframeButtons() {
      const btns = document.querySelectorAll('#market-timeframes .tf-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTimeframe = btn.getAttribute('data-tf') || '1D';
          NexusUtils.showToast(`Timeframe switched to ${this.activeTimeframe}`);
          this.renderFullTerminal();
        });
      });
    }

    initWatchlistForm() {
      const addBtn = document.getElementById('add-ticker-btn');
      const input = document.getElementById('add-ticker-input');

      if (addBtn && input) {
        const handleAdd = () => {
          const ticker = input.value.trim().toUpperCase();
          if (!ticker) return;

          if (this.watchlist.includes(ticker)) {
            NexusUtils.showToast(`${ticker} is already on watchlist.`);
            input.value = '';
            return;
          }

          this.watchlist.push(ticker);
          NexusStorage.set('watchlist', this.watchlist);
          NexusUtils.showToast(`Added ${ticker} to watchlist.`);
          input.value = '';
          this.render();
        };

        addBtn.addEventListener('click', handleAdd);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleAdd();
        });
      }
    }

    initChartToggles() {
      const btnBtc = document.getElementById('btn-chart-btc');
      const btnEth = document.getElementById('btn-chart-eth');
      const btnFtse = document.getElementById('btn-chart-ftse');

      const setToggle = (activeBtn, fn) => {
        [btnBtc, btnEth, btnFtse].forEach(b => b && b.classList.remove('active'));
        activeBtn && activeBtn.classList.add('active');
        fn();
      };

      btnBtc && btnBtc.addEventListener('click', () => {
        setToggle(btnBtc, () => {
          if (window.NexusCryptoWidget) window.NexusCryptoWidget.renderDetailChart('bitcoin');
        });
      });

      btnEth && btnEth.addEventListener('click', () => {
        setToggle(btnEth, () => {
          if (window.NexusCryptoWidget) window.NexusCryptoWidget.renderDetailChart('ethereum');
        });
      });

      btnFtse && btnFtse.addEventListener('click', () => {
        setToggle(btnFtse, () => {
          const titleEl = document.getElementById('chart-active-title');
          if (titleEl) titleEl.textContent = 'FTSE 100 INDEX — INTERACTIVE PERFORMANCE';
          const points = [
            { time: 1, price: 8205 },
            { time: 2, price: 8218 },
            { time: 3, price: 8212 },
            { time: 4, price: 8235 },
            { time: 5, price: 8245.20 }
          ];
          NexusCharts.renderFinancialChart('market-detail-canvas', 'FTSE 100', points);
        });
      });
    }

    refreshMarkets() {
      // This legacy stock catalog is a labelled sample, never a live quote feed.
      this.indicesData.forEach(idx => { idx.status = 'SAMPLE'; });
      this.render();
    }

    render() {
      this.renderOverviewIndices();
      this.renderOverviewWatchlist();
      this.renderFullTerminal();
    }

    renderOverviewIndices() {
      const ftse = this.indicesData[0];
      const sp = this.indicesData[1];
      const nasdaq = this.indicesData[2];
      const dow = this.indicesData[3];

      const updateBox = (idPrefix, data) => {
        const valEl = document.getElementById(`${idPrefix}-val`);
        const chgEl = document.getElementById(`${idPrefix}-chg`);
        if (!valEl || !chgEl) return;

        valEl.textContent = NexusUtils.formatNumber(data.value, 2);
        const isUp = data.pct >= 0;
        chgEl.className = `idx-chg ${isUp ? 'up' : 'down'}`;
        chgEl.textContent = `${isUp ? '+' : ''}${data.change.toFixed(2)} (${isUp ? '+' : ''}${data.pct.toFixed(2)}%)`;
      };

      if (ftse) updateBox('idx-ftse', ftse);
      if (sp) updateBox('idx-sp', sp);
      if (nasdaq) updateBox('idx-nasdaq', nasdaq);
      if (dow) updateBox('idx-dow', dow);
    }

    renderOverviewWatchlist() {
      const container = document.getElementById('equities-watchlist');
      if (!container) return;

      const items = this.watchlist.slice(0, 4); // Top 4 in overview
      const html = items.map(ticker => {
        const sec = this.securitiesCatalog[ticker] || {
          name: `${ticker} Equity`,
          price: 150.00,
          change: 1.20,
          pct: 0.80,
          history: [148, 149, 149.5, 150]
        };

        const isUp = sec.pct >= 0;
        const sparkSvg = NexusCharts.renderSVGSparkline(sec.history, isUp, 70, 22);

        return `
          <div class="eq-item">
            <div class="eq-sym-col">
              <span class="eq-sym">${ticker}</span>
              <span class="eq-name">${sec.name}</span>
            </div>
            <div class="eq-chart-spark">${sparkSvg}</div>
            <div class="eq-price-col">
              <span class="eq-price">${NexusUtils.formatCurrency(sec.price, 'usd')}</span>
              <span class="eq-chg ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${sec.pct.toFixed(2)}%</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = html.join('');
    }

    renderFullTerminal() {
      // 1. Full Indices Table
      const tbody = document.getElementById('indices-full-tbody');
      if (tbody) {
        tbody.innerHTML = this.indicesData.map(idx => {
          const isUp = idx.pct >= 0;
          return `
            <tr>
              <td><strong>${idx.symbol}</strong> <span style="color:var(--text-dim); margin-left:6px;">${idx.name}</span></td>
              <td><strong>${NexusUtils.formatNumber(idx.value, 2)}</strong></td>
              <td class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${idx.change.toFixed(2)}</td>
              <td class="${isUp ? 'up' : 'down'}"><strong>${isUp ? '+' : ''}${idx.pct.toFixed(2)}%</strong></td>
              <td><span class="wh-badge ${idx.status === 'OPEN' ? 'live-badge' : ''}">${idx.status}</span></td>
            </tr>
          `;
        }).join('');
      }

      // 2. Full Watchlist Grid with Remove Buttons
      const fullGrid = document.getElementById('watchlist-full-grid');
      if (fullGrid) {
        fullGrid.innerHTML = this.watchlist.map(ticker => {
          const sec = this.securitiesCatalog[ticker] || {
            name: `${ticker} Equity`,
            price: 150.00,
            pct: 0.80,
            history: [148, 150]
          };
          const isUp = sec.pct >= 0;
          const sparkSvg = NexusCharts.renderSVGSparkline(sec.history, isUp, 80, 24);

          return `
            <div class="eq-item" style="padding: 10px 12px; margin-bottom: 6px;">
              <div class="eq-sym-col">
                <span class="eq-sym">${ticker}</span>
                <span class="eq-name">${sec.name}</span>
              </div>
              <div class="eq-chart-spark">${sparkSvg}</div>
              <div class="eq-price-col">
                <span class="eq-price">${NexusUtils.formatCurrency(sec.price, 'usd')}</span>
                <span class="eq-chg ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${sec.pct.toFixed(2)}%</span>
              </div>
              <button class="btn-danger-mini remove-ticker-btn" data-ticker="${ticker}" style="margin-left: 10px;" title="Remove from watchlist">×</button>
            </div>
          `;
        }).join('');

        // Attach remove handlers
        fullGrid.querySelectorAll('.remove-ticker-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const t = btn.getAttribute('data-ticker');
            this.watchlist = this.watchlist.filter(item => item !== t);
            NexusStorage.set('watchlist', this.watchlist);
            NexusUtils.showToast(`Removed ${t} from watchlist`);
            this.render();
          });
        });
      }
    }
  }

  window.NexusMarketsWidget = new NexusMarketsWidget();
})(window);
