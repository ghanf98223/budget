const STORAGE_KEY = 'budgetRecords';

function parseRecords(raw) {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('storage.js: invalid cache payload', error);
    return [];
  }
}

export function getCache() {
  return parseRecords(localStorage.getItem(STORAGE_KEY));
}

export function setCache(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function addCache(record) {
  const records = getCache();
  records.push(record);
  setCache(records);
  return record;
}

export function updateCache(record) {
  const records = getCache().map(r => (r.id === record.id ? record : r));
  setCache(records);
  return record;
}

export function deleteCache(id) {
  const records = getCache().filter(r => r.id !== id);
  setCache(records);
  return records;
}

export function clearCache() {
  setCache([]);
  return [];
}

const QUEUE_KEY = 'budgetPendingOps';

export function getPendingOps() {
  return parseRecords(localStorage.getItem(QUEUE_KEY));
}

export function setPendingOps(ops) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  return ops;
}

export function addPendingOp(op) {
  const pending = getPendingOps();
  pending.push(op);
  setPendingOps(pending);
  return pending;
}

export function clearPendingOps() {
  return setPendingOps([]);
}
