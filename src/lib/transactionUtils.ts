// Transaction Utilities
// Helper functions for creating and managing transactions with transaction_items

import { dbPut, dbGetAll, dbGetById, StoreName } from './indexeddb';
import { getCurrentUserId } from './userUtils';

export interface TransactionData {
  location_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount?: number;
  discount_type?: string;
  total_tax: number;
  total: number;
  payment_method: string;
  payment_status?: string;
  upi_id?: string;
  upi_app?: string;
  upi_transaction_id?: string;
  upi_reference?: string;
  cash_amount?: number;
  change_amount?: number;
  business_type?: string;
  receipt_data?: any;
}

export interface TransactionItemData {
  product_id?: string;
  item_name: string;
  item_type?: string;
  quantity: number;
  price: number;
  tax_rate_id?: string;
  tax_amount?: number;
  total: number;
  notes?: string;
}

/**
 * Create a transaction with transaction items
 * This is the proper way to save transactions using the new schema
 */
export async function createTransaction(
  transactionData: TransactionData,
  items: TransactionItemData[]
): Promise<{ transactionId: string; customerId?: string }> {
  const userId = await getCurrentUserId();
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  // Handle customer creation/retrieval
  let customerId = transactionData.customer_id;
  
  if (!customerId && (transactionData.customer_name || transactionData.customer_phone)) {
    // Try to find existing customer by phone
    const allCustomers = await dbGetAll<any>('customers');
    let customer = allCustomers.find(
      (c: any) => c.phone === transactionData.customer_phone
    );

    if (!customer && transactionData.customer_phone) {
      // Get default location_id if not provided
      let locationId = transactionData.location_id;
      if (!locationId) {
        const locations = await dbGetAll<any>('locations');
        if (locations.length > 0) {
          locationId = locations[0].id;
        }
      }

      // Create new customer
      customer = {
        id: `customer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        location_id: locationId || null,
        name: transactionData.customer_name || 'Unknown',
        email: transactionData.customer_email || null,
        phone: transactionData.customer_phone || null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        loyalty_points: 0,
        total_spent: transactionData.total,
        last_visit: now,
        notes: null,
        created_at: now,
        last_updated: now
      };
      await dbPut('customers', customer);
      customerId = customer.id;
    } else if (customer) {
      customerId = customer.id;
      // Update customer total_spent
      customer.total_spent = (parseFloat(customer.total_spent || '0') + transactionData.total).toString();
      customer.last_visit = now;
      await dbPut('customers', customer);
    }
  }

  // Get default location_id if not provided
  let locationId = transactionData.location_id;
  if (!locationId) {
    const locations = await dbGetAll<any>('locations');
    if (locations.length > 0) {
      locationId = locations[0].id;
    }
  }

  // Create transaction record
  const transaction: any = {
    id: transactionId,
    location_id: locationId || null,
    customer_id: customerId || null,
    user_id: userId || null,
    receipt_number: `REC-${Date.now()}`,
    transaction_id: transactionId,
    subtotal: transactionData.subtotal,
    discount_amount: transactionData.discount_amount || 0,
    discount_type: transactionData.discount_type || null,
    total_tax: transactionData.total_tax,
    platform_fee: 0,
    total: transactionData.total,
    payment_method: transactionData.payment_method,
    payment_status: transactionData.payment_status || 'completed',
    upi_id: transactionData.upi_id || null,
    upi_app: transactionData.upi_app || null,
    upi_transaction_id: transactionData.upi_transaction_id || null,
    upi_reference: transactionData.upi_reference || null,
    cash_amount: transactionData.cash_amount || null,
    change_amount: transactionData.change_amount || null,
    card_transaction_id: null,
    nfc_upi_id: null,
    customer_name: transactionData.customer_name || null,
    customer_phone: transactionData.customer_phone || null,
    store_name: null,
    store_address: null,
    cashier: userId || null,
    fee_breakdown: null,
    receipt_data: transactionData.receipt_data || null,
    business_type: transactionData.business_type || null,
    synced: false,
    synced_at: null,
    created_at: now,
    last_updated: now
  };

  await dbPut('transactions', transaction);

  // Create transaction items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const transactionItem: any = {
      id: `${transactionId}_item_${i}`,
      transaction_id: transactionId,
      product_id: item.product_id || null,
      item_name: item.item_name,
      item_type: item.item_type || null,
      quantity: item.quantity,
      price: item.price,
      tax_rate_id: item.tax_rate_id || null,
      tax_amount: item.tax_amount || 0,
      total: item.total,
      notes: item.notes || null,
      created_at: now,
      last_updated: now
    };
    await dbPut('transaction_items', transactionItem);
  }

  // Also save to legacy orders table for backward compatibility during migration
  // This ensures existing reports/queries continue to work
  const legacyOrder = {
    id: transactionId,
    businesstype: transactionData.business_type || null,
    customername: transactionData.customer_name || null,
    customerphone: transactionData.customer_phone || null,
    customeremail: transactionData.customer_email || null,
    items: items.map(item => ({
      productId: item.product_id,
      name: item.item_name,
      quantity: item.quantity,
      price: item.price,
      tax: item.tax_amount || 0,
      total: item.total
    })),
    subtotal: transactionData.subtotal,
    tax: transactionData.total_tax,
    total: transactionData.total,
    taxrate: transactionData.total_tax / transactionData.subtotal * 100 || 0,
    paymentmethod: transactionData.payment_method,
    upivid: transactionData.upi_id || null,
    paymentstatus: transactionData.payment_status || 'completed',
    timestamp: now,
    status: 'completed',
    created_at: now,
    updated_at: now
  };
  await dbPut('orders', legacyOrder);

  return {
    transactionId,
    customerId: customerId || undefined
  };
}

/**
 * Get transaction with all items
 */
export async function getTransactionWithItems(transactionId: string): Promise<{
  transaction: any;
  items: any[];
}> {
  const transaction = await dbGetById('transactions', transactionId);
  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const allItems = await dbGetAll('transaction_items');
  const items = allItems.filter((item: any) => item.transaction_id === transactionId);

  return { transaction, items };
}

/**
 * Get all transactions for a location
 */
export async function getTransactionsByLocation(locationId: string): Promise<any[]> {
  const allTransactions = await dbGetAll('transactions');
  return allTransactions.filter((t: any) => t.location_id === locationId);
}

/**
 * Get all transactions for a customer
 */
export async function getTransactionsByCustomer(customerId: string): Promise<any[]> {
  const allTransactions = await dbGetAll('transactions');
  return allTransactions.filter((t: any) => t.customer_id === customerId);
}

