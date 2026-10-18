/**
 * NEXUS OS — Zero-Dependency High Performance Charting
 * Tailored for Rockchip RK3326 & Android 8.1 WebView
 * Provides SVG sparklines and hardware-accelerated 2D Canvas charts
 */

(function (window) {
  'use strict';

  const NexusCharts = {
    /**
     * Render an ultra-lightweight SVG sparkline string
     * @param {Array<number>} data - Array of price or metric points
     * @param {boolean} isPositive - Whether trend is positive (green) or negative (red)
     * @param {number} width - Sparkline width
     * @param {number} height - Sparkline height
     * @returns {string} SVG HTML string
     */
    renderSVGSparkline(data, isPositive = true, width = 70, height = 24) {
      if (!data || data.length < 2) {
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/></svg>`;
      }

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const padding = 2;
      const usableHeight = height - padding * 2;

      // Generate points
      const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - padding - ((val - min) / range) * usableHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      const strokeColor = isPositive ? '#10b981' : '#f43f5e';
      const gradientId = `spark-grad-${Math.random().toString(36).substr(2, 6)}`;
      const fillPath = `M 0,${height} L ${points.replace(/ /g, ' L ')} L ${width},${height} Z`;

      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible" style="display:block;">
          <defs>
            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <path d="${fillPath}" fill="url(#${gradientId})"/>
          <polyline fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>
        </svg>
      `;
    },

    /**
     * Render 24-Hour Weather Hourly Canvas Chart
     * Plots temperature curve + rain probability columns
     */
    renderWeatherHourlyChart(canvasId, hourlyData) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.width;
      const height = rect.height || canvas.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, width, height);

      if (!hourlyData || !hourlyData.temperatures || hourlyData.temperatures.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px "SF Mono", monospace';
        ctx.fillText('Weather forecast data unavailable', 20, height / 2);
        return;
      }

      const temps = hourlyData.temperatures.slice(0, 24);
      const rainProbs = (hourlyData.precipitation || []).slice(0, 24);
      const times = (hourlyData.times || []).slice(0, 24);

      const minTemp = Math.min(...temps) - 1;
      const maxTemp = Math.max(...temps) + 1;
      const tempRange = maxTemp - minTemp || 1;

      const paddingTop = 26;
      const paddingBottom = 40;
      const chartHeight = height - paddingTop - paddingBottom;
      const stepX = width / (temps.length - 1);

      // 1. Draw Rain Probability Bars in Background
      rainProbs.forEach((prob, i) => {
        if (prob > 0) {
          const barWidth = stepX * 0.6;
          const x = i * stepX - barWidth / 2;
          const barH = (prob / 100) * (chartHeight * 0.45);
          const y = height - paddingBottom - barH;

          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fillRect(Math.max(2, x), y, barWidth, barH);

          if (prob >= 25 && i % 2 === 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px "SF Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${prob}%`, i * stepX, y - 4);
          }
        }
      });

      // 2. Draw Horizontal Grid Reference Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = 0; g <= 3; g++) {
        const gy = paddingTop + (chartHeight / 3) * g;
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
      }
      ctx.stroke();

      // 3. Draw Temperature Gradient Fill
      const points = temps.map((t, i) => ({
        x: i * stepX,
        y: paddingTop + chartHeight - ((t - minTemp) / tempRange) * chartHeight
      }));

      const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - paddingBottom);
      ctx.lineTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 4. Draw Temperature Curve
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();

      // 5. Draw Temperature Labels and Hour Time Labels
      points.forEach((pt, i) => {
        // Show temp every 3 hours
        if (i % 3 === 0 || i === 0 || i === points.length - 1) {
          // Dot
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#00f0ff';
          ctx.fill();

          // Temp text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px "SF Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(temps[i])}°`, pt.x, pt.y - 8);

          // Hour text
          const timeStr = times[i] ? times[i].slice(11, 16) : `${i}:00`;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px "SF Mono", monospace';
          ctx.fillText(timeStr, pt.x, height - 12);
        }
      });
    },

    /**
     * Render Financial Market Interactive Chart
     */
    renderFinancialChart(canvasId, title, pointsData) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.width;
      const height = rect.height || canvas.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      if (!pointsData || pointsData.length < 2) return;

      const prices = pointsData.map(p => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;
      const isUp = prices[prices.length - 1] >= prices[0];
      const strokeColor = isUp ? '#10b981' : '#f43f5e';

      const paddingLeft = 10;
      const paddingRight = 60;
      const paddingTop = 20;
      const paddingBottom = 25;
      const chartW = width - paddingLeft - paddingRight;
      const chartH = height - paddingTop - paddingBottom;

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gy = paddingTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, gy);
        ctx.lineTo(width - paddingRight, gy);
        ctx.stroke();

        // Right axis price labels
        const pLabel = max - (range / 4) * i;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(pLabel.toLocaleString('en-GB', { maximumFractionDigits: 1 }), width - paddingRight + 6, gy + 3);
      }

      const points = prices.map((price, idx) => ({
        x: paddingLeft + (idx / (prices.length - 1)) * chartW,
        y: paddingTop + chartH - ((price - min) / range) * chartH
      }));

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
      grad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - paddingBottom);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke Line
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // End Pulse Dot
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }
  };

  window.NexusCharts = NexusCharts;
})(window);
