/* ==========================================================================
   LedgerFlow — Financial Time-Series, Segments & Ledger Dataset
   ========================================================================== */

(function (global) {
  "use strict";

  const MONTHLY_SERIES = [
    { month: "Dec", enterprise: 38200, pro: 22400, starter: 8900, expenses: 46100 },
    { month: "Jan", enterprise: 41600, pro: 23800, starter: 9300, expenses: 47200 },
    { month: "Feb", enterprise: 44100, pro: 25100, starter: 9800, expenses: 48400 },
    { month: "Mar", enterprise: 47900, pro: 26700, starter: 10200, expenses: 49900 },
    { month: "Apr", enterprise: 51200, pro: 28400, starter: 10700, expenses: 51200 },
    { month: "May", enterprise: 55800, pro: 30100, starter: 11300, expenses: 52800 },
    { month: "Jun", enterprise: 59400, pro: 31900, starter: 11800, expenses: 54100 },
    { month: "Jul", enterprise: 62700, pro: 33400, starter: 12100, expenses: 55300 },
    { month: "Aug", enterprise: 66900, pro: 35200, starter: 12600, expenses: 56800 },
    { month: "Sep", enterprise: 71400, pro: 37100, starter: 13200, expenses: 58200 },
    { month: "Oct", enterprise: 75800, pro: 39400, starter: 13900, expenses: 59700 },
    { month: "Nov", enterprise: 81200, pro: 41800, starter: 14600, expenses: 61400 }
  ];

  const TRANSACTIONS = [
    { id: "INV-9042", customer: "Kestrel Robotics", tier: "Enterprise", date: "2026-11-15", amount: 4800, status: "Paid" },
    { id: "INV-9041", customer: "Northstar Cloud", tier: "Pro", date: "2026-11-14", amount: 780, status: "Paid" },
    { id: "INV-9040", customer: "Vesper Acoustic Lab", tier: "Enterprise", date: "2026-11-12", amount: 3600, status: "Paid" },
    { id: "INV-9039", customer: "Helios Health AI", tier: "Enterprise", date: "2026-11-10", amount: 5200, status: "Pending" },
    { id: "INV-9038", customer: "Studio Forma", tier: "Pro", date: "2026-11-08", amount: 490, status: "Paid" },
    { id: "INV-9037", customer: "Boreal Logistics", tier: "Pro", date: "2026-11-06", amount: 640, status: "Refunded" },
    { id: "INV-9036", customer: "Aether Compute", tier: "Enterprise", date: "2026-11-04", amount: 6400, status: "Paid" },
    { id: "INV-9035", customer: "Mosaic Research", tier: "Starter", date: "2026-11-02", amount: 149, status: "Paid" },
    { id: "INV-9034", customer: "Solstice Commerce", tier: "Pro", date: "2026-10-29", amount: 920, status: "Paid" },
    { id: "INV-9033", customer: "Pulse Telemetry", tier: "Starter", date: "2026-10-25", amount: 199, status: "Pending" }
  ];

  global.LedgerData = {
    MONTHLY_SERIES: MONTHLY_SERIES,
    TRANSACTIONS: TRANSACTIONS
  };
})(window);
