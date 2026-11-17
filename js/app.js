/* ==========================================================================
   LedgerFlow — Dashboard State, Filters, Command Palette & CSV Export
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_THEME = "ledgerflow_theme";
  const STORAGE_TX = "ledgerflow_transactions";
  const Data = global.LedgerData;

  function safeGet(key, fallback) {
    try {
      const v = global.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function safeSet(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (_err) {
      // Ignore storage error
    }
  }

  const state = {
    theme: safeGet(STORAGE_THEME, "light"),
    range: "12m", // "3m" | "6m" | "12m"
    tier: "all",  // "all" | "enterprise" | "pro" | "starter"
    search: "",
    statusFilter: "all",
    sortField: "date",
    sortDir: "desc",
    transactions: safeGet(STORAGE_TX, Data.TRANSACTIONS.slice())
  };

  let chart = null;
  const dom = {};

  function cacheDom() {
    dom.sidebar = document.getElementById("sidebar");
    dom.mobileNavBtn = document.getElementById("mobile-nav-btn");
    dom.themeToggle = document.getElementById("theme-toggle");
    dom.rangeBtns = document.querySelectorAll("[data-range]");
    dom.tierSelect = document.getElementById("tier-filter");

    dom.kpiMrr = document.getElementById("kpi-mrr");
    dom.kpiNet = document.getElementById("kpi-net");
    dom.kpiNdr = document.getElementById("kpi-ndr");
    dom.kpiRunway = document.getElementById("kpi-runway");

    dom.chartCanvas = document.getElementById("revenue-canvas");
    dom.chartTooltip = document.getElementById("chart-tooltip");
    dom.mixList = document.getElementById("mix-list");

    dom.txSearch = document.getElementById("tx-search");
    dom.txStatus = document.getElementById("tx-status");
    dom.txBody = document.getElementById("tx-body");
    dom.sortBtns = document.querySelectorAll("[data-sort]");
    dom.exportCsvBtn = document.getElementById("export-csv-btn");

    dom.openEntryBtn = document.getElementById("open-entry-btn");
    dom.entryModal = document.getElementById("entry-modal");
    dom.closeEntryBtn = document.getElementById("close-entry-btn");
    dom.entryForm = document.getElementById("entry-form");

    dom.cmdTrigger = document.getElementById("cmd-trigger");
    dom.cmdModal = document.getElementById("cmd-modal");
    dom.cmdInput = document.getElementById("cmd-input");
    dom.cmdList = document.getElementById("cmd-list");
    dom.closeCmdBtn = document.getElementById("close-cmd-btn");
    dom.toast = document.getElementById("toast");
  }

  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.hidden = false;
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(function () {
      dom.toast.hidden = true;
    }, 2400);
  }

  function formatMoney(n) {
    const sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    safeSet(STORAGE_THEME, state.theme);
    if (dom.themeToggle) {
      dom.themeToggle.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
    }
    if (chart) chart.redraw();
  }

  function getFilteredSeries() {
    const sliceCount = state.range === "3m" ? 3 : state.range === "6m" ? 6 : 12;
    const raw = Data.MONTHLY_SERIES.slice(-sliceCount);
    return raw.map(function (pt) {
      let rev = pt.enterprise + pt.pro + pt.starter;
      let exp = pt.expenses;
      if (state.tier === "enterprise") {
        rev = pt.enterprise;
        exp = Math.round(pt.expenses * 0.48);
      } else if (state.tier === "pro") {
        rev = pt.pro;
        exp = Math.round(pt.expenses * 0.34);
      } else if (state.tier === "starter") {
        rev = pt.starter;
        exp = Math.round(pt.expenses * 0.18);
      }
      return {
        month: pt.month,
        revenue: rev,
        expenses: exp,
        enterprise: pt.enterprise,
        pro: pt.pro,
        starter: pt.starter
      };
    });
  }

  function renderMetricsAndCharts() {
    const series = getFilteredSeries();
    const latest = series[series.length - 1];
    const netProfit = latest.revenue - latest.expenses;

    dom.kpiMrr.textContent = formatMoney(latest.revenue);
    dom.kpiNet.textContent = (netProfit >= 0 ? "+" : "") + formatMoney(netProfit);
    dom.kpiNdr.textContent = state.tier === "enterprise" ? "128.4%" : state.tier === "pro" ? "112.6%" : "118.2%";
    dom.kpiRunway.textContent = netProfit > 0 ? "Cash-Flow +" : "26 Mos";

    if (chart) chart.setData(series);

    // Revenue mix breakdown from latest full month
    const rawLatest = Data.MONTHLY_SERIES[Data.MONTHLY_SERIES.length - 1];
    const totalFull = rawLatest.enterprise + rawLatest.pro + rawLatest.starter;
    const segments = [
      { label: "Enterprise Annual", val: rawLatest.enterprise, color: "var(--accent)" },
      { label: "Pro Team", val: rawLatest.pro, color: "var(--blue)" },
      { label: "Starter Self-Serve", val: rawLatest.starter, color: "var(--amber)" }
    ];

    dom.mixList.innerHTML = "";
    segments.forEach(function (seg) {
      const pct = Math.round((seg.val / totalFull) * 100);
      const row = document.createElement("div");
      row.className = "mix-row";

      const head = document.createElement("div");
      head.className = "mix-row__head";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = seg.label;
      const valSpan = document.createElement("span");
      valSpan.className = "mono";
      valSpan.textContent = formatMoney(seg.val) + " (" + pct + "%)";
      head.appendChild(nameSpan);
      head.appendChild(valSpan);

      const track = document.createElement("div");
      track.className = "mix-track";
      const fill = document.createElement("div");
      fill.className = "mix-fill";
      fill.style.width = pct + "%";
      fill.style.background = seg.color;
      track.appendChild(fill);

      row.appendChild(head);
      row.appendChild(track);
      dom.mixList.appendChild(row);
    });
  }

  function getFilteredTransactions() {
    const q = state.search.trim().toLowerCase();
    return state.transactions
      .filter(function (tx) {
        const tierOk = state.tier === "all" || tx.tier.toLowerCase() === state.tier;
        const statusOk = state.statusFilter === "all" || tx.status.toLowerCase() === state.statusFilter;
        const searchOk =
          !q ||
          tx.customer.toLowerCase().includes(q) ||
          tx.id.toLowerCase().includes(q) ||
          tx.tier.toLowerCase().includes(q);
        return tierOk && statusOk && searchOk;
      })
      .slice()
      .sort(function (a, b) {
        const dir = state.sortDir === "asc" ? 1 : -1;
        if (state.sortField === "amount") return (a.amount - b.amount) * dir;
        return a.date.localeCompare(b.date) * dir;
      });
  }

  function renderTransactions() {
    const rows = getFilteredTransactions();
    dom.txBody.innerHTML = "";

    if (rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.style.textAlign = "center";
      td.style.color = "var(--ink-muted)";
      td.textContent = "No matching ledger entries found.";
      tr.appendChild(td);
      dom.txBody.appendChild(tr);
      return;
    }

    rows.forEach(function (tx) {
      const tr = document.createElement("tr");
      const c1 = document.createElement("td");
      c1.className = "mono";
      c1.textContent = tx.id;

      const c2 = document.createElement("td");
      c2.textContent = tx.customer;

      const c3 = document.createElement("td");
      c3.textContent = tx.tier;

      const c4 = document.createElement("td");
      c4.className = "mono";
      c4.textContent = tx.date;

      const c5 = document.createElement("td");
      c5.style.display = "flex";
      c5.style.justifyContent = "space-between";
      c5.style.alignItems = "center";
      c5.style.gap = "0.6rem";

      const amt = document.createElement("span");
      amt.className = "mono";
      amt.textContent = formatMoney(tx.amount);

      const badge = document.createElement("span");
      badge.className = "status-badge status-badge--" + tx.status.toLowerCase();
      badge.textContent = tx.status;

      c5.appendChild(amt);
      c5.appendChild(badge);
      tr.appendChild(c1);
      tr.appendChild(c2);
      tr.appendChild(c3);
      tr.appendChild(c4);
      tr.appendChild(c5);
      dom.txBody.appendChild(tr);
    });
  }

  function exportCsv() {
    const rows = getFilteredTransactions();
    const lines = ["Invoice,Customer,Tier,Date,Amount,Status"];
    rows.forEach(function (r) {
      lines.push([r.id, '"' + r.customer.replace(/"/g, '""') + '"', r.tier, r.date, r.amount, r.status].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledgerflow_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Exported " + rows.length + " rows to CSV");
  }

  /* Command Palette */
  const COMMANDS = [
    { label: "Range: Last 12 Months", hint: "Filter", run: function () { setRange("12m"); } },
    { label: "Range: Last 90 Days (3M)", hint: "Filter", run: function () { setRange("3m"); } },
    { label: "Filter: Enterprise Tier Only", hint: "Segment", run: function () { setTier("enterprise"); } },
    { label: "Filter: All Customer Tiers", hint: "Segment", run: function () { setTier("all"); } },
    { label: "Add New Invoice Entry", hint: "Action", run: function () { openModal(dom.entryModal); } },
    { label: "Export Ledger as CSV", hint: "Download", run: exportCsv },
    { label: "Toggle Light / Dark Theme", hint: "Theme", run: function () { applyTheme(state.theme === "dark" ? "light" : "dark"); } }
  ];

  function renderCmdList(query) {
    const q = (query || "").trim().toLowerCase();
    dom.cmdList.innerHTML = "";
    COMMANDS.filter(function (c) {
      return !q || c.label.toLowerCase().includes(q);
    }).forEach(function (cmd) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cmd-item";
      const lbl = document.createElement("span");
      lbl.textContent = cmd.label;
      const hint = document.createElement("span");
      hint.className = "kbd";
      hint.textContent = cmd.hint;
      btn.appendChild(lbl);
      btn.appendChild(hint);
      btn.addEventListener("click", function () {
        closeModal(dom.cmdModal);
        cmd.run();
      });
      dom.cmdList.appendChild(btn);
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    const firstInput = modal.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function setRange(range) {
    state.range = range;
    dom.rangeBtns.forEach(function (btn) {
      const active = btn.dataset.range === range;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    renderMetricsAndCharts();
  }

  function setTier(tier) {
    state.tier = tier;
    if (dom.tierSelect) dom.tierSelect.value = tier;
    renderMetricsAndCharts();
    renderTransactions();
  }

  function bindEvents() {
    if (dom.mobileNavBtn && dom.sidebar) {
      dom.mobileNavBtn.addEventListener("click", function () {
        dom.sidebar.classList.toggle("is-open");
      });
    }
    if (dom.themeToggle) {
      dom.themeToggle.addEventListener("click", function () {
        applyTheme(state.theme === "dark" ? "light" : "dark");
      });
    }
    dom.rangeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () { setRange(btn.dataset.range); });
    });
    if (dom.tierSelect) {
      dom.tierSelect.addEventListener("change", function () { setTier(dom.tierSelect.value); });
    }
    if (dom.txSearch) {
      dom.txSearch.addEventListener("input", function () {
        state.search = dom.txSearch.value;
        renderTransactions();
      });
    }
    if (dom.txStatus) {
      dom.txStatus.addEventListener("change", function () {
        state.statusFilter = dom.txStatus.value;
        renderTransactions();
      });
    }
    dom.sortBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const field = btn.dataset.sort;
        if (state.sortField === field) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortField = field;
          state.sortDir = "desc";
        }
        renderTransactions();
      });
    });

    if (dom.exportCsvBtn) dom.exportCsvBtn.addEventListener("click", exportCsv);
    if (dom.openEntryBtn) dom.openEntryBtn.addEventListener("click", function () { openModal(dom.entryModal); });
    if (dom.closeEntryBtn) dom.closeEntryBtn.addEventListener("click", function () { closeModal(dom.entryModal); });
    if (dom.entryModal) {
      dom.entryModal.addEventListener("click", function (ev) {
        if (ev.target === dom.entryModal) closeModal(dom.entryModal);
      });
    }

    if (dom.entryForm) {
      dom.entryForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const fd = new FormData(dom.entryForm);
        const customer = String(fd.get("customer") || "").trim();
        const amount = Number(fd.get("amount"));
        if (!customer || !amount || amount <= 0) return;

        const nextId = "INV-" + (9043 + state.transactions.length);
        state.transactions.unshift({
          id: nextId,
          customer: customer,
          tier: String(fd.get("tier") || "Pro"),
          date: new Date().toISOString().slice(0, 10),
          amount: Math.round(amount),
          status: String(fd.get("status") || "Paid")
        });
        safeSet(STORAGE_TX, state.transactions);
        dom.entryForm.reset();
        closeModal(dom.entryModal);
        renderTransactions();
        showToast("Recorded invoice " + nextId);
      });
    }

    if (dom.cmdTrigger) {
      dom.cmdTrigger.addEventListener("click", function () {
        renderCmdList("");
        openModal(dom.cmdModal);
      });
    }
    if (dom.closeCmdBtn) dom.closeCmdBtn.addEventListener("click", function () { closeModal(dom.cmdModal); });
    if (dom.cmdModal) {
      dom.cmdModal.addEventListener("click", function (ev) {
        if (ev.target === dom.cmdModal) closeModal(dom.cmdModal);
      });
    }
    if (dom.cmdInput) {
      dom.cmdInput.addEventListener("input", function () {
        renderCmdList(dom.cmdInput.value);
      });
    }

    document.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        renderCmdList("");
        openModal(dom.cmdModal);
      } else if (ev.key === "Escape") {
        closeModal(dom.cmdModal);
        closeModal(dom.entryModal);
        if (dom.sidebar) dom.sidebar.classList.remove("is-open");
      }
    });
  }

  function init() {
    cacheDom();
    chart = global.LedgerCharts.createRevenueChart(dom.chartCanvas, dom.chartTooltip);
    applyTheme(state.theme);
    renderMetricsAndCharts();
    renderTransactions();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
