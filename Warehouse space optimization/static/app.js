/* =====================================================
   Smart Warehouse Space Optimization — app.js
   ===================================================== */

const API = "http://127.0.0.1:5000";   // Flask backend

/* ──────────────────────────────────────────────────────
   State
   ────────────────────────────────────────────────────── */
let warehouseCapacity = 0;
let items = [];                 // { name, weight, category, value }
let wvChart = null;             // Chart.js instance

/* Category tiebreak order hint for display (mirrors backend) */
const CATEGORY_HINT = {
  Food:        { text: "🌾 Essential supply — suggested value: 80–100", min: 80 },
  Medicine:    { text: "💊 Critical stock — suggested value: 70–100",   min: 70 },
  Electronics: { text: "💡 Valuable item — suggested value: 40–70",    min: 40 },
  Others:      { text: "📦 General item — suggested value: 1–40",      min: 1  }
};

/* ──────────────────────────────────────────────────────
   STEP 1: Set Warehouse Capacity
   ────────────────────────────────────────────────────── */
function setCapacity () {
  const inp = document.getElementById("capacity-input");
  const val = parseInt(inp.value, 10);

  if (!val || val <= 0) {
    showToast("⚠️ Please enter a valid capacity (> 0)", "error");
    inp.focus();
    return;
  }

  warehouseCapacity = val;

  /* Update UI */
  document.getElementById("capacity-badge").textContent = val + " units";
  document.getElementById("capacity-summary").textContent  = val + " units";

  /* Progress indicators */
  stepDone(1);
  stepActive(2);

  /* Show step 2, hide step 1 (smooth) */
  hideCard("step1-card");
  showCard("step2-card");

  showToast(`✅ Capacity set to ${val} units`, "success");
}

function resetCapacity () {
  hideCard("step2-card");
  hideCard("step3-card");
  showCard("step1-card");
  stepActive(1);
  stepReset(2); stepReset(3);
}

/* ──────────────────────────────────────────────────────
   STEP 2: Add Item
   ────────────────────────────────────────────────────── */
function addItem (evt) {
  evt.preventDefault();

  const name     = document.getElementById("item-name").value.trim();
  const weight   = parseInt(document.getElementById("item-weight").value, 10);
  const category = document.getElementById("item-category").value;
  const value    = parseInt(document.getElementById("item-value").value, 10);

  if (!name)                    return showToast("⚠️ Item name is required", "error");
  if (!weight || weight <= 0)   return showToast("⚠️ Enter a valid weight", "error");
  if (!category)                return showToast("⚠️ Select a category", "error");
  if (!value  || value  <= 0)   return showToast("⚠️ Enter a valid value (> 0)", "error");

  const item = { name, weight, category, value };

  items.push(item);
  renderItemTable();
  updateOptimizeSummary();

  /* Reset form */
  document.getElementById("item-form").reset();
  document.getElementById("priority-note").textContent = "";
  /* Reset placeholder-active on selects after reset */
  document.getElementById("item-category").classList.add("placeholder-active");

  showToast(`📦 "${name}" added successfully`, "success");
  document.getElementById("item-name").focus();
}

/* ──────────────────────────────────────────────────────
   Delete a single item
   ────────────────────────────────────────────────────── */
function deleteItem (index) {
  const removed = items.splice(index, 1);
  renderItemTable();
  updateOptimizeSummary();
  showToast(`🗑️ "${removed[0].name}" removed`, "");
}

/* ──────────────────────────────────────────────────────
   Clear all items
   ────────────────────────────────────────────────────── */
function clearItems () {
  if (!items.length) return;
  items = [];
  renderItemTable();
  updateOptimizeSummary();
  hideCard("step3-card");
  showToast("🗑️ All items cleared", "");
}

/* ──────────────────────────────────────────────────────
   Render Item Table (Step 2)
   ────────────────────────────────────────────────────── */
function renderItemTable () {
  const empty  = document.getElementById("empty-state");
  const table  = document.getElementById("items-table");
  const tbody  = document.getElementById("items-tbody");
  const badge  = document.getElementById("item-count-badge");
  const clearB = document.getElementById("clear-items-btn");
  const optSec = document.getElementById("optimize-section");

  badge.textContent = items.length + " item" + (items.length !== 1 ? "s" : "");

  if (items.length === 0) {
    empty.classList.remove("hidden");
    table.classList.add("hidden");
    clearB.style.display = "none";
    optSec.style.display  = "none";
    return;
  }

  empty.classList.add("hidden");
  table.classList.remove("hidden");
  clearB.style.display = "inline-flex";
  optSec.style.display  = "flex";

  tbody.innerHTML = items.map((it, i) => `
    <tr class="hover:bg-surface-container-low/50 transition-colors">
      <td class="px-4 py-3 text-outline">${i + 1}</td>
      <td class="px-4 py-3 font-medium text-on-surface">${escHtml(it.name)}</td>
      <td class="px-4 py-3 text-on-surface-variant">${it.weight} units</td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">${escHtml(it.category)}</span>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-1 text-tertiary">
          <span class="font-bold">${it.value}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-right">
        <button onclick="deleteItem(${i})" class="text-outline hover:text-error transition-colors p-1 rounded-md hover:bg-error-container/50">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </td>
    </tr>
  `).join("");
}

/* ──────────────────────────────────────────────────────
   Update Optimize Summary Bar
   ────────────────────────────────────────────────────── */
function updateOptimizeSummary () {
  document.getElementById("optimize-section").style.display = items.length > 0 ? "flex" : "none";
  document.getElementById("total-items-count").textContent = items.length;
  const tw = items.reduce((s, it) => s + it.weight, 0);
  document.getElementById("total-weight-count").textContent = tw + " units";
  document.getElementById("optimize-section").style.display = items.length > 0 ? "flex" : "none";
}

/* ──────────────────────────────────────────────────────
   Show category hint (suggested value range)
   ────────────────────────────────────────────────────── */
function showCategoryHint () {
  /* No hints or auto-fill — just manage placeholder styling on the select */
  const catSel = document.getElementById("item-category");
  const note   = document.getElementById("priority-note");
  if (catSel.value) {
    catSel.classList.remove("placeholder-active");
  } else {
    catSel.classList.add("placeholder-active");
  }
  note.textContent = "";
}

/* ──────────────────────────────────────────────────────
   STEP 3: Optimize Storage via API
   ────────────────────────────────────────────────────── */
async function optimizeStorage () {
  if (items.length === 0) {
    showToast("⚠️ Please add at least one item first", "error");
    return;
  }

  const btn = document.getElementById("optimize-btn");
  btn.classList.add("btn-loading");
  btn.disabled = true;

  try {
    const resp = await fetch(`${API}/api/optimize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ capacity: warehouseCapacity, items })
    });

    if (!resp.ok) throw new Error("Server error: " + resp.status);
    const data = await resp.json();
    renderResults(data);

    stepDone(2);
    stepActive(3);
    showCard("step3-card");

    /* Scroll to results */
    setTimeout(() => {
      document.getElementById("step3-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);

  } catch (err) {
    showToast("❌ Failed to connect to server. Is Flask running?", "error");
    console.error(err);
  } finally {
    btn.classList.remove("btn-loading");
    btn.disabled = false;
  }
}

/* ──────────────────────────────────────────────────────
   Render Results (Step 3)
   ────────────────────────────────────────────────────── */
function renderResults (data) {
  const { results, total_weight, remaining_capacity, total_value, capacity } = data;

  /* Stats */
  document.getElementById("stat-total-weight").textContent   = total_weight + " u";
  document.getElementById("stat-remaining").textContent      = remaining_capacity + " u";
  document.getElementById("stat-total-value").textContent    = total_value;
  const selectedCount = results.filter(r => r.selected).length;
  document.getElementById("stat-selected-count").textContent = selectedCount + "/" + results.length;

  /* Capacity bar */
  const pct = capacity > 0 ? Math.min(100, (total_weight / capacity) * 100) : 0;
  document.getElementById("capacity-bar-fill").style.width = pct + "%";
  document.getElementById("capacity-percent-text").textContent = pct.toFixed(1) + "%";

  /* Results Table */
  const tbody = document.getElementById("results-tbody");
  tbody.innerHTML = results.map(r => r.selected ? `
    <tr class="border-b border-surface-dim/20 hover:bg-surface-container-low/30 transition-colors group">
      <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary-fixed text-on-secondary-fixed text-label-sm">
               <span class="w-1.5 h-1.5 rounded-full bg-surface-tint"></span>Selected
          </span>
      </td>
      <td class="px-6 py-4 font-medium text-on-surface">${escHtml(r.name)}</td>
      <td class="px-6 py-4 text-right font-headline text-on-surface">${r.weight}</td>
      <td class="px-6 py-4 text-on-surface-variant">${escHtml(r.category)}</td>
      <td class="px-6 py-4 text-right font-headline text-primary font-semibold">${r.value}</td>
      <td class="px-6 py-4 text-on-surface-variant text-sm">${escHtml(r.reason)}</td>
    </tr>
  ` : `
    <tr class="hover:bg-surface-container-low/30 transition-colors group bg-surface-dim/10">
      <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-error-container text-on-error-container text-label-sm">
               <span class="w-1.5 h-1.5 rounded-full bg-error"></span>Rejected
          </span>
      </td>
      <td class="px-6 py-4 font-medium text-on-surface-variant">${escHtml(r.name)}</td>
      <td class="px-6 py-4 text-right font-headline text-on-surface-variant line-through">${r.weight}</td>
      <td class="px-6 py-4 text-on-surface-variant">${escHtml(r.category)}</td>
      <td class="px-6 py-4 text-right font-headline text-on-surface-variant">${r.value}</td>
      <td class="px-6 py-4 text-error text-sm">${escHtml(r.reason)}</td>
    </tr>
  `).join("");

  /* Chart */
  renderChart(results);
}

/* ──────────────────────────────────────────────────────
   Chart.js — Weight vs Priority
   ────────────────────────────────────────────────────── */
function renderChart (results) {
  const ctx = document.getElementById("wv-chart").getContext("2d");

  if (wvChart) { wvChart.destroy(); wvChart = null; }

  const labels = results.map(r => r.name);
  const weights = results.map(r => r.weight);
  const values  = results.map(r => r.value);
  const bgs     = results.map(r => r.selected
    ? "rgba(34,197,94,0.75)"
    : "rgba(239,68,68,0.55)"
  );
  const borders = results.map(r => r.selected
    ? "rgba(34,197,94,1)"
    : "rgba(239,68,68,1)"
  );

  wvChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label:           "Weight (units)",
          data:            weights,
          backgroundColor: bgs,
          borderColor:     borders,
          borderWidth:     1.5,
          borderRadius:    5,
          yAxisID:         "y"
        },
        {
          label:           "Value (priority / importance / profit)",
          data:            values,
          type:            "line",
          borderColor:     "rgba(37,99,235,1)",
          backgroundColor: "rgba(37,99,235,0.08)",
          pointBackgroundColor: "rgba(37,99,235,1)",
          pointRadius:     5,
          tension:         0.4,
          fill:            true,
          yAxisID:         "y2"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#475569", font: { family: "Inter", size: 12 } }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          titleColor: "#0f172a",
          bodyColor:  "#475569",
          boxShadow:  "0 4px 12px rgba(0,0,0,0.08)"
        }
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { family: "Inter", size: 11 } },
          grid:  { color: "rgba(0,0,0,0.06)" }
        },
        y: {
          position: "left",
          title: { display: true, text: "Weight (units)", color: "#94a3b8", font: { size: 11 } },
          ticks: { color: "#475569" },
          grid:  { color: "rgba(0,0,0,0.06)" }
        },
        y2: {
          position: "right",
          title: { display: true, text: "Value", color: "#94a3b8", font: { size: 11 } },
          ticks: { color: "#2563eb" },
          grid:  { display: false }
        }
      }
    }
  });
}

/* ──────────────────────────────────────────────────────
   Navigation helpers
   ────────────────────────────────────────────────────── */
function addMoreItems () {
  stepReset(3); stepDone(1); stepActive(2);
  hideCard("step3-card");
  document.getElementById("step2-card").scrollIntoView({ behavior: "smooth" });
}

function startFresh () {
  items = [];
  warehouseCapacity = 0;
  if (wvChart) { wvChart.destroy(); wvChart = null; }

  document.getElementById("capacity-input").value = "";
  document.getElementById("item-form").reset();
  document.getElementById("items-tbody").innerHTML = "";
  document.getElementById("results-tbody").innerHTML = "";
  document.getElementById("empty-state").classList.remove("hidden");
  document.getElementById("items-table").classList.add("hidden");
  document.getElementById("optimize-section").style.display = "none";
  document.getElementById("clear-items-btn").style.display = "none";
  document.getElementById("item-count-badge").textContent = "0 items";
  document.getElementById("priority-note").textContent = "";
  document.getElementById("item-category").classList.add("placeholder-active");

  stepActive(1); stepReset(2); stepReset(3);
  hideCard("step2-card");
  hideCard("step3-card");
  showCard("step1-card");
  document.getElementById("step1-card").scrollIntoView({ behavior: "smooth" });
  showToast("🔄 Reset complete — start fresh!", "success");
}

/* ──────────────────────────────────────────────────────
   Step indicator helpers
   ────────────────────────────────────────────────────── */
function stepActive (n) {
  const el = document.getElementById(`step-num-${n}`);
  if (!el) return;
  el.classList.add("active"); el.classList.remove("done");
  const lbl = document.getElementById(`step-label-${n}`);
  if (lbl) { lbl.classList.add("active"); lbl.classList.remove("done"); }
}
function stepDone (n) {
  const el = document.getElementById(`step-num-${n}`);
  if (!el) return;
  el.classList.remove("active"); el.classList.add("done");
  el.textContent = "✓";
  document.getElementById(`step-line-${n}`)?.classList.add("done");
  const lbl = document.getElementById(`step-label-${n}`);
  if (lbl) { lbl.classList.remove("active"); lbl.classList.add("done"); }
}
function stepReset (n) {
  const el = document.getElementById(`step-num-${n}`);
  if (!el) return;
  el.classList.remove("active", "done");
  el.textContent = n;
  document.getElementById(`step-line-${n}`)?.classList.remove("done");
  const lbl = document.getElementById(`step-label-${n}`);
  if (lbl) { lbl.classList.remove("active", "done"); }
}

/* ──────────────────────────────────────────────────────
   Card visibility helpers
   ────────────────────────────────────────────────────── */
function showCard (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.style.animation = "none";
  void el.offsetWidth; // reflow
  el.style.animation = "";
}
function hideCard (id) {
  document.getElementById(id)?.classList.add("hidden");
}

/* ──────────────────────────────────────────────────────
   Toast notifications
   ────────────────────────────────────────────────────── */
let toastTimer = null;
function showToast (msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); }, 3200);
}

/* ──────────────────────────────────────────────────────
   Utility: HTML escape
   ────────────────────────────────────────────────────── */
function escHtml (str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ──────────────────────────────────────────────────────
   Utility: Value badge (numeric display)
   ────────────────────────────────────────────────────── */
function priorityBadge (v) {
  /* Show a colored numeric badge based on value range */
  const n = Number(v);
  let cls = "p-low";
  if (n >= 70)      cls = "p-high";
  else if (n >= 40) cls = "p-medium";
  return `<span class="priority-badge ${cls}">⭐ ${n}</span>`;
}

function categoryEmoji (cat) {
  const map = { Food: "🌾", Medicine: "💊", Electronics: "💡", Others: "📦" };
  return map[cat] || "📦";
}

/* ──────────────────────────────────────────────────────
   Enter key on capacity input
   ────────────────────────────────────────────────────── */
document.getElementById("capacity-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); setCapacity(); }
});

/* ──────────────────────────────────────────────────────
   Help Modal Logic
   ────────────────────────────────────────────────────── */
function openHelpModal() {
  document.getElementById("help-modal").classList.remove("hidden");
}

function closeHelpModal() {
  document.getElementById("help-modal").classList.add("hidden");
}
