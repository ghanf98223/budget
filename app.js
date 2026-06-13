import { getCache, setCache, addCache, deleteCache, clearCache, getPendingOps, setPendingOps, addPendingOp, clearPendingOps } from './storage.js';
import { fetchRecords, createRecord, deleteRecord as deleteRemote, clearRecords } from './sync.js';
import { renderApp, bindUIActions, initUI } from './ui.js';

function normalizeRecord(data) {
  return {
    id: data.id || crypto.randomUUID(),
    date: data.date,
    amount: Number(data.amount),
    category: data.category,
    note: data.note || '',
    timestamp: data.timestamp || new Date().toISOString(),
    type: data.type || 'expense'
  };
}

async function processPendingQueue() {
  const queue = getPendingOps();
  if (queue.length === 0) return;

  console.log(`app.js: processing ${queue.length} pending operations`);
  while (queue.length > 0) {
    const op = queue[0];
    try {
      if (op.type === 'create') {
        await createRecord(op.record);
      } else if (op.type === 'delete') {
        await deleteRemote(op.id);
      } else if (op.type === 'clear') {
        await clearRecords();
      } else {
        console.warn('app.js: unknown pending op type', op.type);
      }
      queue.shift();
      setPendingOps(queue);
    } catch (error) {
      console.warn('app.js: pending operation failed, will retry later', op, error);
      break;
    }
  }
}

async function syncFromServer() {
  try {
    await processPendingQueue();
    const records = await fetchRecords();
    setCache(records);
    clearPendingOps();
    renderApp(records);
    return records;
  } catch (error) {
    console.warn('app.js: sync from server failed', error);
    renderApp(getCache());
    return null;
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('Service worker registered');
    } catch (error) {
      console.warn('app.js: service worker registration failed', error);
    }
  }
}

export async function initApp() {
  initUI();
  bindUIActions({ onSave, onDelete, onClear, onTabSwitch, onExport });
  renderApp(getCache());
  window.addEventListener('online', syncFromServer);
  await registerServiceWorker();

  if (navigator.onLine) {
    console.log('app.js: online, loading from Google Sheet first');
    await syncFromServer();
  } else {
    console.log('app.js: offline, using local cache');
  }
}

// Month navigation is managed by the UI layer;
// app.js only handles data actions and syncing.

export async function onSave(input) {
  const record = normalizeRecord(input);
  addCache(record);
  renderApp(getCache());

  if (navigator.onLine) {
    try {
      await createRecord(record);
    } catch (error) {
      console.warn('app.js: create remote failed, queueing for later', error);
      addPendingOp({ type: 'create', record });
    }
  } else {
    addPendingOp({ type: 'create', record });
  }
}

export async function onDelete(id) {
  deleteCache(id);
  renderApp(getCache());

  if (navigator.onLine) {
    try {
      await deleteRemote(id);
    } catch (error) {
      console.warn('app.js: delete remote failed, queueing for later', error);
      addPendingOp({ type: 'delete', id });
    }
  } else {
    addPendingOp({ type: 'delete', id });
  }
}

export async function onClear() {
  clearCache();
  renderApp(getCache());

  if (navigator.onLine) {
    try {
      await clearRecords();
    } catch (error) {
      console.warn('app.js: clear remote failed, queueing for later', error);
      addPendingOp({ type: 'clear' });
    }
  } else {
    addPendingOp({ type: 'clear' });
  }
}

export function onTabSwitch(tab) {
  renderApp(getCache(), tab);
}


export async function onExport() {
  const records = getCache();
  if (records.length === 0) {
    alert('目前沒有任何記帳紀錄可以匯出喔！');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += '日期,類型,分類,金額,備註\n';

  records.forEach(r => {
    const typeText = r.type === 'income' ? '收入' : '支出';
    const catText = `"${r.category.replace(/"/g, '""')}"`;
    const amtText = Number.isInteger(r.amount) ? r.amount : r.amount.toFixed(2);
    const noteText = r.note ? `"${r.note.replace(/"/g, '""')}"` : '';
    csvContent += `${r.date},${typeText},${catText},${amtText},${noteText}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `我的帳本備份_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

initApp();
