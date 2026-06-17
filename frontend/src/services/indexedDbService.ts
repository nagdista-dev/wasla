const DB_NAME = 'wasla_db';
const DB_VERSION = 1;

export interface StoreSchema {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string | string[]; unique?: boolean }[];
}

const STORES: StoreSchema[] = [
  {
    name: 'watchHistory',
    keyPath: 'videoId',
    indexes: [
      { name: 'lastViewedAt', keyPath: 'lastViewedAt' },
      { name: 'watchDate', keyPath: 'watchDate' },
      { name: 'channelId', keyPath: 'channelId' },
    ],
  },
  {
    name: 'playbackProgress',
    keyPath: 'videoId',
    indexes: [
      { name: 'lastUpdated', keyPath: 'lastUpdated' },
    ],
  },
  {
    name: 'appMetadata',
    keyPath: 'key',
  },
];

let dbInstance: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
          for (const index of store.indexes || []) {
            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
          }
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      openPromise = null;
      reject(request.error);
    };
  });

  return openPromise;
}

export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllFromIndex<T>(
  storeName: string,
  indexName: string,
  direction: IDBCursorDirection = 'prev'
): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const results: T[] = [];
    const request = index.openCursor(null, direction);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function putItem<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countItems(storeName: string): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function exportAll(): Promise<Record<string, unknown[]>> {
  const db = await openDb();
  const result: Record<string, unknown[]> = {};
  const storeNames = Array.from(db.objectStoreNames);
  for (const name of storeNames) {
    if (name === 'appMetadata') continue;
    result[name] = await getAll(name);
  }
  return result;
}

export async function importAll(data: Record<string, unknown[]>): Promise<void> {
  const db = await openDb();
  for (const [storeName, items] of Object.entries(data)) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    if (!Array.isArray(items) || items.length === 0) continue;
    await clearStore(storeName);
    for (const item of items) {
      await putItem(storeName, item);
    }
  }
}

export function isClientSide(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}
