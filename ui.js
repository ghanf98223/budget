import { getCache, getPendingOps } from './storage.js';

const CATEGORIES = {
  expense: ['🍜 餐飲','🚌 交通','🏠 住房','🛍 購物','🎮 娛樂','💊 醫療','📚 教育','💡 水電','📱 通訊','💰 其他'],
  income:  ['💼 薪資','🎁 獎金','📈 投資','🤝 兼職','🎀 零用錢','💰 其他']
};

let currentTab = 'records';
let currentType = 'expense';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let charts = {};
let handlers = {};

export function bindUIActions(userHandlers) {
  handlers = userHandlers;

  document.getElementById('burgerBtn').addEventListener('click', toggleDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => onTabChange(button.dataset.tab));
  });
  document.querySelectorAll('nav.drawer a[data-tab]').forEach(link => {
    link.addEventListener('click', () => onTabChange(link.dataset.tab));
  });
  document.getElementById('exportLink').addEventListener('click', handlers.onExport);
  document.getElementById('openModalLink').addEventListener('click', openModal);
  document.getElementById('clearAllLink').addEventListener('click', handlers.onClear);
  document.getElementById('sortSelect').addEventListener('change', () => renderApp(getCache()));
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
  document.getElementById('tabExp').addEventListener('click', () => setType('expense'));
  document.getElementById('tabInc').addEventListener('click', () => setType('income'));
  document.querySelector('.btn-cancel').addEventListener('click', closeModal);
  document.querySelector('.btn-save').addEventListener('click', () => {
    const record = {
      date: document.getElementById('inputDate').value,
      amount: document.getElementById('inputAmount').value,
      category: document.getElementById('inputCategory').value,
      note: document.getElementById('inputNote').value,
      type: currentType
    };
    handlers.onSave(record);
    closeModal();
  });
  document.querySelector('.fab').addEventListener('click', openModal);
  document.querySelectorAll('.month-nav button').forEach(button => {
    button.addEventListener('click', () => onMonthChange(button.textContent === '‹' ? -1 : 1));
  });
}

function onTabChange(tab) {
  currentTab = tab;
  handlers.onTabSwitch(tab);
}

function onMonthChange(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderApp(getCache());
}

export function initUI() {
  setType('expense');
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'date-desc';
}

export function renderApp(records, tab = currentTab) {
  currentTab = tab;
  document.getElementById('page-records').style.display = tab === 'records' ? '' : 'none';
  document.getElementById('page-charts').style.display = tab === 'charts' ? '' : 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.drawer a[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  document.getElementById('monthLabel').textContent = monthStr();
  document.getElementById('monthLabelChart').textContent = monthStr();
  renderSummary(records);
  renderRecords(records);
  renderPendingCount();
  if (tab === 'charts') {
    renderCharts(records);
  }
}

function renderPendingCount() {
  const pending = getPendingOps().length;
  const element = document.getElementById('pendingCount');
  if (element) {
    element.textContent = `待同步 ${pending} 筆`;
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  const burger = document.getElementById('burgerBtn');
  const open = drawer.classList.toggle('open');
  overlay.classList.toggle('open', open);
  burger.classList.toggle('open', open);
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

function openModal() {
  closeDrawer();
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('inputDate').value = today;
  document.getElementById('inputAmount').value = '';
  document.getElementById('inputNote').value = '';
  setType('expense');
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('inputAmount').focus(), 350);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function setType(type) {
  currentType = type;
  document.getElementById('tabExp').classList.toggle('active', type === 'expense');
  document.getElementById('tabInc').classList.toggle('active', type === 'income');
  const sel = document.getElementById('inputCategory');
  sel.innerHTML = CATEGORIES[type].map(c => `<option>${c}</option>`).join('');
}

function renderSummary(records) {
  const mr = monthRecords(records);
  const inc = mr.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const exp = mr.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  const bal = inc - exp;
  document.getElementById('sumIncome').textContent = `$${inc.toLocaleString()}`;
  document.getElementById('sumExpense').textContent = `$${exp.toLocaleString()}`;
  const balEl = document.getElementById('sumBalance');
  balEl.textContent = `$${bal.toLocaleString()}`;
  balEl.style.color = bal >= 0 ? 'var(--income)' : 'var(--expense)';
}

function renderRecords(records) {
  const sort = document.getElementById('sortSelect').value;
  let mr = [...monthRecords(records)];

  mr.sort((a, b) => {
    if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sort === 'amount-desc') return b.amount - a.amount;
    if (sort === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const container = document.getElementById('recordsList');
  if (mr.length === 0) {
    container.innerHTML = `<div class="empty"><span class="emoji">🍃</span>這個月還沒有記錄<br>點 ＋ 開始記帳</div>`;
    return;
  }

  const byWeek = {};
  mr.forEach(r => {
    const w = weekOfMonth(r.date);
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(r);
  });

  let html = '';
  Object.keys(byWeek).sort((a,b) => b - a).forEach(w => {
    const wRecords = byWeek[w];
    const wInc = wRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const wExp = wRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const wBal = wInc - wExp;
    const balClass = wBal >= 0 ? 'pos' : 'neg';
    html += `<div class="week-block"><div class="week-header"><span class="week-label">第 ${w} 週</span><span class="week-bal ${balClass}">結餘 ${wBal >= 0 ? '+' : ''}$${wBal.toLocaleString()}</span></div>`;
    wRecords.forEach(r => {
      const emoji = r.category.match(/^\S+/)?.[0] || '💰';
      html += `<div class="record-item"><div class="record-icon ${r.type}">${emoji}</div><div class="record-info"><div class="record-title">${r.category.replace(/^\S+\s?/, '')}</div><div class="record-meta">${r.date}${r.note ? ' · '+r.note : ''}</div></div><span class="record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${r.amount.toLocaleString()}</span><button class="del-btn" data-id="${r.id}" aria-label="刪除">✕</button></div>`;
    });
    html += `</div>`;
  });

  container.innerHTML = html;
  container.querySelectorAll('.del-btn').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      handlers.onDelete(id);
    });
  });
}

function renderCharts(records) {
  const mr = monthRecords(records);
  renderPie(mr);
  renderBar(mr);
  renderLine(mr);
}

function monthRecords(records) {
  return records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
}

function weekOfMonth(dateStr) {
  const d = new Date(dateStr);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  return Math.ceil((d.getDate() + firstDay) / 7);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function renderPie(mr) {
  destroyChart('pie');
  const expenses = mr.filter(r => r.type === 'expense');
  if (expenses.length === 0) {
    document.getElementById('pieChart').parentElement.querySelector('.chart-title').textContent = '支出分類佔比（無資料）';
    return;
  }
  const catMap = {};
  expenses.forEach(r => { catMap[r.category] = (catMap[r.category] || 0) + r.amount; });
  const labels = Object.keys(catMap);
  const data = labels.map(label => catMap[label]);
  charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: ['#E8A04A','#D4682A','#C0442B','#5A8A5E','#6B3E1F','#A8733A','#7A9E7E','#D4956A','#8B5E3C','#B08060'], borderWidth: 2, borderColor: '#FAF7F2' }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6B3E1F', boxWidth: 14 } } }, cutout: '52%' }
  });
}

function renderBar(mr) {
  destroyChart('bar');
  const weeks = [1,2,3,4,5,6];
  const incData = weeks.map(w => mr.filter(r => r.type === 'income' && weekOfMonth(r.date) === w).reduce((sum, r) => sum + r.amount, 0));
  const expData = weeks.map(w => mr.filter(r => r.type === 'expense' && weekOfMonth(r.date) === w).reduce((sum, r) => sum + r.amount, 0));
  const maxW = Math.max(...mr.map(r => weekOfMonth(r.date)), 4);
  charts.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: maxW }, (_, i) => `第${i+1}週`),
      datasets: [{ label: '收入', data: incData.slice(0,maxW), backgroundColor: 'rgba(90,138,94,0.72)', borderRadius: 6 }, { label: '支出', data: expData.slice(0,maxW), backgroundColor: 'rgba(192,68,43,0.72)', borderRadius: 6 }]
    },
    options: {
      plugins: { legend: { labels: { font: { size: 11 }, color: '#6B3E1F' } } },
      scales: { x: { ticks: { color: '#9B7355' }, grid: { display: false } }, y: { ticks: { color: '#9B7355' }, grid: { color: 'rgba(107,62,31,0.08)' } } }
    }
  });
}

function renderLine(mr) {
  destroyChart('line');
  const months = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m < 0) { m += 12; y -= 1; }
    months.push({ y, m, label: `${y}/${m+1}` });
  }
  const incData = months.map(({ y, m }) => mr.filter(r => { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m && r.type === 'income'; }).reduce((sum, r) => sum + r.amount, 0));
  const expData = months.map(({ y, m }) => mr.filter(r => { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m && r.type === 'expense'; }).reduce((sum, r) => sum + r.amount, 0));
  charts.line = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{ label:'收入', data: incData, borderColor: '#5A8A5E', backgroundColor: 'rgba(90,138,94,0.12)', tension: .4, fill: true, pointRadius: 4 }, { label:'支出', data: expData, borderColor: '#D4682A', backgroundColor: 'rgba(212,104,42,0.10)', tension: .4, fill: true, pointRadius: 4 }]
    },
    options: {
      plugins: { legend: { labels: { font: { size: 11 }, color: '#6B3E1F' } } },
      scales: { x: { ticks: { color: '#9B7355' }, grid: { display: false } }, y: { ticks: { color: '#9B7355' }, grid: { color: 'rgba(107,62,31,0.08)' } } }
    }
  });
}
