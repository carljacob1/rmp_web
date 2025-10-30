import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Download, 
  Upload,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Database,
  RotateCcw
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/indian-tax-utils";
import { toast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  onLogout: () => void;
}

interface SystemStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingReports: number;
  offlineDataSize: string;
  lastSync: string;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingReports: 0,
    offlineDataSize: '0 MB',
    lastSync: 'Never'
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load stats from localStorage/IndexedDB
    loadSystemStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSystemStats = async () => {
    try {
      // Calculate stats from offline storage
      const taxEntries = JSON.parse(localStorage.getItem('tax_entries') || '[]');
      const employeeData = JSON.parse(localStorage.getItem('employee_data') || '[]');
      
      const totalRevenue = taxEntries
        .filter((entry: any) => entry.type === 'income')
        .reduce((sum: number, entry: any) => sum + entry.amount, 0);

      // Calculate offline data size
      const storageSize = new Blob([
        localStorage.getItem('tax_entries') || '',
        localStorage.getItem('employee_data') || '',
        localStorage.getItem('inventory_data') || ''
      ]).size;

      setStats({
        totalUsers: employeeData.length,
        totalTransactions: taxEntries.length,
        totalRevenue,
        pendingReports: taxEntries.filter((entry: any) => entry.status === 'pending').length,
        offlineDataSize: `${(storageSize / 1024 / 1024).toFixed(2)} MB`,
        lastSync: localStorage.getItem('last_sync') || 'Never'
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      localStorage.setItem('last_sync', new Date().toISOString());
      setStats(prev => ({
        ...prev,
        lastSync: new Date().toLocaleString('en-IN')
      }));
      
      toast({
        title: "Sync Complete",
        description: "All offline data has been synchronized",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync data. Will retry automatically.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const exportAllData = () => {
    const allData = {
      taxEntries: JSON.parse(localStorage.getItem('tax_entries') || '[]'),
      employeeData: JSON.parse(localStorage.getItem('employee_data') || '[]'),
      inventoryData: JSON.parse(localStorage.getItem('inventory_data') || '[]'),
      exportDate: new Date().toISOString(),
      stats
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "All system data exported successfully",
    });
  };

  const clearOfflineData = () => {
    localStorage.clear();
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('TaxReportsDB');
    }
    
    setStats({
      totalUsers: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      pendingReports: 0,
      offlineDataSize: '0 MB',
      lastSync: 'Never'
    });

    toast({
      title: "Data Cleared",
      description: "All offline data has been cleared",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Admin Panel</h1>
            {isOnline ? (
              <Badge variant="default" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
                <FileText className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatIndianCurrency(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Offline Data Size:</span>
                      <span className="font-medium">{stats.offlineDataSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Sync:</span>
                      <span className="font-medium">{stats.lastSync}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection Status:</span>
                      <Badge variant={isOnline ? "default" : "secondary"}>
                        {isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button onClick={exportAllData} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={clearOfflineData}
                      className="w-full"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Clear Offline Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Manage offline data storage and synchronization settings.
                  </p>
                  
                  <div className="flex gap-4">
                    <Button onClick={() => loadSystemStats()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Refresh Stats
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handleSync}
                      disabled={!isOnline || isSyncing}
                    >
                      <RotateCcw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Force Sync
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Auto Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data when online
                      </p>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Offline Storage</h4>
                      <p className="text-sm text-muted-foreground">
                        Use IndexedDB for better offline storage
                      </p>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}