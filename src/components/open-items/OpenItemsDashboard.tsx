import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { getCurrentUserId, filterByUserId } from "@/lib/userUtils";
import { formatIndianCurrency } from "@/lib/indian-tax-utils";

interface ItemType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  location_id?: string;
  created_at?: string;
  last_updated?: string;
}

interface OpenItem {
  id: string;
  location_id?: string;
  item_type_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  price: number;
  tax_rate_id?: string;
  status: 'open' | 'closed' | 'transferred';
  created_at?: string;
  last_updated?: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
}

export function OpenItemsDashboard() {
  const [openItems, setOpenItems] = useState<OpenItem[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OpenItem | null>(null);
  const [editingType, setEditingType] = useState<ItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'transferred'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  const [itemFormData, setItemFormData] = useState<Partial<OpenItem>>({
    name: '',
    description: '',
    quantity: 1,
    unit: '',
    price: 0,
    tax_rate_id: '',
    status: 'open',
    item_type_id: ''
  });

  const [typeFormData, setTypeFormData] = useState<Partial<ItemType>>({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = await getCurrentUserId();
      const [items, types, taxes] = await Promise.all([
        dbGetAll<OpenItem>('open_items'),
        dbGetAll<ItemType>('item_types'),
        dbGetAll<TaxRate>('tax_rates')
      ]);

      const userItems = userId ? filterByUserId(items || [], userId) : (items || []);
      const userTypes = userId ? filterByUserId(types || [], userId) : (types || []);
      const userTaxes = userId ? filterByUserId(taxes || [], userId) : (taxes || []);

      setOpenItems(userItems);
      setItemTypes(userTypes.filter(t => t.is_active));
      setTaxRates(userTaxes.filter(t => t.is_active || true));
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load open items",
        variant: "destructive"
      });
    }
  };

  const filteredItems = openItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.item_type_id === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSaveItem = async () => {
    try {
      if (!itemFormData.name || !itemFormData.price) {
        toast({
          title: "Validation Error",
          description: "Name and price are required",
          variant: "destructive"
        });
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to save items",
          variant: "destructive"
        });
        return;
      }

      const itemData: OpenItem = {
        id: editingItem?.id || `open_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...itemFormData,
        name: itemFormData.name!,
        price: Number(itemFormData.price) || 0,
        quantity: Number(itemFormData.quantity) || 1,
        status: (itemFormData.status as OpenItem['status']) || 'open'
      } as OpenItem;

      await dbPut('open_items', itemData);
      await loadData();
      
      toast({
        title: "Success",
        description: `Item ${editingItem ? 'updated' : 'added'} successfully`
      });

      setShowItemModal(false);
      setEditingItem(null);
      setItemFormData({
        name: '',
        description: '',
        quantity: 1,
        unit: '',
        price: 0,
        tax_rate_id: '',
        status: 'open',
        item_type_id: ''
      });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive"
      });
    }
  };

  const handleSaveType = async () => {
    try {
      if (!typeFormData.name) {
        toast({
          title: "Validation Error",
          description: "Type name is required",
          variant: "destructive"
        });
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to save item types",
          variant: "destructive"
        });
        return;
      }

      const typeData: ItemType = {
        id: editingType?.id || `item_type_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...typeFormData,
        name: typeFormData.name!,
        is_active: typeFormData.is_active ?? true
      } as ItemType;

      await dbPut('item_types', typeData);
      await loadData();
      
      toast({
        title: "Success",
        description: `Item type ${editingType ? 'updated' : 'added'} successfully`
      });

      setShowTypeModal(false);
      setEditingType(null);
      setTypeFormData({
        name: '',
        description: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error saving type:', error);
      toast({
        title: "Error",
        description: "Failed to save item type",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await dbDelete('open_items', id);
      await loadData();
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const handleEditItem = (item: OpenItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      tax_rate_id: item.tax_rate_id,
      status: item.status,
      item_type_id: item.item_type_id
    });
    setShowItemModal(true);
  };

  const handleEditType = (type: ItemType) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      description: type.description,
      is_active: type.is_active
    });
    setShowTypeModal(true);
  };

  const getStatusBadge = (status: OpenItem['status']) => {
    const variants = {
      open: 'default',
      closed: 'secondary',
      transferred: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTotalValue = () => {
    return filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Open Items Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage open items, types, and track inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingItem(null);
                setItemFormData({
                  name: '',
                  description: '',
                  quantity: 1,
                  unit: '',
                  price: 0,
                  tax_rate_id: '',
                  status: 'open',
                  item_type_id: ''
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Open Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                    placeholder="Enter item name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData({...itemFormData, quantity: Number(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={itemFormData.unit}
                      onChange={(e) => setItemFormData({...itemFormData, unit: e.target.value})}
                      placeholder="kg, pcs, etc."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({...itemFormData, price: Number(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="item_type">Item Type</Label>
                  <Select
                    value={itemFormData.item_type_id || ''}
                    onValueChange={(value) => setItemFormData({...itemFormData, item_type_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {itemTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tax_rate">Tax Rate</Label>
                  <Select
                    value={itemFormData.tax_rate_id || ''}
                    onValueChange={(value) => setItemFormData({...itemFormData, tax_rate_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {taxRates.map(rate => (
                        <SelectItem key={rate.id} value={rate.id}>{rate.name} ({rate.rate}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={itemFormData.status || 'open'}
                    onValueChange={(value) => setItemFormData({...itemFormData, status: value as OpenItem['status']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveItem}>
                    {editingItem ? 'Update' : 'Add'} Item
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Open Items</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {itemTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const itemType = itemTypes.find(t => t.id === item.item_type_id);
                  const total = item.price * item.quantity;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{itemType?.name || '-'}</TableCell>
                      <TableCell>{item.quantity} {item.unit || ''}</TableCell>
                      <TableCell>{formatIndianCurrency(item.price)}</TableCell>
                      <TableCell>{formatIndianCurrency(total)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {filteredItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-lg font-semibold">
                Total Value: {formatIndianCurrency(getTotalValue())}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Item Types</CardTitle>
            <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setEditingType(null);
                  setTypeFormData({
                    name: '',
                    description: '',
                    is_active: true
                  });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingType ? 'Edit' : 'Add'} Item Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type_name">Type Name *</Label>
                    <Input
                      id="type_name"
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                      placeholder="Enter type name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type_description">Description</Label>
                    <Textarea
                      id="type_description"
                      value={typeFormData.description}
                      onChange={(e) => setTypeFormData({...typeFormData, description: e.target.value})}
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowTypeModal(false);
                      setEditingType(null);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveType}>
                      {editingType ? 'Update' : 'Add'} Type
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemTypes.map((type) => (
              <Card key={type.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditType(type)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {type.description || 'No description'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {itemTypes.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No item types found. Create one to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


