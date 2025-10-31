// Sync Status Component: Shows sync status and allows manual sync
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react';
import { getSyncStatus, triggerSync } from '@/lib/syncService';
import { useToast } from '@/hooks/use-toast';

interface SyncStatusProps {
  compact?: boolean;
}

export function SyncStatus({ compact = false }: SyncStatusProps) {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    pendingChanges: 0,
    lastSyncTime: null as number | null,
    isSyncing: false
  });
  const { toast } = useToast();

  const loadStatus = async () => {
    const syncStatus = await getSyncStatus();
    setStatus(prev => ({
      ...prev,
      ...syncStatus,
      isSyncing: false
    }));
  };

  useEffect(() => {
    loadStatus();
    
    const interval = setInterval(loadStatus, 5000); // Update every 5 seconds
    
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      loadStatus();
    };
    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setStatus(prev => ({ ...prev, isSyncing: true }));
    const result = await triggerSync();
    setStatus(prev => ({ ...prev, isSyncing: false }));

    if (result.success) {
      toast({
        title: "Sync Successful",
        description: "All data has been synchronized.",
      });
      await loadStatus();
    } else {
      toast({
        title: "Sync Failed",
        description: result.error || "Failed to sync data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {status.isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-500" />
        )}
        <Badge variant={status.isOnline ? "default" : "secondary"}>
          {status.isOnline ? "Online" : "Offline"}
        </Badge>
        {status.pendingChanges > 0 && (
          <Badge variant="outline">
            {status.pendingChanges} pending
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={!status.isOnline || status.isSyncing}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${status.isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Offline</span>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={!status.isOnline || status.isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${status.isSyncing ? 'animate-spin' : ''}`} />
              {status.isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending Changes:</span>
              <Badge variant={status.pendingChanges > 0 ? "destructive" : "default"}>
                {status.pendingChanges}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Sync:</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLastSync(status.lastSyncTime)}</span>
              </div>
            </div>
          </div>

          {status.pendingChanges > 0 && status.isOnline && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {status.pendingChanges} change(s) waiting to sync
              </span>
            </div>
          )}

          {status.pendingChanges === 0 && status.lastSyncTime && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                All data synchronized
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


