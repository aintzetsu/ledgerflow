/* ==========================================================================
   LedgerFlow — Interactive HiDPI Canvas Revenue vs. Expenses Chart
   ========================================================================== */

(function (global) {
  "use strict";

  function createRevenueChart(canvas, tooltipEl) {
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    let series = [];
    let hoverIdx = -1;

    function getColors() {
      const s = getComputedStyle(document.documentElement);
      return {
        accent: s.getPropertyValue("--accent").trim() || "#059669",
        accentSoft: s.getPropertyValue("--accent-soft").trim() || "rgba(5,150,105,0.12)",
        amber: s.getPropertyValue("--amber").trim() || "#d97706",
        border: s.getPropertyValue("--border").trim() || "rgba(0,0,0,0.1)",
        muted: s.getPropertyValue("--ink-muted").trim() || "#64748b",
        ink: s.getPropertyValue("--ink").trim() || "#0f172a"
      };
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(180, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setData(nextSeries) {
      series = nextSeries || [];
      hoverIdx = -1;
      if (tooltipEl) tooltipEl.style.opacity = "0";
      draw();
    }

    function draw() {
      const width = canvas.clientWidth || 600;
      const height = canvas.clientHeight || 260;
      const pad = { top: 20, right: 18, bottom: 32, left: 56 };
      const plotW = Math.max(80, width - pad.left - pad.right);
      const plotH = Math.max(80, height - pad.top - pad.bottom);
      const c = getColors();

      ctx.clearRect(0, 0, width, height);
      if (series.length === 0) return;

      const maxVal = Math.max.apply(
        null,
        series.map(function (pt) {
          return Math.max(pt.revenue, pt.expenses);
        })
      ) * 1.15;

      // Y-axis grid & labels
      ctx.font = "11px monospace";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const val = (maxVal / 4) * i;
        const y = pad.top + plotH - (i / 4) * plotH;
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
        ctx.stroke();

        ctx.fillStyle = c.muted;
        ctx.textAlign = "right";
        ctx.fillText("$" + Math.round(val / 1000) + "k", pad.left - 8, y);
      }

      const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
      const revCoords = series.map(function (pt, idx) {
        return {
          x: pad.left + (series.length > 1 ? idx * stepX : plotW / 2),
          y: pad.top + plotH - (pt.revenue / maxVal) * plotH
        };
      });
      const expCoords = series.map(function (pt, idx) {
        return {
          x: pad.left + (series.length > 1 ? idx * stepX : plotW / 2),
          y: pad.top + plotH - (pt.expenses / maxVal) * plotH
        };
      });

      // X-axis labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      series.forEach(function (pt, idx) {
        ctx.fillStyle = idx === hoverIdx ? c.ink : c.muted;
        ctx.fillText(pt.month, revCoords[idx].x, pad.top + plotH + 10);
      });

      // Revenue area fill
      if (revCoords.length > 1) {
        ctx.beginPath();
        ctx.moveTo(revCoords[0].x, pad.top + plotH);
        revCoords.forEach(function (p) { ctx.lineTo(p.x, p.y); });
        ctx.lineTo(revCoords[revCoords.length - 1].x, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = c.accentSoft;
        ctx.fill();
      }

      // Expense dashed line
      ctx.save();
      ctx.strokeStyle = c.amber;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      expCoords.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();

      // Revenue line
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      revCoords.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Points & Hover Indicator
      revCoords.forEach(function (p, i) {
        ctx.fillStyle = i === hoverIdx ? c.ink : c.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === hoverIdx ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      if (hoverIdx >= 0 && revCoords[hoverIdx]) {
        const hx = revCoords[hoverIdx].x;
        ctx.save();
        ctx.strokeStyle = c.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, pad.top);
        ctx.lineTo(hx, pad.top + plotH);
        ctx.stroke();
        ctx.restore();
      }
    }

    canvas.addEventListener("pointermove", function (ev) {
      if (series.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const padLeft = 56;
      const padRight = 18;
      const plotW = Math.max(80, rect.width - padLeft - padRight);
      const relX = ev.clientX - rect.left - padLeft;
      const ratio = Math.max(0, Math.min(1, relX / plotW));
      const idx = series.length > 1 ? Math.round(ratio * (series.length - 1)) : 0;

      if (idx !== hoverIdx) {
        hoverIdx = idx;
        draw();
      }
      if (tooltipEl && series[idx]) {
        const pt = series[idx];
        const net = pt.revenue - pt.expenses;
        tooltipEl.textContent =
          pt.month + " · Rev $" + pt.revenue.toLocaleString("en-US") +
          " · Exp $" + pt.expenses.toLocaleString("en-US") +
          " · Net " + (net >= 0 ? "+$" : "-$") + Math.abs(net).toLocaleString("en-US");
        tooltipEl.style.opacity = "1";
        const left = Math.min(rect.width - 260, Math.max(8, ev.clientX - rect.left + 12));
        tooltipEl.style.left = left + "px";
        tooltipEl.style.top = "12px";
      }
    });

    canvas.addEventListener("pointerleave", function () {
      hoverIdx = -1;
      if (tooltipEl) tooltipEl.style.opacity = "0";
      draw();
    });

    global.addEventListener("resize", function () {
      resize();
      draw();
    });

    resize();
    return {
      setData: setData,
      redraw: draw
    };
  }

  global.LedgerCharts = {
    createRevenueChart: createRevenueChart
  };
})(window);
