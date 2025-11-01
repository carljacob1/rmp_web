// Utility functions for user-based data isolation

// Helper to extract user ID from user object
function extractUserId(user: any): string | null {
  if (!user) return null;
  
  // Try multiple possible ID field names (case-insensitive)
  const userId = user.id || user.ID || user.userId || user.userid || user.user_id || 
                 user.Id || (user as any).userId || (user as any).userid;
  if (userId && userId !== 'current') { // 'current' is the IndexedDB key, not the actual user ID
    return String(userId);
  }
  
  // Try businessId as a unique identifier
  const businessId = user.businessId || user.businessid || user.business_id || 
                    user.BUSINESS_ID || (user as any).businessId;
  if (businessId) {
    return String(businessId);
  }
  
  // Fallback to email or mobile if no id
  const email = user.email || user.Email || user.EMAIL || (user as any).email;
  if (email) {
    return String(email);
  }
  
  const mobile = user.mobile || user.Mobile || user.MOBILE || user.phone || 
                 user.Phone || user.PHONE || (user as any).mobile;
  if (mobile) {
    return String(mobile);
  }
  
  // Last resort: use ownerName if available
  const ownerName = user.ownerName || user.ownername || user.OWNER_NAME || 
                   (user as any).ownerName;
  if (ownerName) {
    return String(ownerName);
  }
  
  return null;
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    // First try localStorage (most reliable and fastest)
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        const userId = extractUserId(user);
        if (userId) {
          return userId;
        }
      } catch (parseError) {
        console.error('[getCurrentUserId] Error parsing localStorage user:', parseError);
      }
    }
    
    // Then try IndexedDB (with a small delay to allow AppPage to load user)
    try {
      // Wait a bit for AppPage to potentially load user into localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check localStorage again (AppPage might have loaded it)
      const savedAgain = localStorage.getItem('currentUser');
      if (savedAgain) {
        try {
          const user = JSON.parse(savedAgain);
          const userId = extractUserId(user);
          if (userId) {
            return userId;
          }
        } catch (parseError) {
          // Continue to IndexedDB check
        }
      }
      
      // Finally check IndexedDB
      const { getCurrentUser } = await import('@/lib/indexeddb');
      const user = await getCurrentUser();
      if (user) {
        // Remove the 'current' key if it exists (it's just the IndexedDB key)
        const userData = { ...user };
        delete userData.id; // Remove 'current' key
        const userId = extractUserId(userData);
        if (userId) {
          // Also save to localStorage for next time
          localStorage.setItem('currentUser', JSON.stringify(userData));
          return userId;
        }
      }
    } catch (indexedDBError) {
      // Silently fail - IndexedDB might not be available
    }
    
    // No warnings - components should handle null userId gracefully
    return null;
  } catch (error) {
    // Silently fail - don't spam console
    return null;
  }
}

export function getCurrentUserIdSync(): string | null {
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      return extractUserId(user);
    }
    return null;
  } catch (error) {
    // Silently fail
    return null;
  }
}

// Helper to filter data by userId
export function filterByUserId<T extends { userId?: string; userid?: string }>(
  items: T[],
  userId: string | null
): T[] {
  if (!userId) return [];
  return items.filter(item => 
    item.userId === userId || 
    item.userid === userId ||
    (item as any).user_id === userId
  );
}

