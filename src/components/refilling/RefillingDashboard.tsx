import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Fuel, 
  Package, 
  Plus, 
  RotateCcw, 
  Truck, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Wrench,
  Search,
  Filter,
  Download,
  WifiOff,
  Database,
  CreditCard
} from "lucide-react";
import { OfflinePOS } from "@/components/pos/OfflinePOS";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatIndianCurrency } from "@/lib/indian-tax-utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "@/hooks/use-toast";

interface Vessel {
  id: string;
  vesselNumber: string;
  type: 'lpg' | 'oxygen' | 'acetylene' | 'nitrogen' | 'argon' | 'co2';
  size: string; // e.g., "14.2kg", "5kg", "19kg"
  status: 'empty' | 'filled' | 'in-maintenance' | 'in-transit' | 'delivered';
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  filledDate?: string;
  deliveryDate?: string;
  returnDate?: string;
  maintenanceNotes?: string;
  refillCount: number;
  lastRefillDate?: string;
  nextMaintenanceDue?: string;
  price: number;
  deposit: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface RefillTransaction {
  id: string;
  vesselId: string;
  vesselNumber: string;
  type: 'refill' | 'delivery' | 'return' | 'maintenance';
  customerName: string;
  amount: number;
  deposit: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  driverName?: string;
  vehicleNumber?: string;
}

export function RefillingDashboard() {
  const {
    data: vessels,
    loading: vesselsLoading,
    saveData: saveVessel,
    updateData: updateVessel,
    isOnline
  } = useOfflineStorage<Vessel>('vessels', 'refilling_vessels');

  const {
    data: transactions,
    loading: transactionsLoading,
    saveData: saveTransaction,
    updateData: updateTransaction
  } = useOfflineStorage<RefillTransaction>('refillTransactions', 'refill_transactions');

  const [newVessel, setNewVessel] = useState<Partial<Vessel>>({
    type: 'lpg',
    status: 'empty',
    refillCount: 0,
    price: 0,
    deposit: 0
  });
  const [newTransaction, setNewTransaction] = useState<Partial<RefillTransaction>>({
    type: 'refill',
    status: 'pending',
    amount: 0,
    deposit: 0
  });
  const [isVesselDialogOpen, setIsVesselDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPOS, setShowPOS] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const vesselTypes = [
    { value: 'lpg', label: 'LPG Gas', icon: '🔥' },
    { value: 'oxygen', label: 'Oxygen', icon: '🫁' },
    { value: 'acetylene', label: 'Acetylene', icon: '⚡' },
    { value: 'nitrogen', label: 'Nitrogen', icon: '❄️' },
    { value: 'argon', label: 'Argon', icon: '🔬' },
    { value: 'co2', label: 'CO2', icon: '💨' }
  ];

  const vesselSizes = {
    lpg: ['5kg', '14.2kg', '19kg', '35kg', '47.5kg'],
    oxygen: ['1.5 cu.m', '7 cu.m', '10 cu.m', '40 cu.m'],
    acetylene: ['1 kg', '5 kg', '7.5 kg'],
    nitrogen: ['5 cu.m', '10 cu.m', '40 cu.m'],
    argon: ['5 cu.m', '10 cu.m', '40 cu.m'],
    co2: ['5 kg', '22.5 kg', '37.5 kg']
  };

  const getStatusColor = (status: Vessel['status']) => {
    switch (status) {
      case 'empty': return 'destructive';
      case 'filled': return 'default';
      case 'in-maintenance': return 'secondary';
      case 'in-transit': return 'outline';
      case 'delivered': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: Vessel['status']) => {
    switch (status) {
      case 'empty': return <Package className="h-4 w-4" />;
      case 'filled': return <CheckCircle className="h-4 w-4" />;
      case 'in-maintenance': return <Wrench className="h-4 w-4" />;
      case 'in-transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = vessel.vesselNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vessel.status === statusFilter;
    const matchesType = typeFilter === 'all' || vessel.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const vesselStats = {
    total: vessels.length,
    empty: vessels.filter(v => v.status === 'empty').length,
    filled: vessels.filter(v => v.status === 'filled').length,
    inMaintenance: vessels.filter(v => v.status === 'in-maintenance').length,
    inTransit: vessels.filter(v => v.status === 'in-transit').length,
    totalRevenue: transactions
      .filter(t => t.status === 'completed' && t.type === 'refill')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  const addVessel = async () => {
    if (!newVessel.vesselNumber || !newVessel.type || !newVessel.size) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const vessel: Vessel = {
      id: Date.now().toString(),
      vesselNumber: newVessel.vesselNumber!,
      type: newVessel.type as Vessel['type'],
      size: newVessel.size!,
      status: newVessel.status as Vessel['status'],
      refillCount: 0,
      price: newVessel.price || 0,
      deposit: newVessel.deposit || 0,
      customerName: newVessel.customerName,
      customerPhone: newVessel.customerPhone,
      customerAddress: newVessel.customerAddress,
      nextMaintenanceDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
    };

    await saveVessel(vessel);
    setNewVessel({ type: 'lpg', status: 'empty', refillCount: 0, price: 0, deposit: 0 });
    setIsVesselDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Vessel added successfully",
    });
  };

  const addTransaction = async () => {
    if (!newTransaction.vesselId || !newTransaction.customerName || !newTransaction.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const vessel = vessels.find(v => v.id === newTransaction.vesselId);
    if (!vessel) {
      toast({
        title: "Error",
        description: "Vessel not found",
        variant: "destructive",
      });
      return;
    }

    const transaction: RefillTransaction = {
      id: Date.now().toString(),
      vesselId: newTransaction.vesselId!,
      vesselNumber: vessel.vesselNumber,
      type: newTransaction.type as RefillTransaction['type'],
      customerName: newTransaction.customerName!,
      amount: newTransaction.amount!,
      deposit: newTransaction.deposit || 0,
      date: new Date().toISOString().split('T')[0],
      status: newTransaction.status as RefillTransaction['status'],
      notes: newTransaction.notes,
      driverName: newTransaction.driverName,
      vehicleNumber: newTransaction.vehicleNumber
    };

    await saveTransaction(transaction);
    
    // Update vessel status based on transaction type
    let newStatus: Vessel['status'] = vessel.status;
    let updates: Partial<Vessel> = {};
    
    if (transaction.type === 'refill') {
      newStatus = 'filled';
      updates = {
        status: newStatus,
        refillCount: vessel.refillCount + 1,
        lastRefillDate: transaction.date,
        filledDate: transaction.date,
        customerName: transaction.customerName
      };
    } else if (transaction.type === 'delivery') {
      newStatus = 'delivered';
      updates = {
        status: newStatus,
        deliveryDate: transaction.date
      };
    } else if (transaction.type === 'return') {
      newStatus = 'empty';
      updates = {
        status: newStatus,
        returnDate: transaction.date,
        customerName: undefined
      };
    }
    
    await updateVessel(vessel.id, updates);
    
    setNewTransaction({ type: 'refill', status: 'pending', amount: 0, deposit: 0 });
    setIsTransactionDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Transaction recorded successfully",
    });
  };

  const updateVesselStatus = async (vesselId: string, status: Vessel['status']) => {
    await updateVessel(vesselId, { status });
    toast({
      title: "Success",
      description: "Vessel status updated",
    });
  };

  const exportData = () => {
    const data = {
      vessels,
      transactions,
      stats: vesselStats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refilling_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Refilling data exported successfully",
    });
  };

  if (showPOS) {
    return <OfflinePOS businessType="refilling" onClose={() => setShowPOS(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* POS Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowPOS(true)}
          className="bg-success hover:bg-success/90 text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Refilling POS
        </Button>
      </div>

      {!isOnline && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">Offline Mode - All data saved locally using IndexedDB</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vessels</p>
                <p className="text-2xl font-bold">{vesselStats.total}</p>
              </div>
              <Fuel className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empty Vessels</p>
                <p className="text-2xl font-bold text-destructive">{vesselStats.empty}</p>
              </div>
              <Package className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filled Vessels</p>
                <p className="text-2xl font-bold text-success">{vesselStats.filled}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-warning">{vesselStats.inMaintenance}</p>
              </div>
              <Wrench className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-info">{vesselStats.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-success">{formatIndianCurrency(vesselStats.totalRevenue)}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vessels" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="vessels">Vessel Tracking</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Dialog open={isVesselDialogOpen} onOpenChange={setIsVesselDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vessel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Vessel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vesselNumber">Vessel Number *</Label>
                    <Input
                      id="vesselNumber"
                      value={newVessel.vesselNumber || ''}
                      onChange={(e) => setNewVessel(prev => ({ ...prev, vesselNumber: e.target.value }))}
                      placeholder="e.g., LP001, OX002"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Gas Type *</Label>
                    <Select value={newVessel.type} onValueChange={(value) => setNewVessel(prev => ({ ...prev, type: value as any, size: '' }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vesselTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="size">Size *</Label>
                    <Select value={newVessel.size} onValueChange={(value) => setNewVessel(prev => ({ ...prev, size: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {newVessel.type && vesselSizes[newVessel.type as keyof typeof vesselSizes]?.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">Refill Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newVessel.price || ''}
                      onChange={(e) => setNewVessel(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deposit">Security Deposit (₹)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      value={newVessel.deposit || ''}
                      onChange={(e) => setNewVessel(prev => ({ ...prev, deposit: parseFloat(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>

                  <Button onClick={addVessel} className="w-full">
                    Add Vessel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="vessels" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vessels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="empty">Empty</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="in-maintenance">Maintenance</SelectItem>
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {vesselTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vessel Inventory ({filteredVessels.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vessel #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Refill Count</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVessels.map((vessel) => (
                    <TableRow key={vessel.id}>
                      <TableCell className="font-medium">{vessel.vesselNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vesselTypes.find(t => t.value === vessel.type)?.icon}
                          {vesselTypes.find(t => t.value === vessel.type)?.label}
                        </div>
                      </TableCell>
                      <TableCell>{vessel.size}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(vessel.status)} className="gap-1">
                          {getStatusIcon(vessel.status)}
                          {vessel.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{vessel.customerName || '-'}</TableCell>
                      <TableCell>{vessel.refillCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={vessel.status}
                            onValueChange={(value) => updateVesselStatus(vessel.id, value as Vessel['status'])}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empty">Empty</SelectItem>
                              <SelectItem value="filled">Filled</SelectItem>
                              <SelectItem value="in-maintenance">Maintenance</SelectItem>
                              <SelectItem value="in-transit">In Transit</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vesselSelect">Select Vessel *</Label>
                    <Select value={newTransaction.vesselId} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, vesselId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vessel" />
                      </SelectTrigger>
                      <SelectContent>
                        {vessels.map(vessel => (
                          <SelectItem key={vessel.id} value={vessel.id}>
                            {vessel.vesselNumber} - {vessel.type} ({vessel.size})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <Select value={newTransaction.type} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, type: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refill">Refill</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={newTransaction.customerName || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newTransaction.amount || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deposit">Deposit (₹)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      value={newTransaction.deposit || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, deposit: parseFloat(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>

                  {newTransaction.type === 'delivery' && (
                    <>
                      <div>
                        <Label htmlFor="driverName">Driver Name</Label>
                        <Input
                          id="driverName"
                          value={newTransaction.driverName || ''}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, driverName: e.target.value }))}
                          placeholder="Driver name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                        <Input
                          id="vehicleNumber"
                          value={newTransaction.vehicleNumber || ''}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                          placeholder="Vehicle number"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newTransaction.notes || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes"
                    />
                  </div>

                  <Button onClick={addTransaction} className="w-full">
                    Record Transaction
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vessel #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(-10).reverse().map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.vesselNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.type}</Badge>
                      </TableCell>
                      <TableCell>{transaction.customerName}</TableCell>
                      <TableCell>{formatIndianCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vessel #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Refill Count</TableHead>
                    <TableHead>Next Maintenance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vessels
                    .filter(vessel => vessel.nextMaintenanceDue)
                    .sort((a, b) => new Date(a.nextMaintenanceDue!).getTime() - new Date(b.nextMaintenanceDue!).getTime())
                    .map((vessel) => {
                      const dueDate = new Date(vessel.nextMaintenanceDue!);
                      const isOverdue = dueDate < new Date();
                      const isDueSoon = dueDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000; // 30 days
                      
                      return (
                        <TableRow key={vessel.id}>
                          <TableCell className="font-medium">{vessel.vesselNumber}</TableCell>
                          <TableCell>{vesselTypes.find(t => t.value === vessel.type)?.label}</TableCell>
                          <TableCell>{vessel.refillCount}</TableCell>
                          <TableCell>
                            <span className={isOverdue ? 'text-destructive font-bold' : isDueSoon ? 'text-warning font-medium' : ''}>
                              {vessel.nextMaintenanceDue}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={vessel.status === 'in-maintenance' ? 'secondary' : 'outline'}>
                              {vessel.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {vessel.status !== 'in-maintenance' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateVesselStatus(vessel.id, 'in-maintenance')}
                              >
                                <Wrench className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}