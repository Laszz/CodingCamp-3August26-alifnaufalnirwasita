/**
 * Expense & Budget Visualizer — app.js
 * Architecture: Storage → State → Utilities → Rendering → Chart → Theme → Navigation → Events
 */

'use strict';

/* ============================================================
   1. STORAGE
   ============================================================ */
const Storage = (() => {
  const KEYS = {
    transactions: 'budgetviz_transactions',
    theme: 'budgetviz_theme',
  };

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.transactions)) || [];
    } catch {
      return [];
    }
  }

  function saveTransactions(transactions) {
    localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
  }

  function getTheme() {
    return localStorage.getItem(KEYS.theme) || 'light';
  }

  function saveTheme(theme) {
    localStorage.setItem(KEYS.theme, theme);
  }

  function clearAll() {
    localStorage.removeItem(KEYS.transactions);
  }

  return { getTransactions, saveTransactions, getTheme, saveTheme, clearAll };
})();


/* ============================================================
   2. STATE
   ============================================================ */
const State = (() => {
  let transactions = [];
  let activeScreen = 'dashboard';
  let searchQuery = '';
  let sortOrder = 'date-desc';

  function getTransactions() { return transactions; }
  function setTransactions(data) { transactions = data; }

  function addTransaction(tx) { transactions.unshift(tx); }
  function removeTransaction(id) {
    transactions = transactions.filter(tx => tx.id !== id);
  }

  function getActiveScreen() { return activeScreen; }
  function setActiveScreen(screen) { activeScreen = screen; }

  function getSearchQuery() { return searchQuery; }
  function setSearchQuery(q) { searchQuery = q; }

  function getSortOrder() { return sortOrder; }
  function setSortOrder(order) { sortOrder = order; }

  return {
    getTransactions, setTransactions,
    addTransaction, removeTransaction,
    getActiveScreen, setActiveScreen,
    getSearchQuery, setSearchQuery,
    getSortOrder, setSortOrder,
  };
})();


/* ============================================================
   3. UTILITIES
   ============================================================ */
const Utils = (() => {
  function generateId() {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function formatCurrency(amount) {
    return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function getCategorySlug(category) {
    const map = {
      'Food': 'food',
      'Transport': 'transport',
      'Fun': 'fun',
    };
    return map[category] || 'other';
  }

  function getCategoryIcon(category) {
    const icons = {
      'Food': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
      'Transport': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2Z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M3 12h18"/></svg>`,
      'Fun': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="17" y1="13" y2="13"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`,
    };
    return icons[category] || `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  }

  function getTotalAmount(transactions) {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  function groupByCategory(transactions) {
    return transactions.reduce((acc, tx) => {
      const cat = tx.category || 'Other';
      acc[cat] = (acc[cat] || 0) + Number(tx.amount);
      return acc;
    }, {});
  }

  function getCurrentMonthTransactions(transactions) {
    const now = new Date();
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }

  function getPrevMonthTransactions(transactions) {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function sanitizeString(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    generateId,
    formatCurrency,
    formatDate,
    getCategorySlug,
    getCategoryIcon,
    getTotalAmount,
    groupByCategory,
    getCurrentMonthTransactions,
    getPrevMonthTransactions,
    sanitizeString,
  };
})();


/* ============================================================
   4. TOAST
   ============================================================ */
const Toast = (() => {
  const container = document.getElementById('toastContainer');

  function show(message, type = 'success', duration = 3000) {
    const icons = {
      success: '✓',
      danger: '✕',
      info: 'i',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast__icon" aria-hidden="true">${icons[type] || icons.info}</span>
      <span>${Utils.sanitizeString(message)}</span>
    `;

    container.appendChild(toast);

    const timer = setTimeout(() => dismiss(toast), duration);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss(toast);
    });
  }

  function dismiss(toast) {
    toast.classList.add('is-exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  return { show };
})();


/* ============================================================
   5. DIALOG
   ============================================================ */
const Dialog = (() => {
  const overlay = document.getElementById('dialogOverlay');
  const titleEl = document.getElementById('dialogTitle');
  const messageEl = document.getElementById('dialogMessage');
  const confirmBtn = document.getElementById('dialogConfirm');
  const cancelBtn = document.getElementById('dialogCancel');

  let resolveCallback = null;

  function open(title, message) {
    return new Promise(resolve => {
      resolveCallback = resolve;
      titleEl.textContent = title;
      messageEl.textContent = message;
      overlay.hidden = false;
      cancelBtn.focus();
    });
  }

  function close(result) {
    overlay.hidden = true;
    if (resolveCallback) {
      resolveCallback(result);
      resolveCallback = null;
    }
  }

  confirmBtn.addEventListener('click', () => close(true));
  cancelBtn.addEventListener('click', () => close(false));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden && e.key === 'Escape') close(false);
  });

  return { open };
})();


/* ============================================================
   6. CHART
   ============================================================ */
const ChartManager = (() => {
  let chartInstance = null;

  const CATEGORY_COLORS = {
    Food:      '#F59E0B',
    Transport: '#3B82F6',
    Fun:       '#EC4899',
    Other:     '#8B5CF6',
  };

  function getColor(category) {
    return CATEGORY_COLORS[category] || '#8B5CF6';
  }

  function destroy() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function render(transactions) {
    const canvas = document.getElementById('expenseChart');
    const analyticsEmpty = document.getElementById('analyticsEmpty');
    const categoryBreakdown = document.getElementById('categoryBreakdown');
    const chartCenterValue = document.getElementById('chartCenterValue');

    if (!transactions.length) {
      analyticsEmpty.style.display = 'flex';
      categoryBreakdown.style.display = 'none';
      canvas.style.display = 'none';
      destroy();
      return;
    }

    analyticsEmpty.style.display = 'none';
    categoryBreakdown.style.display = 'flex';
    canvas.style.display = 'block';

    const grouped = Utils.groupByCategory(transactions);
    const total = Utils.getTotalAmount(transactions);
    const labels = Object.keys(grouped);
    const data = Object.values(grouped);
    const colors = labels.map(getColor);

    // Top category percentage for center label
    const maxVal = Math.max(...data);
    const topPct = total > 0 ? Math.round((maxVal / total) * 100) : 0;
    chartCenterValue.textContent = `${topPct}%`;

    destroy();

    const isDark = document.body.classList.contains('theme-dark');

    chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: isDark ? '#18181B' : '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        cutout: '68%',
        animation: { duration: 400, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${Utils.formatCurrency(val)} (${pct}%)`;
              },
            },
            backgroundColor: isDark ? '#18181B' : '#111827',
            titleColor: '#FFFFFF',
            bodyColor: '#A1A1AA',
            padding: 12,
            cornerRadius: 10,
            titleFont: { family: 'Inter', weight: '600', size: 13 },
            bodyFont: { family: 'Inter', size: 12 },
          },
        },
      },
    });

    renderBreakdown(grouped, total, colors, labels);
  }

  function renderBreakdown(grouped, total, colors, labels) {
    const container = document.getElementById('categoryBreakdown');
    container.innerHTML = '';

    labels.forEach((label, i) => {
      const amount = grouped[label];
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      const color = colors[i];

      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <span class="breakdown-item__dot" style="background-color: ${color};" aria-hidden="true"></span>
        <div class="breakdown-item__info">
          <span class="breakdown-item__name">${Utils.sanitizeString(label)}</span>
          <div class="breakdown-item__bar-track">
            <div class="breakdown-item__bar-fill" style="width: 0%; background-color: ${color};" data-width="${pct}"></div>
          </div>
        </div>
        <div class="breakdown-item__values">
          <span class="breakdown-item__amount">${Utils.formatCurrency(amount)}</span>
          <span class="breakdown-item__pct">${pct}%</span>
        </div>
      `;
      container.appendChild(item);
    });

    // Animate bars after DOM paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.querySelectorAll('.breakdown-item__bar-fill').forEach(bar => {
          bar.style.width = `${bar.dataset.width}%`;
        });
      });
    });
  }

  return { render, destroy, getColor };
})();


/* ============================================================
   7. RENDERING
   ============================================================ */
const Render = (() => {

  /* --- Dashboard Summary --- */
  function summaryCard() {
    const all = State.getTransactions();
    const current = Utils.getCurrentMonthTransactions(all);
    const prev = Utils.getPrevMonthTransactions(all);
    const currentTotal = Utils.getTotalAmount(current);
    const prevTotal = Utils.getTotalAmount(prev);

    document.getElementById('totalExpense').textContent = Utils.formatCurrency(currentTotal);
    document.getElementById('analyticsTotalAmount').textContent = Utils.formatCurrency(Utils.getTotalAmount(all));

    const compIcon = document.getElementById('comparisonIcon');
    const compText = document.getElementById('comparisonText');

    const ICON_UP   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
    const ICON_DOWN  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`;
    const ICON_SAME  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14"/></svg>`;

    if (prevTotal === 0) {
      compIcon.innerHTML = ICON_SAME;
      compText.textContent = 'No previous month data';
    } else {
      const diff = currentTotal - prevTotal;
      const pct = Math.abs(Math.round((diff / prevTotal) * 100));
      if (diff > 0) {
        compIcon.innerHTML = ICON_UP;
        compText.textContent = `${pct}% more than last month`;
      } else if (diff < 0) {
        compIcon.innerHTML = ICON_DOWN;
        compText.textContent = `${pct}% less than last month`;
      } else {
        compIcon.innerHTML = ICON_SAME;
        compText.textContent = 'Same as last month';
      }
    }
  }

  /* --- Build a single transaction list item element --- */
  function buildTransactionItem(tx) {
    const slug = Utils.getCategorySlug(tx.category);
    const icon = Utils.getCategoryIcon(tx.category);

    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;
    li.innerHTML = `
      <span class="transaction-item__icon transaction-item__icon--${slug}" aria-hidden="true">${icon}</span>
      <div class="transaction-item__body">
        <span class="transaction-item__name" title="${Utils.sanitizeString(tx.name)}">${Utils.sanitizeString(tx.name)}</span>
        <div class="transaction-item__meta">
          <span class="category-badge category-badge--${slug}">${Utils.sanitizeString(tx.category)}</span>
          <span class="transaction-item__date">${Utils.formatDate(tx.date)}</span>
        </div>
      </div>
      <div class="transaction-item__right">
        <span class="transaction-item__amount">${Utils.formatCurrency(tx.amount)}</span>
        <button
          class="transaction-item__delete"
          type="button"
          data-id="${tx.id}"
          aria-label="Delete ${Utils.sanitizeString(tx.name)}"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
        </button>
      </div>
    `;
    return li;
  }

  /* --- Recent Transactions (dashboard — max 5) --- */
  function recentTransactions() {
    const list = document.getElementById('recentTransactionList');
    const empty = document.getElementById('recentEmpty');
    const count = document.getElementById('recentCount');

    const recent = State.getTransactions().slice(0, 5);

    list.innerHTML = '';

    if (!recent.length) {
      empty.style.display = 'flex';
      count.textContent = '0 items';
      return;
    }

    empty.style.display = 'none';
    count.textContent = `${recent.length} item${recent.length !== 1 ? 's' : ''}`;
    recent.forEach(tx => list.appendChild(buildTransactionItem(tx)));
  }

  /* --- History Transactions (full list with search + sort) --- */
  function historyTransactions() {
    const list = document.getElementById('historyTransactionList');
    const empty = document.getElementById('historyEmpty');
    const count = document.getElementById('historyCount');

    let txs = [...State.getTransactions()];
    const query = State.getSearchQuery().toLowerCase().trim();

    if (query) {
      txs = txs.filter(tx =>
        tx.name.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    }

    const sort = State.getSortOrder();
    txs.sort((a, b) => {
      if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sort === 'date-asc')  return new Date(a.date) - new Date(b.date);
      if (sort === 'amount-desc') return b.amount - a.amount;
      if (sort === 'amount-asc')  return a.amount - b.amount;
      return 0;
    });

    list.innerHTML = '';

    if (!txs.length) {
      empty.style.display = 'flex';
      count.textContent = '0 items';
      return;
    }

    empty.style.display = 'none';
    count.textContent = `${txs.length} item${txs.length !== 1 ? 's' : ''}`;
    txs.forEach(tx => list.appendChild(buildTransactionItem(tx)));
  }

  /* --- Analytics --- */
  function analytics() {
    ChartManager.render(State.getTransactions());
    document.getElementById('analyticsTotalAmount').textContent =
      Utils.formatCurrency(Utils.getTotalAmount(State.getTransactions()));
  }

  /* --- Storage info in Settings --- */
  function storageInfo() {
    const count = State.getTransactions().length;
    const el = document.getElementById('storageInfo');
    if (el) {
      el.textContent = `${count} transaction${count !== 1 ? 's' : ''} stored locally`;
    }
  }

  /* --- Refresh everything --- */
  function all() {
    summaryCard();
    recentTransactions();
    historyTransactions();
    // Only render chart when analytics is the active screen
    if (State.getActiveScreen() === 'analytics') {
      analytics();
    }
    storageInfo();
  }

  return { summaryCard, recentTransactions, historyTransactions, analytics, storageInfo, all, buildTransactionItem };
})();


/* ============================================================
   8. TRANSACTIONS
   ============================================================ */
const Transactions = (() => {

  function validateForm(name, amount, category) {
    let valid = true;

    const nameInput   = document.getElementById('itemName');
    const amountInput = document.getElementById('amount');
    const catInput    = document.getElementById('category');
    const nameErr     = document.getElementById('itemNameError');
    const amountErr   = document.getElementById('amountError');
    const catErr      = document.getElementById('categoryError');

    // Reset
    [nameInput, amountInput, catInput].forEach(el => el.classList.remove('is-error'));
    [nameErr, amountErr, catErr].forEach(el => { el.textContent = ''; });

    if (!name.trim()) {
      nameInput.classList.add('is-error');
      nameErr.textContent = 'Item name is required.';
      valid = false;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      amountInput.classList.add('is-error');
      amountErr.textContent = 'Please enter a valid amount greater than 0.';
      valid = false;
    }

    if (!category) {
      catInput.classList.add('is-error');
      catErr.textContent = 'Please select a category.';
      valid = false;
    }

    return valid;
  }

  function add(name, amount, category) {
    const tx = {
      id: Utils.generateId(),
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString(),
    };

    State.addTransaction(tx);
    Storage.saveTransactions(State.getTransactions());
    Render.all();
    Toast.show(`"${tx.name}" added successfully.`, 'success');
    return tx;
  }

  async function remove(id) {
    const txs = State.getTransactions();
    const tx = txs.find(t => t.id === id);
    if (!tx) return;

    const confirmed = await Dialog.open(
      'Delete Transaction',
      `Are you sure you want to delete "${tx.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    // Animate out
    const itemEl = document.querySelector(`[data-id="${id}"]`);
    if (itemEl) {
      itemEl.classList.add('is-removing');
      itemEl.addEventListener('animationend', () => {
        State.removeTransaction(id);
        Storage.saveTransactions(State.getTransactions());
        Render.all();
        Toast.show(`"${tx.name}" deleted.`, 'danger');
      }, { once: true });
    } else {
      State.removeTransaction(id);
      Storage.saveTransactions(State.getTransactions());
      Render.all();
      Toast.show(`"${tx.name}" deleted.`, 'danger');
    }
  }

  async function clearAll() {
    const confirmed = await Dialog.open(
      'Clear All Data',
      'This will permanently delete all transactions. This action cannot be undone.'
    );
    if (!confirmed) return;

    Storage.clearAll();
    State.setTransactions([]);
    Render.all();
    Toast.show('All data cleared.', 'info');
  }

  return { validateForm, add, remove, clearAll };
})();


/* ============================================================
   9. THEME
   ============================================================ */
const Theme = (() => {
  const body = document.body;
  const settingsToggle = document.getElementById('darkModeToggle');

  function apply(theme) {
    if (theme === 'dark') {
      body.classList.add('theme-dark');
      if (settingsToggle) {
        settingsToggle.checked = true;
        settingsToggle.setAttribute('aria-checked', 'true');
      }
    } else {
      body.classList.remove('theme-dark');
      if (settingsToggle) {
        settingsToggle.checked = false;
        settingsToggle.setAttribute('aria-checked', 'false');
      }
    }
    // Only re-render chart if analytics screen is currently visible
    if (State.getActiveScreen() === 'analytics') {
      ChartManager.render(State.getTransactions());
    }
  }

  function toggle() {
    const current = body.classList.contains('theme-dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    apply(next);
    Storage.saveTheme(next);
  }

  function init() {
    const saved = Storage.getTheme();
    apply(saved);
  }

  return { init, apply, toggle };
})();


/* ============================================================
   10. NAVIGATION
   ============================================================ */
const Navigation = (() => {
  const screens = {
    dashboard: document.getElementById('screenDashboard'),
    analytics:  document.getElementById('screenAnalytics'),
    history:    document.getElementById('screenHistory'),
    settings:   document.getElementById('screenSettings'),
  };

  const navButtons = document.querySelectorAll('.bottom-nav__btn');

  function goTo(screenName) {
    if (!screens[screenName]) return;

    // Hide all screens
    Object.values(screens).forEach(s => {
      s.hidden = true;
      s.classList.remove('is-active');
    });

    // Show target
    screens[screenName].hidden = false;
    screens[screenName].classList.add('is-active');

    // Update nav state
    navButtons.forEach(btn => {
      const isActive = btn.dataset.screen === screenName;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    State.setActiveScreen(screenName);

    // Render analytics chart on demand
    if (screenName === 'analytics') {
      Render.analytics();
    }

    // Update storage info on settings
    if (screenName === 'settings') {
      Render.storageInfo();
    }

    // Scroll screen to top
    screens[screenName].scrollTop = 0;
  }

  function init() {
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => goTo(btn.dataset.screen));
    });
  }

  return { init, goTo };
})();


/* ============================================================
   11. EVENTS
   ============================================================ */
const Events = (() => {

  /* --- Expense Form submit --- */
  function bindExpenseForm() {
    const form = document.getElementById('expenseForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name     = document.getElementById('itemName').value;
      const amount   = document.getElementById('amount').value;
      const category = document.getElementById('category').value;

      if (!Transactions.validateForm(name, amount, category)) return;

      Transactions.add(name, amount, category);
      form.reset();

      // Clear any lingering error states after reset
      ['itemName', 'amount', 'category'].forEach(id => {
        document.getElementById(id).classList.remove('is-error');
      });
      ['itemNameError', 'amountError', 'categoryError'].forEach(id => {
        document.getElementById(id).textContent = '';
      });
    });
  }

  /* --- Delete buttons (event delegation on both lists) --- */
  function bindDeleteButtons() {
    const recentList  = document.getElementById('recentTransactionList');
    const historyList = document.getElementById('historyTransactionList');

    function onDeleteClick(e) {
      const btn = e.target.closest('.transaction-item__delete');
      if (!btn) return;
      Transactions.remove(btn.dataset.id);
    }

    recentList.addEventListener('click', onDeleteClick);
    historyList.addEventListener('click', onDeleteClick);
  }

  /* --- Search input --- */
  function bindSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
      State.setSearchQuery(searchInput.value);
      Render.historyTransactions();
    });
  }

  /* --- Sort buttons --- */
  function bindSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sortButtons.forEach(b => {
          b.classList.remove('sort-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('sort-btn--active');
        btn.setAttribute('aria-pressed', 'true');
        State.setSortOrder(btn.dataset.sort);
        Render.historyTransactions();
      });
    });
  }

  /* --- Header theme toggle --- */
  function bindHeaderTheme() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => Theme.toggle());
  }

  /* --- Settings theme toggle --- */
  function bindSettingsTheme() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        const theme = toggle.checked ? 'dark' : 'light';
        Theme.apply(theme);
        Storage.saveTheme(theme);
      });
    }
  }

  /* --- Clear data button --- */
  function bindClearData() {
    const btn = document.getElementById('clearDataBtn');
    if (btn) btn.addEventListener('click', () => Transactions.clearAll());
  }

  /* --- Keyboard: clear form errors on input --- */
  function bindInputClearErrors() {
    ['itemName', 'amount', 'category'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        el.classList.remove('is-error');
        const err = document.getElementById(`${id}Error`);
        if (err) err.textContent = '';
      });
    });
  }

  function init() {
    bindExpenseForm();
    bindDeleteButtons();
    bindSearch();
    bindSortButtons();
    bindHeaderTheme();
    bindSettingsTheme();
    bindClearData();
    bindInputClearErrors();
  }

  return { init };
})();


/* ============================================================
   12. INITIALIZATION
   ============================================================ */
function init() {
  // Restore data from Local Storage
  State.setTransactions(Storage.getTransactions());

  // Apply saved theme before any render
  Theme.init();

  // Wire up navigation
  Navigation.init();

  // Wire up all event listeners
  Events.init();

  // Initial render
  Render.all();
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
