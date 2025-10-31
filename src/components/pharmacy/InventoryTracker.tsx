import { useState, useEffect } from "react";
import { Package, AlertTriangle, Calendar, Search, Plus, Edit, Trash2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { BulkUpload } from "@/components/common/BulkUpload";

interface Medicine {
  id: string;
  name: string;
  brand: string;
  category: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  prescription: boolean;
  activeIngredient: string;
  dosage: string;
  form: "tablet" | "capsule" | "syrup" | "injection" | "cream" | "drops";
  lowStockThreshold: number;
}

// No hardcoded data; medicines are loaded from IndexedDB

export function InventoryTracker() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const { toast } = useToast();

  // Load medicines from IndexedDB
  useEffect(() => {
    (async () => {
      const items = await dbGetAll<Medicine>('medicines');
      setMedicines(items);
    })();
  }, []);

  // Check for expiring medicines on component updates
  useEffect(() => {
    checkExpiringMedicines();
  }, [medicines]);

  const checkExpiringMedicines = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringSoon = medicines.filter(medicine => {
      const expiryDate = new Date(medicine.expiryDate);
      return expiryDate <= thirtyDaysFromNow && expiryDate > today;
    });
    
    const expired = medicines.filter(medicine => {
      const expiryDate = new Date(medicine.expiryDate);
      return expiryDate <= today;
    });

    if (expired.length > 0) {
      toast({
        title: "Expired Medicines",
        description: `${expired.length} medicines have expired and need immediate attention`,
        variant: "destructive"
      });
    }

    if (expiringSoon.length > 0) {
      toast({
        title: "Expiring Soon",
        description: `${expiringSoon.length} medicines expire within 30 days`,
        variant: "destructive"
      });
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { status: "expired", color: "bg-destructive text-destructive-foreground" };
    if (daysUntilExpiry <= 30) return { status: "expiring", color: "bg-warning text-warning-foreground" };
    if (daysUntilExpiry <= 90) return { status: "caution", color: "bg-accent text-accent-foreground" };
    return { status: "good", color: "bg-success text-success-foreground" };
  };

  const getFilteredMedicines = () => {
    return medicines.filter(medicine => {
      const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          medicine.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          medicine.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || medicine.category === categoryFilter;
      
      let matchesExpiry = true;
      if (expiryFilter === "expired") {
        matchesExpiry = getExpiryStatus(medicine.expiryDate).status === "expired";
      } else if (expiryFilter === "expiring") {
        matchesExpiry = getExpiryStatus(medicine.expiryDate).status === "expiring";
      } else if (expiryFilter === "low-stock") {
        matchesExpiry = medicine.quantity <= medicine.lowStockThreshold;
      }
      
      return matchesSearch && matchesCategory && matchesExpiry;
    });
  };

  const categories = [...new Set(medicines.map(m => m.category))];
  const totalValue = medicines.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
  const lowStockCount = medicines.filter(m => m.quantity <= m.lowStockThreshold).length;
  const expiringCount = medicines.filter(m => {
    const status = getExpiryStatus(m.expiryDate);
    return status.status === "expired" || status.status === "expiring";
  }).length;

  const handleSaveMedicine = async (medicine: Medicine) => {
    const withId = medicine.id ? medicine : { ...medicine, id: Date.now().toString() };
    await dbPut('medicines', withId);
    setMedicines(prev => {
      const exists = prev.some(m => m.id === withId.id);
      return exists ? prev.map(m => m.id === withId.id ? withId : m) : [...prev, withId];
    });
    toast({ title: editingMedicine ? "Medicine updated successfully" : "Medicine added successfully" });
    setEditingMedicine(null);
    setIsAddingMedicine(false);
  };

  const handleDeleteMedicine = async (id: string) => {
    await dbDelete('medicines', id);
    setMedicines(prev => prev.filter(m => m.id !== id));
    toast({ title: "Medicine deleted successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pharmacy Inventory</h2>
        <div className="flex gap-2">
          <BulkUpload
            businessType="healthcare"
            storeName="medicines"
            fields={[
              { name: 'name', label: 'Medicine Name', type: 'text', required: true },
              { name: 'manufacturer', label: 'Manufacturer', type: 'text', required: false },
              { name: 'batchNumber', label: 'Batch Number', type: 'text', required: false },
              { name: 'expiryDate', label: 'Expiry Date', type: 'text', required: false },
              { name: 'quantity', label: 'Quantity', type: 'number', required: true },
              { name: 'price', label: 'Price', type: 'number', required: true },
              { name: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number', required: false },
              { name: 'category', label: 'Category', type: 'text', required: false }
            ]}
            onUploadComplete={async () => {
              const rows = await dbGetAll<Medicine>('medicines');
              setMedicines(rows);
            }}
          />
          <Dialog open={isAddingMedicine} onOpenChange={setIsAddingMedicine}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <MedicineForm 
              medicine={editingMedicine}
              onSave={handleSaveMedicine}
              onCancel={() => {
                setEditingMedicine(null);
                setIsAddingMedicine(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Medicines</p>
                <p className="text-2xl font-bold">{medicines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring/Expired</p>
                <p className="text-2xl font-bold text-destructive">{expiringCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medicine List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {getFilteredMedicines().map(medicine => {
          const expiryStatus = getExpiryStatus(medicine.expiryDate);
          const isLowStock = medicine.quantity <= medicine.lowStockThreshold;
          
          return (
            <Card key={medicine.id} className={`${expiryStatus.status === 'expired' ? 'border-destructive' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{medicine.name}</h3>
                    <p className="text-sm text-muted-foreground">{medicine.brand}</p>
                    <Badge variant="secondary" className="mt-1">{medicine.category}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingMedicine(medicine)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <MedicineForm 
                          medicine={medicine}
                          onSave={handleSaveMedicine}
                          onCancel={() => setEditingMedicine(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteMedicine(medicine.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Batch: {medicine.batchNumber}</span>
                    <span className="font-medium">₹{medicine.unitPrice}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span>Form: {medicine.form}</span>
                    <span>Dosage: {medicine.dosage}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isLowStock ? 'text-warning font-medium' : ''}`}>
                      Stock: {medicine.quantity}
                      {isLowStock && ' (Low)'}
                    </span>
                    <Badge className={expiryStatus.color}>
                      {expiryStatus.status === 'expired' ? 'Expired' :
                       expiryStatus.status === 'expiring' ? 'Expiring Soon' :
                       expiryStatus.status === 'caution' ? 'Monitor' : 'Good'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Expires: {new Date(medicine.expiryDate).toLocaleDateString()}
                  </div>
                  
                  {medicine.prescription && (
                    <Badge variant="outline" className="text-xs">
                      Prescription Required
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MedicineForm({ 
  medicine, 
  onSave, 
  onCancel 
}: {
  medicine?: Medicine | null;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Medicine>(medicine || {
    id: "",
    name: "",
    brand: "",
    category: "",
    batchNumber: "",
    expiryDate: "",
    manufacturingDate: "",
    quantity: 0,
    unitPrice: 0,
    supplier: "",
    prescription: false,
    activeIngredient: "",
    dosage: "",
    form: "tablet",
    lowStockThreshold: 10
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) return;
    onSave(formData);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{medicine ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Medicine Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Brand</label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Batch Number</label>
            <Input
              value={formData.batchNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Manufacturing Date</label>
            <Input
              type="date"
              value={formData.manufacturingDate}
              onChange={(e) => setFormData(prev => ({ ...prev, manufacturingDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Unit Price</label>
            <Input
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Low Stock Alert</label>
            <Input
              type="number"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Form</label>
            <Select value={formData.form} onValueChange={(value: any) => setFormData(prev => ({ ...prev, form: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="capsule">Capsule</SelectItem>
                <SelectItem value="syrup">Syrup</SelectItem>
                <SelectItem value="injection">Injection</SelectItem>
                <SelectItem value="cream">Cream</SelectItem>
                <SelectItem value="drops">Drops</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Dosage</label>
            <Input
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder="e.g., 500mg, 5ml"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Active Ingredient</label>
          <Input
            value={formData.activeIngredient}
            onChange={(e) => setFormData(prev => ({ ...prev, activeIngredient: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Supplier</label>
          <Input
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.prescription}
            onChange={(e) => setFormData(prev => ({ ...prev, prescription: e.target.checked }))}
            className="h-4 w-4"
          />
          <label className="text-sm font-medium">Prescription Required</label>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Medicine</Button>
        </div>
      </form>
    </div>
  );
}