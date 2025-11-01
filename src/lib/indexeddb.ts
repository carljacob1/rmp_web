// Lightweight IndexedDB helper for the app (no external deps)
// Stores: users, currentUser, registrations, appointments, services, medicines, invoices, expenses, orders, products, settings

const DB_NAME = 'RetailProDB';
const DB_VERSION = 7; // Incremented to add payments store

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
  | 'settings'
  | 'employees'
  | 'attendance'
  | 'syncQueue'
  | 'locations'
  | 'subscriptions'
  | 'payments';

let dbPromise: Promise<IDBDatabase> | null = null;

// Reset database connection (useful for upgrades)
export function resetDBConnection() {
  dbPromise = null;
}

// Force database upgrade by deleting and recreating
export async function forceDBUpgrade(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      console.log('Database deleted, will recreate on next open');
      resetDBConnection();
      resolve();
    };
    deleteRequest.onerror = () => {
      console.error('Failed to delete database:', deleteRequest.error);
      reject(deleteRequest.error);
    };
    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked. Please close other tabs.');
      // Try to proceed anyway
      resetDBConnection();
      resolve();
    };
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
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
        'settings',
        'employees',
        'attendance',
        'syncQueue',
        'locations',
        'subscriptions',
        'payments'
      ];
      stores.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          try {
            db.createObjectStore(name, { keyPath: 'id' });
            console.log(`Created object store: ${name}`);
          } catch (error) {
            console.error(`Failed to create store ${name}:`, error);
          }
        }
      });

      // For currentUser, keyPath 'id' works; we will always use a fixed id 'current'
    };

    request.onsuccess = () => {
      const db = request.result;
      // Verify all required stores exist
      const requiredStores: StoreName[] = [
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
        'settings',
        'employees',
        'attendance',
        'syncQueue',
        'locations',
        'subscriptions',
        'payments'
      ];
      
      const missing = requiredStores.filter(name => !db.objectStoreNames.contains(name));
      if (missing.length > 0) {
        console.error('Missing stores detected:', missing);
        console.log('Attempting to force database upgrade...');
        db.close();
        // Force upgrade by deleting and recreating
        forceDBUpgrade()
          .then(() => {
            resetDBConnection();
            resolve(openDB());
          })
          .catch((err) => {
            console.error('Failed to force upgrade:', err);
            reject(new Error(`Missing stores: ${missing.join(', ')}. Please refresh the page.`));
          });
        return;
      }
      
      resolve(db);
    };
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked. Please close other tabs.');
      // Still try to resolve, the upgrade might complete
      setTimeout(() => {
        if (request.result) {
          resolve(request.result);
        }
      }, 1000);
    };
  });
  return dbPromise;
}

export async function dbGetAll<T = any>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openDB();
    // Check if store exists before creating transaction
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`Object store '${storeName}' does not exist. Please refresh the page to upgrade the database.`);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in dbGetAll for store '${storeName}':`, error);
    throw error;
  }
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
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      // Check if store exists
      if (!db.objectStoreNames.contains(storeName)) {
        reject(new Error(`Object store '${storeName}' does not exist. Please refresh the page to upgrade the database.`));
        return;
      }
      
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value as any);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in dbPut for store '${storeName}':`, error);
    throw error;
  }
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


