// ===== Currency =====
function formatIDR(amount) {
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}

// ===== Constants & State =====
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Bills', 'Income', 'Other'];
const CATEGORY_COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#a855f7','#f97316','#84cc16'];

let transactions = [];
let categories = [];
let spendingLimit = 0;

// ===== Storage =====
function save() {
  localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
  localStorage.setItem('ebv_categories', JSON.stringify(categories));
  localStorage.setItem('ebv_limit', spendingLimit);
}

function load() {
  transactions = JSON.parse(localStorage.getItem('ebv_transactions') || '[]');
  categories = JSON.parse(localStorage.getItem('ebv_categories') || 'null') || [...DEFAULT_CATEGORIES];
  spendingLimit = parseFloat(localStorage.getItem('ebv_limit') || '0');
}

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('ebv_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeToggle').textContent = saved === 'dark' ? '☀️' : '🌙';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ebv_theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
});

// ===== Category Dropdown =====
function renderCategoryOptions() {
  const select = document.getElementById('txCategory');
  const current = select.value;
  select.innerHTML = '<option value="">Select category</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

// ===== Add Category Modal =====
document.getElementById('addCategoryBtn').addEventListener('click', () => {
  document.getElementById('categoryModal').classList.remove('hidden');
  document.getElementById('newCategoryInput').value = '';
  document.getElementById('newCategoryInput').focus();
});

document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
  document.getElementById('categoryModal').classList.add('hidden');
});

document.getElementById('saveCategoryBtn').addEventListener('click', () => {
  const val = document.getElementById('newCategoryInput').value.trim();
  if (!val) return;
  if (!categories.includes(val)) {
    categories.push(val);
    save();
    renderCategoryOptions();
  }
  document.getElementById('txCategory').value = val;
  document.getElementById('categoryModal').classList.add('hidden');
});

// ===== Spending Limit =====
document.getElementById('setLimitBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('spendingLimit').value);
  if (!isNaN(val) && val >= 0) {
    spendingLimit = val;
    save();
    renderAll();
  }
});

function updateLimitUI() {
  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const limitInput = document.getElementById('spendingLimit');
  const limitInfo = document.getElementById('limitInfo');
  const limitAlert = document.getElementById('limitAlert');

  if (spendingLimit > 0) {
    limitInput.value = spendingLimit;
    const remaining = spendingLimit - totalExpenses;
    limitInfo.textContent = remaining >= 0
      ? formatIDR(remaining) + ' remaining of ' + formatIDR(spendingLimit) + ' limit'
      : 'Over limit by ' + formatIDR(Math.abs(remaining));
    limitAlert.classList.toggle('hidden', remaining >= 0);
  } else {
    limitInfo.textContent = '';
    limitAlert.classList.add('hidden');
  }
}

// ===== Balance =====
function updateBalance() {
  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expenses;

  document.getElementById('balanceAmount').textContent = formatIDR(balance);
  document.getElementById('incomeTotal').textContent = '+' + formatIDR(income);
  document.getElementById('expenseTotal').textContent = '-' + formatIDR(expenses);
}

// ===== Chart =====
function drawChart() {
  const canvas = document.getElementById('categoryChart');
  const ctx = canvas.getContext('2d');
  const legend = document.getElementById('chartLegend');

  // Aggregate expenses by category
  const data = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    const cat = t.category || 'Other';
    data[cat] = (data[cat] || 0) + Math.abs(t.amount);
  });

  const keys = Object.keys(data);
  const values = keys.map(k => data[k]);
  const total = values.reduce((s, v) => s + v, 0);

  // Set canvas size
  const size = Math.min(canvas.parentElement.clientWidth - 40, 220);
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  if (total === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expense data yet', size / 2, size / 2);
    legend.innerHTML = '';
    return;
  }

  // Draw donut chart
  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.22;
  let startAngle = -Math.PI / 2;

  keys.forEach((key, i) => {
    const slice = (values[i] / total) * 2 * Math.PI;
    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#1a1a2e' : '#ffffff';
  ctx.fill();

  // Center text
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1e1e2e';
  ctx.font = 'bold ' + Math.round(size * 0.07) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatIDR(total), cx, cy);

  // Legend
  legend.innerHTML = keys.map((key, i) => (
    '<div class="legend-item">' +
    '<div class="legend-dot" style="background:' + CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '"></div>' +
    '<span>' + key + ' (' + ((values[i] / total) * 100).toFixed(0) + '%)</span>' +
    '</div>'
  )).join('');
}

// ===== Transaction List =====
function getSortedTransactions() {
  const sort = document.getElementById('sortSelect').value;
  const list = [...transactions];
  switch (sort) {
    case 'date-asc':    return list.sort((a, b) => a.date.localeCompare(b.date));
    case 'date-desc':   return list.sort((a, b) => b.date.localeCompare(a.date));
    case 'amount-desc': return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    case 'amount-asc':  return list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
    case 'category':    return list.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    default:            return list;
  }
}

function getCategoryIcon(category) {
  const icons = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍️', Health: '💊',
    Entertainment: '🎬', Bills: '📄', Income: '💰', Other: '📦'
  };
  return icons[category] || '💳';
}

function renderTransactions() {
  const list = document.getElementById('txList');
  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    return;
  }

  // Highlight expense transactions that push total over limit
  let runningExpense = 0;
  const expenseOrder = [...transactions]
    .filter(t => t.amount < 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const overLimitIds = new Set();
  if (spendingLimit > 0) {
    expenseOrder.forEach(t => {
      runningExpense += Math.abs(t.amount);
      if (runningExpense > spendingLimit) overLimitIds.add(t.id);
    });
  }

  list.innerHTML = sorted.map(tx => {
    const isIncome = tx.amount > 0;
    const isOver = overLimitIds.has(tx.id);
    return (
      '<li class="tx-item' + (isOver ? ' over-limit' : '') + '">' +
        '<div class="tx-icon ' + (isIncome ? 'income' : 'expense') + '">' +
          getCategoryIcon(tx.category) +
        '</div>' +
        '<div class="tx-info">' +
          '<div class="tx-desc">' + escapeHtml(tx.description) + '</div>' +
          '<div class="tx-meta">' + (tx.category || 'Uncategorized') + ' · ' + tx.date + '</div>' +
        '</div>' +
        '<span class="tx-amount ' + (isIncome ? 'income' : 'expense') + '">' +
          (isIncome ? '+' : '-') + formatIDR(Math.abs(tx.amount)) +
        '</span>' +
        '<button class="tx-delete" data-id="' + tx.id + '" aria-label="Delete transaction">✕</button>' +
      '</li>'
    );
  }).join('');

  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Add Transaction =====
document.getElementById('transactionForm').addEventListener('submit', e => {
  e.preventDefault();
  const desc = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value || 'Other';
  const date = document.getElementById('txDate').value;

  if (!desc || isNaN(amount) || !date) return;

  transactions.push({ id: Date.now().toString(), description: desc, amount, category, date });
  save();
  renderAll();
  e.target.reset();
  document.getElementById('txDate').value = todayStr();
});

// ===== Delete Transaction =====
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  renderAll();
}

// ===== Sort =====
document.getElementById('sortSelect').addEventListener('change', renderTransactions);

// ===== Render All =====
function renderAll() {
  updateBalance();
  updateLimitUI();
  drawChart();
  renderTransactions();
}

// ===== Helpers =====
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===== Init =====
function init() {
  load();
  initTheme();
  renderCategoryOptions();
  document.getElementById('txDate').value = todayStr();
  renderAll();
}

init();
