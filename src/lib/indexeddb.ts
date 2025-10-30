// Lightweight IndexedDB helper for the app (no external deps)
// Stores: users, currentUser, registrations, appointments, services, medicines, invoices, expenses, orders, products, settings

const DB_NAME = 'RetailProDB';
const DB_VERSION = 2;

export type StoreName =
  | 'users'
  | 'currentUser'
  | 'registrations'
  | 'appointments'
  | 'services'
  | 'medicines'
  | 'invoices'
  | 'expenses'
  | 'categories'
  | 'orders'
  | 'products'
  | 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const stores: StoreName[] = [
        'users',
        'currentUser',
        'registrations',
        'appointments',
        'services',
        'medicines',
        'invoices',
        'expenses',
        'categories',
        'orders',
        'products',
        'settings'
      ];
      stores.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });

      // For currentUser, keyPath 'id' works; we will always use a fixed id 'current'
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function dbGetAll<T = any>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetById<T = any>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T = any>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value as any);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  // Migrate users
  try {
    const usersRaw = localStorage.getItem('users');
    if (usersRaw) {
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        for (const user of users) {
          if (!user.id) user.id = `user_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await dbPut('users', user);
        }
      }
    }

    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw);
      await dbPut('currentUser', { id: 'current', ...currentUser });
    }

    const regsRaw = localStorage.getItem('registrations');
    if (regsRaw) {
      const regs = JSON.parse(regsRaw);
      if (Array.isArray(regs)) {
        for (const r of regs) {
          if (!r.id) r.id = `reg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await dbPut('registrations', r);
        }
      }
    }
  } catch (e) {
    console.error('LocalStorage → IndexedDB migration failed', e);
  }
}

export async function getCurrentUser() {
  return await dbGetById('currentUser', 'current');
}

export async function setCurrentUser(user: any | null) {
  if (user) {
    await dbPut('currentUser', { id: 'current', ...user });
  } else {
    await dbDelete('currentUser', 'current');
  }
}


