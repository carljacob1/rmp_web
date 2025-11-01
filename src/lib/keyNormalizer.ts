/**
 * Key Normalizer - CRITICAL UTILITY
 * 
 * This function FORCES all object keys to lowercase.
 * It's used throughout the sync system to ensure Supabase compatibility.
 * 
 * IMPORTANT: Supabase requires ALL column names to be lowercase.
 */

/**
 * Force ALL keys in an object to lowercase - NUCLEAR VERSION
 * This function is guaranteed to produce only lowercase keys.
 */
export function forceAllKeysToLowercase(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const result: any = {};
  
  for (const key of Object.keys(obj)) {
    // Convert key to lowercase - handle ALL cases
    const keyStr = String(key);
    let lowerKey = keyStr.toLowerCase().trim();
    
    // Special handling for threshold - normalize ALL variations
    if (lowerKey.includes('threshold')) {
      lowerKey = 'lowstockthreshold';
    }
    
    // Get the value
    const value = obj[key];
    
    // If value is an object, recursively normalize it
    const normalizedValue = (value && typeof value === 'object' && !Array.isArray(value))
      ? forceAllKeysToLowercase(value)
      : value;
    
    // Store with lowercase key - overwrite if duplicate (prevents case variations)
    result[lowerKey] = normalizedValue;
  }
  
  // Final validation: rebuild one more time to be ABSOLUTELY SURE
  const final: any = {};
  for (const k of Object.keys(result)) {
    const kLower = String(k).toLowerCase().trim();
    final[kLower.includes('threshold') ? 'lowstockthreshold' : kLower] = result[k];
  }
  
  return final;
}

/**
 * Normalize a product object specifically - handles all known variations
 */
export function normalizeProductKeys(product: any): any {
  if (!product) return product;
  
  // Force all keys to lowercase first
  const normalized = forceAllKeysToLowercase(product);
  
  // Ensure critical fields exist with correct casing
  const result: any = {
    ...normalized,
    // Explicitly set these to ensure correct casing
    id: normalized.id || product.id,
    name: normalized.name || product.name,
    price: normalized.price ?? product.price,
    category: normalized.category || product.category,
    stock: normalized.stock ?? product.stock,
    lowstockthreshold: normalized.lowstockthreshold ?? normalized.lowstockthreshold ?? product.lowStockThreshold ?? product.Lowstockthreshold ?? product.low_stock_threshold ?? 0,
    created_at: normalized.created_at || normalized.createdat || product.created_at || product.createdAt,
    updated_at: normalized.updated_at || normalized.updatedat || product.updated_at || product.updatedAt,
  };
  
  // Remove any uppercase variations if they exist
  delete result.Lowstockthreshold;
  delete result.lowStockThreshold;
  delete result.LowStockThreshold;
  delete result.low_stock_threshold;
  
  // Final force to lowercase
  return forceAllKeysToLowercase(result);
}

