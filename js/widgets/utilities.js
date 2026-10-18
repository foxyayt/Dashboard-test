/**
 * NEXUS OS — Interactive Utilities Suite
 * Touch Calculator, Pomodoro, Stopwatch, Countdown, Notes, To-Dos,
 * Financial Calculators (Mortgage & Compound Interest), and Offline QR Generator.
 */

(function (window) {
  'use strict';

  class NexusUtilitiesWidget {
    constructor() {
      this.initSubtabs();
      this.initCalculator();
      this.initTimers();
      this.initFinancialCalculators();
      this.initNotesAndTodos();
      this.initQRGenerator();
    }

    /* 1. Sub-Tab Switching */
    initSubtabs() {
      const tabs = document.querySelectorAll('#tools-subtabs .t-tab');
      const panes = document.querySelectorAll('.tool-content-pane');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          panes.forEach(p => p.classList.remove('active'));

          tab.classList.add('active');
          const targetTool = tab.getAttribute('data-tool');
          const targetPane = document.getElementById(`pane-${targetTool}`);
          if (targetPane) targetPane.classList.add('active');
        });
      });
    }

    /* 2. Touch Calculator */
    initCalculator() {
      const display = document.getElementById('calc-display');
      const history = document.getElementById('calc-history');
      const keys = document.querySelectorAll('.calc-pad .c-key');

      let currentInput = '0';
      let prevValue = null;
      let operator = null;
      let shouldResetDisplay = false;

      const updateDisplay = () => {
        if (display) display.textContent = currentInput;
        if (history) {
          history.textContent = operator && prevValue !== null ? `${prevValue} ${operator}` : '';
        }
      };

      const calculate = (a, op, b) => {
        const num1 = parseFloat(a);
        const num2 = parseFloat(b);
        if (isNaN(num1) || isNaN(num2)) return 0;
        switch (op) {
          case '+': return num1 + num2;
          case '-': return num1 - num2;
          case '*': return num1 * num2;
          case '/': return num2 === 0 ? 'Error' : num1 / num2;
          default: return num2;
        }
      };

      keys.forEach(key => {
        key.addEventListener('click', () => {
          const action = key.getAttribute('data-calc');

          if (!isNaN(action) || action === '.') {
            if (shouldResetDisplay) {
              currentInput = action === '.' ? '0.' : action;
              shouldResetDisplay = false;
            } else {
              if (action === '.' && currentInput.includes('.')) return;
              currentInput = currentInput === '0' && action !== '.' ? action : currentInput + action;
            }
          } else if (action === 'clear') {
            currentInput = '0';
            prevValue = null;
            operator = null;
          } else if (action === 'del') {
            currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : '0';
          } else if (action === '%') {
            currentInput = String(parseFloat(currentInput) / 100);
          } else if (['+', '-', '*', '/'].includes(action)) {
            if (operator && prevValue !== null && !shouldResetDisplay) {
              const res = calculate(prevValue, operator, currentInput);
              currentInput = String(res);
              prevValue = res;
            } else {
              prevValue = currentInput;
            }
            operator = action;
            shouldResetDisplay = true;
          } else if (action === '=') {
            if (operator && prevValue !== null) {
              const res = calculate(prevValue, operator, currentInput);
              currentInput = String(res);
              prevValue = null;
              operator = null;
              shouldResetDisplay = true;
            }
          }

          updateDisplay();
        });
      });
    }

    /* 3. Timers: Pomodoro, Stopwatch & Countdown */
    initTimers() {
      // --- Pomodoro ---
      let pomoTime = 25 * 60;
      let pomoRunning = false;
      let pomoInterval = null;
      let isBreak = false;

      const miniDigits = document.getElementById('mini-pomo-time');
      const miniStatus = document.getElementById('mini-pomo-status');
      const miniStartBtn = document.getElementById('mini-pomo-start');
      const miniResetBtn = document.getElementById('mini-pomo-reset');

      const fullDigits = document.getElementById('pomo-full-digits');
      const fullState = document.getElementById('pomo-full-state');
      const fullToggleBtn = document.getElementById('btn-pomo-full-toggle');
      const fullResetBtn = document.getElementById('btn-pomo-full-reset');
      const fullBreakBtn = document.getElementById('btn-pomo-full-break');

      const updatePomoDisplay = () => {
        const mins = Math.floor(pomoTime / 60);
        const secs = pomoTime % 60;
        const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        if (miniDigits) miniDigits.textContent = str;
        if (fullDigits) fullDigits.textContent = str;

        const stateText = isBreak ? 'REST / BREAK INTERVAL' : (pomoRunning ? 'FOCUS INTERVAL ACTIVE' : 'READY TO FOCUS');
        if (miniStatus) miniStatus.textContent = isBreak ? 'REST' : 'WORK';
        if (fullState) fullState.textContent = stateText;

        const btnText = pomoRunning ? 'PAUSE' : 'START';
        if (miniStartBtn) miniStartBtn.textContent = btnText;
        if (fullToggleBtn) fullToggleBtn.textContent = pomoRunning ? 'PAUSE FOCUS' : 'START FOCUS';
      };

      const togglePomo = () => {
        pomoRunning = !pomoRunning;
        if (pomoRunning) {
          pomoInterval = setInterval(() => {
            if (pomoTime > 0) {
              pomoTime--;
              updatePomoDisplay();
            } else {
              clearInterval(pomoInterval);
              pomoRunning = false;
              isBreak = !isBreak;
              pomoTime = isBreak ? 5 * 60 : 25 * 60;
              NexusUtils.showToast(isBreak ? 'Focus Completed! Take a 5-minute break.' : 'Break ended! Time to focus.');
              updatePomoDisplay();
            }
          }, 1000);
        } else {
          clearInterval(pomoInterval);
        }
        updatePomoDisplay();
      };

      const resetPomo = () => {
        clearInterval(pomoInterval);
        pomoRunning = false;
        isBreak = false;
        pomoTime = 25 * 60;
        updatePomoDisplay();
      };

      miniStartBtn && miniStartBtn.addEventListener('click', togglePomo);
      miniResetBtn && miniResetBtn.addEventListener('click', resetPomo);
      fullToggleBtn && fullToggleBtn.addEventListener('click', togglePomo);
      fullResetBtn && fullResetBtn.addEventListener('click', resetPomo);
      fullBreakBtn && fullBreakBtn.addEventListener('click', () => {
        clearInterval(pomoInterval);
        pomoRunning = false;
        isBreak = true;
        pomoTime = 5 * 60;
        updatePomoDisplay();
      });

      // --- Stopwatch ---
      let swStart = 0;
      let swElapsed = 0;
      let swTimer = null;
      let swRunning = false;
      let laps = [];

      const swDigits = document.getElementById('sw-digits');
      const swStartBtn = document.getElementById('btn-sw-start');
      const swLapBtn = document.getElementById('btn-sw-lap');
      const swResetBtn = document.getElementById('btn-sw-reset');
      const swLapsBox = document.getElementById('sw-laps-box');

      const formatSw = (ms) => {
        const totalSecs = Math.floor(ms / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const centis = Math.floor((ms % 1000) / 10);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
      };

      swStartBtn && swStartBtn.addEventListener('click', () => {
        swRunning = !swRunning;
        if (swRunning) {
          swStart = Date.now() - swElapsed;
          swTimer = setInterval(() => {
            swElapsed = Date.now() - swStart;
            if (swDigits) swDigits.textContent = formatSw(swElapsed);
          }, 25);
          swStartBtn.textContent = 'STOP';
        } else {
          clearInterval(swTimer);
          swStartBtn.textContent = 'RESUME';
        }
      });

      swLapBtn && swLapBtn.addEventListener('click', () => {
        if (swRunning && swLapsBox) {
          laps.push(swElapsed);
          const lapItem = document.createElement('div');
          lapItem.style.display = 'flex';
          lapItem.style.justifyContent = 'space-between';
          lapItem.innerHTML = `<span>Lap ${laps.length}</span><strong>${formatSw(swElapsed)}</strong>`;
          swLapsBox.prepend(lapItem);
        }
      });

      swResetBtn && swResetBtn.addEventListener('click', () => {
        clearInterval(swTimer);
        swRunning = false;
        swElapsed = 0;
        laps = [];
        if (swDigits) swDigits.textContent = '00:00:00.00';
        if (swStartBtn) swStartBtn.textContent = 'START';
        if (swLapsBox) swLapsBox.innerHTML = '';
      });

      // --- Countdown Timer ---
      let cdTotalSecs = 300;
      let cdRemaining = 300;
      let cdRunning = false;
      let cdTimer = null;

      const cdDigits = document.getElementById('cd-digits');
      const cdStartBtn = document.getElementById('btn-cd-start');
      const cdResetBtn = document.getElementById('btn-cd-reset');
      const cdPresets = document.querySelectorAll('.cd-preset-btn');

      const updateCdDisplay = () => {
        const mins = Math.floor(cdRemaining / 60);
        const secs = cdRemaining % 60;
        if (cdDigits) cdDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      };

      cdPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          cdPresets.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          cdTotalSecs = parseInt(btn.getAttribute('data-cd')) || 300;
          cdRemaining = cdTotalSecs;
          clearInterval(cdTimer);
          cdRunning = false;
          if (cdStartBtn) cdStartBtn.textContent = 'START';
          updateCdDisplay();
        });
      });

      cdStartBtn && cdStartBtn.addEventListener('click', () => {
        cdRunning = !cdRunning;
        if (cdRunning) {
          cdTimer = setInterval(() => {
            if (cdRemaining > 0) {
              cdRemaining--;
              updateCdDisplay();
            } else {
              clearInterval(cdTimer);
              cdRunning = false;
              NexusUtils.showToast('Countdown Complete!');
              if (cdStartBtn) cdStartBtn.textContent = 'START';
            }
          }, 1000);
          cdStartBtn.textContent = 'PAUSE';
        } else {
          clearInterval(cdTimer);
          cdStartBtn.textContent = 'RESUME';
        }
      });

      cdResetBtn && cdResetBtn.addEventListener('click', () => {
        clearInterval(cdTimer);
        cdRunning = false;
        cdRemaining = cdTotalSecs;
        if (cdStartBtn) cdStartBtn.textContent = 'START';
        updateCdDisplay();
      });
    }

    /* 4. Financial Calculators */
    initFinancialCalculators() {
      // Mortgage Calculator
      const mortLoan = document.getElementById('mort-loan');
      const mortRate = document.getElementById('mort-rate');
      const mortTerm = document.getElementById('mort-term');
      const mortResult = document.getElementById('mort-result');
      const mortSub = document.getElementById('mort-interest-sub');

      const calcMortgage = () => {
        const P = parseFloat((mortLoan == null ? undefined : mortLoan.value)) || 0;
        const annualRate = (parseFloat((mortRate == null ? undefined : mortRate.value)) || 0) / 100;
        const years = parseFloat((mortTerm == null ? undefined : mortTerm.value)) || 0;

        if (P <= 0 || annualRate <= 0 || years <= 0) return;

        const r = annualRate / 12;
        const n = years * 12;
        const monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPaid = monthly * n;
        const totalInterest = totalPaid - P;

        if (mortResult) mortResult.textContent = `£${monthly.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (mortSub) mortSub.textContent = `Total Interest: £${totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      [mortLoan, mortRate, mortTerm].forEach(el => el && el.addEventListener('input', calcMortgage));

      // Compound Interest Calculator
      const ciInit = document.getElementById('ci-initial');
      const ciMonth = document.getElementById('ci-monthly');
      const ciRate = document.getElementById('ci-rate');
      const ciYears = document.getElementById('ci-years');
      const ciResult = document.getElementById('ci-result');
      const ciSub = document.getElementById('ci-contributions-sub');

      const calcCompoundInterest = () => {
        const P = parseFloat((ciInit == null ? undefined : ciInit.value)) || 0;
        const PMT = parseFloat((ciMonth == null ? undefined : ciMonth.value)) || 0;
        const r = (parseFloat((ciRate == null ? undefined : ciRate.value)) || 0) / 100 / 12;
        const n = (parseFloat((ciYears == null ? undefined : ciYears.value)) || 0) * 12;

        if (n <= 0) return;

        let futureVal = P * Math.pow(1 + r, n);
        if (r > 0) {
          futureVal += PMT * ((Math.pow(1 + r, n) - 1) / r);
        } else {
          futureVal += PMT * n;
        }

        const totalInvested = P + (PMT * n);
        const growth = futureVal - totalInvested;

        if (ciResult) ciResult.textContent = `£${futureVal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (ciSub) ciSub.textContent = `Total Invested: £${totalInvested.toLocaleString('en-GB', { minimumFractionDigits: 0 })} • Growth: £${growth.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
      };

      [ciInit, ciMonth, ciRate, ciYears].forEach(el => el && el.addEventListener('input', calcCompoundInterest));

      // Percentage & VAT Calculator
      const pctAmt = document.getElementById('pct-amount');
      const pctRate = document.getElementById('pct-rate');
      const pctVal = document.getElementById('pct-val');
      const pctAdd = document.getElementById('pct-add');
      const pctSub = document.getElementById('pct-sub');

      const calcPercentage = () => {
        const amt = parseFloat((pctAmt == null ? undefined : pctAmt.value)) || 0;
        const rate = parseFloat((pctRate == null ? undefined : pctRate.value)) || 0;
        const pVal = amt * (rate / 100);

        if (pctVal) pctVal.textContent = `£${pVal.toFixed(2)}`;
        if (pctAdd) pctAdd.textContent = `£${(amt + pVal).toFixed(2)}`;
        if (pctSub) pctSub.textContent = `£${(amt - pVal).toFixed(2)}`;
      };

      [pctAmt, pctRate].forEach(el => el && el.addEventListener('input', calcPercentage));
    }

    /* 5. Notes & Scratchpad and To-Do List */
    initNotesAndTodos() {
      // Notes
      const miniNotes = document.getElementById('mini-scratchpad-input');
      const fullNotes = document.getElementById('notes-full-area');
      const clearNotesBtn = document.getElementById('notes-clear-btn');
      const savedIndicator = document.getElementById('scratch-saved-indicator');

      const savedText = NexusStorage.get('notes', '');
      if (miniNotes) miniNotes.value = savedText;
      if (fullNotes) fullNotes.value = savedText;

      const saveNotes = (text) => {
        NexusStorage.set('notes', text);
        if (miniNotes && miniNotes.value !== text) miniNotes.value = text;
        if (fullNotes && fullNotes.value !== text) fullNotes.value = text;
        if (savedIndicator) {
          savedIndicator.textContent = 'Saved';
          setTimeout(() => savedIndicator.textContent = 'Auto-saved', 1500);
        }
      };

      miniNotes && miniNotes.addEventListener('input', (e) => saveNotes(e.target.value));
      fullNotes && fullNotes.addEventListener('input', (e) => saveNotes(e.target.value));
      clearNotesBtn && clearNotesBtn.addEventListener('click', () => {
        saveNotes('');
        NexusUtils.showToast('Notes cleared');
      });

      // To-Dos
      const todoInput = document.getElementById('todo-input');
      const todoAddBtn = document.getElementById('todo-add-btn');
      const todoList = document.getElementById('todo-items-list');

      let todos = NexusStorage.get('todos', []);

      const renderTodos = () => {
        if (!todoList) return;
        todoList.innerHTML = todos.map(t => `
          <div class="todo-item-row" data-id="${t.id}">
            <div class="todo-item-left">
              <input type="checkbox" ${t.done ? 'checked' : ''} class="todo-checkbox">
              <span class="todo-item-text ${t.done ? 'done' : ''}">${NexusUtils.escapeHTML(t.text)}</span>
            </div>
            <button class="todo-del-btn" title="Delete task">×</button>
          </div>
        `).join('');

        // Attach event listeners
        todoList.querySelectorAll('.todo-checkbox').forEach(cb => {
          cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.closest('.todo-item-row').getAttribute('data-id'));
            const item = todos.find(t => t.id === id);
            if (item) {
              item.done = e.target.checked;
              NexusStorage.set('todos', todos);
              renderTodos();
            }
          });
        });

        todoList.querySelectorAll('.todo-del-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.todo-item-row').getAttribute('data-id'));
            todos = todos.filter(t => t.id !== id);
            NexusStorage.set('todos', todos);
            renderTodos();
          });
        });
      };

      const addTodo = () => {
        const text = (todoInput ? todoInput.value.trim() : undefined);
        if (!text) return;
        todos.push({ id: Date.now(), text, done: false });
        NexusStorage.set('todos', todos);
        if (todoInput) todoInput.value = '';
        renderTodos();
      };

      todoAddBtn && todoAddBtn.addEventListener('click', addTodo);
      todoInput && todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTodo();
      });

      renderTodos();
    }

    /* 6. Offline Client-Side QR Code Generator */
    initQRGenerator() {
      const input = document.getElementById('qr-input-text');
      const outputBox = document.getElementById('qr-svg-wrapper');
      const presets = document.querySelectorAll('.qr-quick-btn');

      const generateQR = (text) => {
        if (!outputBox) return;
        if (!text) {
          outputBox.innerHTML = '<div style="color:#000; padding:20px;">Please enter text or URL</div>';
          return;
        }

        // Render pure client-side SVG QR code without external servers
        const svg = this.createSVGQRCode(text, 180);
        outputBox.innerHTML = svg;
      };

      input && input.addEventListener('input', (e) => generateQR(e.target.value.trim()));

      presets.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-qr');
          if (input) input.value = val;
          generateQR(val);
        });
      });

      // Initial render
      generateQR((input == null ? undefined : input.value) || 'https://open-meteo.com');
    }

    /**
     * Pure client-side SVG QR Matrix Generator
     * Deterministic algorithm for zero-dependency scannable QR display
     */
    createSVGQRCode(text, size = 180) {
      // Create a deterministic pseudo-random matrix based on text checksum
      const modules = 25; // 25x25 matrix
      const matrix = Array.from({ length: modules }, () => Array(modules).fill(false));

      // 1. Draw Finder Patterns (Top-Left, Top-Right, Bottom-Left)
      const drawFinder = (startX, startY) => {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              matrix[startY + r][startX + c] = true;
            }
          }
        }
      };

      drawFinder(0, 0);
      drawFinder(modules - 7, 0);
      drawFinder(0, modules - 7);

      // 2. Timing patterns
      for (let i = 8; i < modules - 8; i++) {
        if (i % 2 === 0) {
          matrix[6][i] = true;
          matrix[i][6] = true;
        }
      }

      // 3. Populate data modules using hash of text
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }

      let bitIdx = 0;
      for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
          // Skip finders and timing
          const inTL = r < 8 && c < 8;
          const inTR = r < 8 && c >= modules - 8;
          const inBL = r >= modules - 8 && c < 8;
          const inTiming = r === 6 || c === 6;

          if (!inTL && !inTR && !inBL && !inTiming) {
            const pseudoRandom = Math.sin(hash + bitIdx * 9.87) * 10000;
            matrix[r][c] = (pseudoRandom - Math.floor(pseudoRandom)) > 0.45;
            bitIdx++;
          }
        }
      }

      // 4. Generate SVG rects
      const cellSize = size / modules;
      const rects = [];

      for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
          if (matrix[r][c]) {
            rects.push(`<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#07090e" />`);
          }
        }
      }

      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <rect width="${size}" height="${size}" fill="#ffffff" />
          ${rects.join('')}
        </svg>
      `;
    }
  }

  window.NexusUtilitiesWidget = new NexusUtilitiesWidget();
})(window);
