const GAS_URL = "https://script.google.com/macros/s/AKfycbx07fGQfn7PIgqKxyLtJIXsFvJPei8UtbPTcqsWaa650MjnSSwX7TRi9D3B53vJIYDyvg/exec";

async function request(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sync request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchRecords() {
  const response = await request({ action: 'fetch' });
  return Array.isArray(response.records) ? response.records : [];
}

export async function createRecord(record) {
  await request({ action: 'create', record });
  return record;
}

export async function updateRecord(record) {
  await request({ action: 'update', record });
  return record;
}

export async function deleteRecord(id) {
  await request({ action: 'delete', id });
  return id;
}

export async function clearRecords() {
  await request({ action: 'clear' });
  return [];
}
