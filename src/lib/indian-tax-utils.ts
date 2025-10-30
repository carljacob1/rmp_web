// Indian currency and number formatting utilities
export const formatIndianCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatIndianNumber = (number: number): string => {
  return new Intl.NumberFormat('en-IN').format(number);
};

// Indian tax calculation utilities
export const calculateGST = (amount: number, gstRate: number) => {
  const gstAmount = (amount * gstRate) / 100;
  return {
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    igst: gstAmount, // for inter-state transactions
    totalGST: gstAmount
  };
};

export const calculateTDS = (amount: number, tdsRate: number) => {
  return (amount * tdsRate) / 100;
};

// Indian tax slabs for FY 2023-24 (Old Regime)
export const calculateIncomeTax = (taxableIncome: number): number => {
  let tax = 0;
  
  if (taxableIncome <= 250000) {
    tax = 0;
  } else if (taxableIncome <= 500000) {
    tax = (taxableIncome - 250000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    tax = 12500 + (taxableIncome - 500000) * 0.20;
  } else {
    tax = 112500 + (taxableIncome - 1000000) * 0.30;
  }
  
  // Add 4% cess
  tax = tax + (tax * 0.04);
  
  return tax;
};

// Offline storage utilities
export const saveToIndexedDB = async (storeName: string, data: any) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TaxReportsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put(data);
      
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(putRequest.result);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
};

export const loadFromIndexedDB = async (storeName: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TaxReportsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.getAll();
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result || []);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
};