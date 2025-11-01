// Network Status Diagnostic Component
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { dbGetAll } from '@/lib/indexeddb';

export function NetworkStatus() {
  const [status, setStatus] = useState({
    browserOnline: navigator.onLine,
    supabaseConfigured: false,
    supabaseConnected: false,
    indexedDBAvailable: false,
    detectedMode: 'unknown' as 'online' | 'offline' | 'unknown'
  });

  const checkStatus = async () => {
    // Check browser online status
    const browserOnline = navigator.onLine;

    // Check Supabase configuration
    const sb = getSupabaseClient();
    const supabaseConfigured = !!sb;

    // Check Supabase connection (if configured)
    let supabaseConnected = false;
    if (sb) {
      try {
        // Try a simple query to test connection
        const { error } = await sb.from('categories').select('id').limit(1);
        supabaseConnected = !error;
      } catch (err) {
        supabaseConnected = false;
      }
    }

    // Check IndexedDB availability
    let indexedDBAvailable = false;
    try {
      await dbGetAll('products');
      indexedDBAvailable = true;
    } catch (err) {
      indexedDBAvailable = false;
    }

    // Determine mode (no sync functionality)
    let detectedMode: 'online' | 'offline' = 'offline';
    if (browserOnline && supabaseConfigured && supabaseConnected) {
      detectedMode = 'online';
    } else if (!browserOnline || !supabaseConfigured || !supabaseConnected) {
      detectedMode = 'offline';
    }

    setStatus({
      browserOnline,
      supabaseConfigured,
      supabaseConnected,
      indexedDBAvailable,
      detectedMode
    });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    const handleOnline = () => checkStatus();
    const handleOffline = () => checkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = (isOk: boolean) => isOk ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (isOk: boolean) => isOk ? CheckCircle : XCircle;
  const StatusBadge = ({ isOk, label }: { isOk: boolean; label: string }) => {
    const Icon = getStatusIcon(isOk);
    return (
      <Badge variant={isOk ? "default" : "destructive"} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status.detectedMode === 'online' ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-gray-500" />
          )}
          Network Status Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="p-4 rounded-lg border-2 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Current Mode:</span>
            <StatusBadge 
              isOk={status.detectedMode === 'online'} 
              label={status.detectedMode === 'online' ? 'ONLINE' : 'OFFLINE'} 
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {status.detectedMode === 'online' 
              ? '✓ Online - Data stored locally in IndexedDB'
              : '⚠ Offline mode - Data stored locally in IndexedDB'}
          </p>
        </div>

        {/* Detailed Checks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Browser Online Status:</span>
            <StatusBadge isOk={status.browserOnline} label={status.browserOnline ? 'Online' : 'Offline'} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase Configured:</span>
            <StatusBadge isOk={status.supabaseConfigured} label={status.supabaseConfigured ? 'Yes' : 'No'} />
          </div>

          {status.supabaseConfigured && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Supabase Connection:</span>
              <StatusBadge isOk={status.supabaseConnected} label={status.supabaseConnected ? 'Connected' : 'Disconnected'} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm">IndexedDB Available:</span>
            <StatusBadge isOk={status.indexedDBAvailable} label={status.indexedDBAvailable ? 'Available' : 'Unavailable'} />
          </div>

        </div>

        {/* Recommendations */}
        {status.detectedMode === 'offline' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Offline Mode Active</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {!status.browserOnline && <li>Browser reports offline status</li>}
                  {!status.supabaseConfigured && <li>Supabase not configured (missing .env file)</li>}
                  {status.supabaseConfigured && !status.supabaseConnected && <li>Cannot connect to Supabase</li>}
                  <li>Data is being saved to IndexedDB locally</li>
                  <li>All data is stored locally only</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={checkStatus}
          className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
        >
          Refresh Status
        </button>
      </CardContent>
    </Card>
  );
}


