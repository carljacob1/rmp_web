// Data Migration Utilities
// Transforms data from old schema (orders with JSONB items) to new schema (transactions + transaction_items)

import { dbGetAll, dbPut, dbDelete, StoreName } from './indexeddb';

/**
 * Migrate orders to transactions + transaction_items
 * This function converts the old order structure (with items as JSONB) 
 * to the new normalized structure (transactions + transaction_items tables)
 */
export async function migrateOrdersToTransactions(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Get all orders from legacy orders table
    const orders = await dbGetAll<any>('orders');

    for (const order of orders) {
      try {
        // Create transaction record
        const transaction: any = {
          id: order.id,
          location_id: order.location_id || null,
          customer_id: null, // Will be set if customer exists or created
          user_id: order.user_id || null,
          receipt_number: order.receipt_number || `REC-${order.id}`,
          transaction_id: order.transaction_id || order.id,
          subtotal: parseFloat(order.subtotal || 0),
          discount_amount: parseFloat(order.discount_amount || 0),
          discount_type: order.discount_type || null,
          total_tax: parseFloat(order.tax || 0),
          platform_fee: parseFloat(order.platform_fee || 0),
          total: parseFloat(order.total || 0),
          payment_method: order.paymentmethod || order.payment_method || 'cash',
          payment_status: order.paymentstatus || order.payment_status || 'completed',
          upi_id: order.upivid || order.upi_id || null,
          upi_app: order.upi_app || null,
          upi_transaction_id: order.upi_transaction_id || null,
          upi_reference: order.upi_reference || null,
          cash_amount: order.cash_amount || null,
          change_amount: order.change_amount || null,
          card_transaction_id: order.card_transaction_id || null,
          nfc_upi_id: order.nfc_upi_id || null,
          customer_name: order.customername || order.customer_name || null,
          customer_phone: order.customerphone || order.customer_phone || null,
          store_name: order.store_name || null,
          store_address: order.store_address || null,
          cashier: order.cashier || null,
          fee_breakdown: order.fee_breakdown || null,
          receipt_data: order,
          business_type: order.businesstype || order.business_type || null,
          synced: order.synced || false,
          synced_at: order.synced_at || null,
          created_at: order.created_at || order.timestamp || new Date().toISOString(),
          last_updated: order.updated_at || order.last_updated || new Date().toISOString()
        };

        // Handle customer if provided
        if (order.customername || order.customerphone || order.customeremail) {
          // Try to find existing customer by phone
          const allCustomers = await dbGetAll<any>('customers');
          let customer = allCustomers.find(
            (c: any) => c.phone === (order.customerphone || order.customer_phone)
          );

          if (!customer && (order.customerphone || order.customer_phone)) {
            // Create new customer
            customer = {
              id: `customer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              location_id: transaction.location_id,
              name: order.customername || order.customer_name || 'Unknown',
              email: order.customeremail || order.customer_email || null,
              phone: order.customerphone || order.customer_phone || null,
              address: order.address || null,
              city: null,
              state: null,
              pincode: null,
              loyalty_points: 0,
              total_spent: parseFloat(order.total || 0),
              last_visit: transaction.created_at,
              notes: null,
              created_at: transaction.created_at,
              last_updated: transaction.created_at
            };
            await dbPut('customers', customer);
          }

          if (customer) {
            transaction.customer_id = customer.id;
            // Update customer total_spent
            customer.total_spent = (parseFloat(customer.total_spent || 0) + parseFloat(order.total || 0)).toString();
            customer.last_visit = transaction.created_at;
            await dbPut('customers', customer);
          }
        }

        // Save transaction
        await dbPut('transactions', transaction);

        // Migrate items from JSONB array to transaction_items table
        const items = order.items || [];
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const transactionItem: any = {
              id: `${transaction.id}_item_${i}`,
              transaction_id: transaction.id,
              product_id: item.productId || item.product_id || null,
              item_name: item.name || item.item_name || 'Unknown Item',
              item_type: item.type || item.item_type || null,
              quantity: parseFloat(item.quantity || 0),
              price: parseFloat(item.price || 0),
              tax_rate_id: item.tax_rate_id || null,
              tax_amount: parseFloat(item.tax || item.tax_amount || 0),
              total: parseFloat(item.total || item.price * item.quantity || 0),
              notes: item.notes || null,
              created_at: transaction.created_at,
              last_updated: transaction.created_at
            };
            await dbPut('transaction_items', transactionItem);
          }
        }

        migrated++;
      } catch (error) {
        const errorMsg = `Failed to migrate order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      errors
    };
  } catch (error) {
    return {
      success: false,
      migrated,
      errors: [...errors, `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Migrate products to include location_id and category_id relationships
 */
export async function migrateProductsToNewSchema(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    const products = await dbGetAll<any>('products');

    for (const product of products) {
      try {
        // If product already has location_id and category_id, skip
        if (product.location_id && product.category_id) {
          continue;
        }

        // Try to find category by name
        if (product.category && !product.category_id) {
          const allCategories = await dbGetAll<any>('categories');
          const category = allCategories.find((c: any) => 
            c.name?.toLowerCase() === product.category?.toLowerCase()
          );
          if (category) {
            product.category_id = category.id;
          }
        }

        // Set default location_id if not present (will need to be set manually or via settings)
        if (!product.location_id) {
          // Try to get first location
          const locations = await dbGetAll<any>('locations');
          if (locations.length > 0) {
            product.location_id = locations[0].id;
          }
        }

        // Map old fields to new fields
        if (product.stock !== undefined && product.stock_quantity === undefined) {
          product.stock_quantity = product.stock;
        }
        if (product.lowstockthreshold !== undefined && product.low_stock_threshold === undefined) {
          product.low_stock_threshold = product.lowstockthreshold;
        }
        if (product.image && !product.image_url) {
          product.image_url = product.image;
        }
        if (product.available !== undefined && product.is_active === undefined) {
          product.is_active = product.available;
        }

        await dbPut('products', product);
        migrated++;
      } catch (error) {
        const errorMsg = `Failed to migrate product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      errors
    };
  } catch (error) {
    return {
      success: false,
      migrated,
      errors: [...errors, `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Run all migrations
 */
export async function runAllMigrations(): Promise<{
  success: boolean;
  results: {
    orders: { success: boolean; migrated: number; errors: string[] };
    products: { success: boolean; migrated: number; errors: string[] };
  };
}> {
  console.log('[Migration] Starting data migration...');

  const ordersResult = await migrateOrdersToTransactions();
  console.log('[Migration] Orders migration:', ordersResult);

  const productsResult = await migrateProductsToNewSchema();
  console.log('[Migration] Products migration:', productsResult);

  const success = ordersResult.success && productsResult.success;

  return {
    success,
    results: {
      orders: ordersResult,
      products: productsResult
    }
  };
}

