import { useEffect, useState } from "react";
import { Plus, Package, TrendingUp, AlertTriangle, Search, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OfflinePOS } from "@/components/pos/OfflinePOS";
import { dbGetAll } from "@/lib/indexeddb";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
}

export function InventoryDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPOS, setShowPOS] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    id: "",
    name: "",
    sku: "",
    price: 0,
    stock: 0,
    lowStockThreshold: 0,
    category: ""
  });

  useEffect(() => {
    (async () => {
      const rows = await dbGetAll<Product>('products');
      setProducts(rows);
    })();
  }, []);

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.sku) return;
    const prod = newProduct.id
      ? newProduct
      : { ...newProduct, id: `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
    await dbPut('products', prod);
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      return exists ? prev.map((p) => (p.id === prod.id ? prod : p)) : [...prev, prod];
    });
    setShowAdd(false);
    setNewProduct({ id: "", name: "", sku: "", price: 0, stock: 0, lowStockThreshold: 0, category: "" });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  if (showPOS) {
    return <OfflinePOS businessType="retail" onClose={() => setShowPOS(false)} />;
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
          Open POS
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-warning">{lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inventory Management</CardTitle>
            <Button className="bg-gradient-primary" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={newProduct.name} onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input value={newProduct.sku} onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Stock</label>
                  <Input type="number" value={newProduct.stock} onChange={(e) => setNewProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input type="number" value={newProduct.lowStockThreshold} onChange={(e) => setNewProduct(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={newProduct.category} onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleSaveProduct}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products Table */}
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <Badge variant="secondary">{product.category}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">₹{product.price}</p>
                    <p className="text-muted-foreground">Price</p>
                  </div>
                  
                  <div className="text-center">
                    <p className={`font-medium ${
                      product.stock <= product.lowStockThreshold ? 'text-warning' : 'text-foreground'
                    }`}>
                      {product.stock}
                    </p>
                    <p className="text-muted-foreground">Stock</p>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}