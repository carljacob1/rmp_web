import { useEffect, useState, useRef } from "react";
import { Plus, Package, TrendingUp, AlertTriangle, Search, CreditCard, Tag, Edit, Trash2, Image as ImageIcon, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OfflinePOS } from "@/components/pos/OfflinePOS";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { useToast } from "@/hooks/use-toast";
import { BulkUpload } from "@/components/common/BulkUpload";
import { getCurrentUserId, filterByUserId } from "@/lib/userUtils";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
  image?: string; // Base64 image data
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
  image?: string; // Base64 image data
}

export function InventoryDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPOS, setShowPOS] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newProduct, setNewProduct] = useState<Product>({
    id: "",
    name: "",
    sku: "",
    price: 0,
    stock: 0,
    lowStockThreshold: 0,
    category: "",
    image: ""
  });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string>("");
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadProducts = async () => {
    // Wait a bit for AppPage to load user into localStorage
    await new Promise(resolve => setTimeout(resolve, 150));
    const userId = await getCurrentUserId();
    const rows = await dbGetAll<Product>('products');
    // Filter by userId to show only current user's products
    const userProducts = userId ? filterByUserId(rows, userId) : rows;
    setProducts(userProducts);
  };

  const loadCategories = async () => {
    // Wait a bit for AppPage to load user into localStorage
    await new Promise(resolve => setTimeout(resolve, 150));
    const userId = await getCurrentUserId();
    const rows = await dbGetAll<Category>('categories');
    // Filter by userId to show only current user's categories
    const userCategories = userId ? filterByUserId(rows, userId) : rows;
    // Sort by sortOrder if available, otherwise by name
    const sorted = userCategories.sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
    setCategories(sorted);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadProducts(), loadCategories()]);
    };
    
    loadData();
    
    // Listen for inventory update events from POS
    const handleInventoryUpdate = () => {
      loadProducts();
    };
    
    // Reload products when window gains focus (in case stock was updated in POS)
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('inventory-updated', handleInventoryUpdate);
    window.addEventListener('focus', handleFocus);
    
    // Also reload periodically (every 5 seconds) as fallback
    const interval = setInterval(() => {
      loadProducts();
    }, 5000);
    
    return () => {
      window.removeEventListener('inventory-updated', handleInventoryUpdate);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Convert image file to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'category') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 2MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const base64 = await convertImageToBase64(file);
      
      if (type === 'product') {
        setProductImagePreview(base64);
        setProductImageFile(file);
        setNewProduct(prev => ({ ...prev, image: base64 }));
      } else {
        // For category images, handled in CategoryForm
        return base64;
      }
    } catch (error) {
      console.error('Error converting image:', error);
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
    }
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!newProduct.name || !newProduct.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!newProduct.sku || !newProduct.sku.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU is required",
        variant: "destructive"
      });
      return;
    }

    if (newProduct.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Price must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      const prod = newProduct.id
        ? newProduct
        : { ...newProduct, id: `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
      
      // Ensure timestamps for sync and normalize keys before saving
      const now = new Date().toISOString();
      
      // Get current user ID (with retry if not found immediately)
      let userId = await getCurrentUserId();
      if (!userId) {
        // Wait a bit and try again (AppPage might still be loading user)
        await new Promise(resolve => setTimeout(resolve, 200));
        userId = await getCurrentUserId();
      }
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to save products",
          variant: "destructive"
        });
        return;
      }

      // IMPORTANT: Normalize keys BEFORE saving to IndexedDB
      const { forceAllKeysToLowercase } = await import('@/lib/keyNormalizer');
      const normalized = forceAllKeysToLowercase({
        ...prod,
        userId: userId, // Add userId for data isolation
        updated_at: prod.updated_at || now,
        created_at: prod.created_at || now
      });
      
      // Add camelCase alias for TypeScript code (for local use only)
      const prodWithTimestamps = {
        ...normalized,
        lowStockThreshold: normalized.lowstockthreshold
      };
      
      await dbPut('products', prodWithTimestamps);
      
      // Reload products from IndexedDB to ensure consistency
      await loadProducts();
      
      toast({
        title: "Success",
        description: `Product "${prod.name}" ${newProduct.id ? 'updated' : 'added'} successfully`,
      });
      
      setShowAdd(false);
      setNewProduct({ id: "", name: "", sku: "", price: 0, stock: 0, lowStockThreshold: 0, category: "", image: "" });
      setProductImageFile(null);
      setProductImagePreview("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive"
      });
      console.error('Error saving product:', error);
    }
  };

  // Get unique category names from products (for backward compatibility with text-based categories)
  const getUniqueCategoryNames = () => {
    const categoryNames = new Set<string>();
    products.forEach(product => {
      if (product.category && product.category.trim()) {
        const categoryValue = product.category.trim();
        // Skip if it's a category ID (starts with "cat_" and matches ID pattern)
        if (categoryValue.startsWith('cat_') && /^cat_\d+_[a-z0-9]+$/.test(categoryValue)) {
          // This is likely a category ID, try to find the category name
          const categoryObj = categories.find(c => c.id === categoryValue);
          if (categoryObj) {
            // Category found, use the name instead
            return; // Don't add ID to list
          }
        }
        // Only add if it's not already a category name in our categories list
        const existsAsCategory = categories.some(c => c.id === categoryValue || c.name === categoryValue);
        if (!existsAsCategory) {
          categoryNames.add(categoryValue);
        }
      }
    });
    return Array.from(categoryNames).sort();
  };

  const handleSaveCategory = async (category: Category) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      toast({
        title: "Error",
        description: "Please log in to save categories",
        variant: "destructive"
      });
      return;
    }

    const categoryWithId = category.id 
      ? { ...category, userId }
      : { ...category, id: `cat_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, userId };
    
    await dbPut<Category>('categories', categoryWithId);
    await loadCategories();
    toast({ 
      title: editingCategory ? "Category updated successfully" : "Category added successfully" 
    });
    setEditingCategory(null);
    setShowAddCategory(false);
  };

  // Filter products by search term and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === "all") {
      return matchesSearch;
    }
    
    // Match by category ID if product.category is an ID, or by name if it's a text category
    const productCategory = product.category || '';
    const matchesCategory = productCategory === selectedCategory || 
      productCategory === categories.find(c => c.id === selectedCategory)?.name;
    
    return matchesSearch && matchesCategory;
  });

  // Get category name (handle both ID and text-based categories)
  const getCategoryName = (categoryValue: string) => {
    if (!categoryValue) return "Uncategorized";
    const trimmedValue = categoryValue.trim();
    
    // Check if it's a category ID (pattern: cat_timestamp_random)
    if (trimmedValue.startsWith('cat_') && /^cat_\d+_[a-z0-9]+$/.test(trimmedValue)) {
      const category = categories.find(c => c.id === trimmedValue);
      if (category) return category.name || category.id;
    }
    
    // Check if it matches any category ID
    const categoryById = categories.find(c => c.id === trimmedValue);
    if (categoryById) return categoryById.name || categoryById.id;
    
    // Check if it matches any category name
    const categoryByName = categories.find(c => c.name === trimmedValue);
    if (categoryByName) return categoryByName.name;
    
    // Otherwise return as-is (text-based category)
    return trimmedValue;
  };

  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  if (showPOS) {
    return <OfflinePOS businessType="retail" onClose={() => setShowPOS(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <BulkUpload
          businessType="retail"
          storeName="products"
          fields={[
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'sku', label: 'SKU', type: 'text', required: true },
            { name: 'price', label: 'Price', type: 'number', required: true },
            { name: 'stock', label: 'Stock', type: 'number', required: false },
            { name: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number', required: false },
            { name: 'category', label: 'Category', type: 'text', required: false },
            { name: 'description', label: 'Description', type: 'text', required: false }
          ]}
          onUploadComplete={() => {
            loadProducts();
            loadCategories();
          }}
        />
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

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Categories</h3>
            <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
                  <Tag className="h-3 w-3 mr-1" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CategoryForm 
                  category={editingCategory} 
                  onSave={handleSaveCategory}
                  onCancel={() => {
                    setEditingCategory(null);
                    setShowAddCategory(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Products ({products.length})
            </Button>
            {categories.map(category => {
              const count = products.filter(p => {
                const productCategory = p.category || '';
                // Match by category ID or category name
                return productCategory === category.id || 
                       productCategory === category.name ||
                       // Also handle case where product has category as ID stored as string
                       (productCategory.trim() === category.id.trim());
              }).length;
              if (count === 0) return null; // Don't show categories with no products
              const categoryImage = category.image || (category as any).image || '';
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {categoryImage && (
                    <img 
                      src={categoryImage} 
                      alt={category.name}
                      className="h-4 w-4 object-cover rounded"
                    />
                  )}
                  {category.name || category.id} ({count})
                </Button>
              );
            })}
            {/* Show text-based categories from products (exclude IDs) */}
            {getUniqueCategoryNames()
              .filter(name => {
                // Filter out category IDs (pattern: cat_timestamp_random)
                if (name.startsWith('cat_') && /^cat_\d+_[a-z0-9]+$/.test(name)) {
                  return false; // Don't show IDs
                }
                // Filter out if it matches any category ID or name
                return !categories.find(c => c.id === name || c.name === name);
              })
              .map(categoryName => {
                const count = products.filter(p => {
                  const productCategory = (p.category || '').trim();
                  // Match exact or check if it's a category ID that should match this name
                  return productCategory === categoryName;
                }).length;
                if (count === 0) return null; // Don't show empty categories
                return (
                  <Button
                    key={`text-${categoryName}`}
                    variant={selectedCategory === categoryName ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(categoryName)}
                  >
                    {categoryName} ({count})
                  </Button>
                );
              })
              .filter(Boolean)}
          </div>
        </CardContent>
      </Card>

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
          <Dialog open={showAdd} onOpenChange={(open) => {
            setShowAdd(open);
            if (!open) {
              // Reset form when dialog closes
              setNewProduct({ id: "", name: "", sku: "", price: 0, stock: 0, lowStockThreshold: 0, category: "", image: "" });
              setProductImageFile(null);
              setProductImagePreview("");
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{newProduct.id ? "Edit Product" : "Add Product"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input 
                    value={newProduct.name} 
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU *</label>
                  <Input 
                    value={newProduct.sku} 
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Product SKU"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price *</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    value={newProduct.price || ''} 
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Stock</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={newProduct.stock || ''} 
                    onChange={(e) => setNewProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={newProduct.lowStockThreshold || ''} 
                    onChange={(e) => setNewProduct(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select 
                    value={newProduct.category || undefined} 
                    onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No categories available. Create one using "Add Category" button.
                        </div>
                      ) : (
                        categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Select a category or leave empty for uncategorized products
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Product Image</label>
                  <div className="space-y-2">
                    {productImagePreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={productImagePreview} 
                          alt="Product preview" 
                          className="h-32 w-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-0 right-0 -mt-2 -mr-2 h-6 w-6 p-0 rounded-full"
                          onClick={() => {
                            setProductImagePreview("");
                            setProductImageFile(null);
                            setNewProduct(prev => ({ ...prev, image: "" }));
                            if (productImageInputRef.current) {
                              productImageInputRef.current.value = '';
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center">
                        <input
                          ref={productImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'product')}
                          className="hidden"
                          id="product-image-upload"
                        />
                        <label
                          htmlFor="product-image-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                          <span className="text-xs text-muted-foreground mt-1">JPG, PNG (max 2MB)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAdd(false);
                    setNewProduct({ id: "", name: "", sku: "", price: 0, stock: 0, lowStockThreshold: 0, category: "" });
                  }}
                >
                  Cancel
                </Button>
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
            {filteredProducts.map((product) => {
              const productImage = product.image || (product as any).image || '';
              return (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {/* Product Image */}
                    {productImage ? (
                      <img 
                        src={productImage} 
                        alt={product.name}
                        className="h-16 w-16 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded-lg border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <Badge variant="secondary">{getCategoryName(product.category || '')}</Badge>
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
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Load product data - handle both camelCase and lowercase keys
                      const productData: Product = {
                        id: product.id || (product as any).id || '',
                        name: product.name || (product as any).name || '',
                        sku: product.sku || (product as any).sku || '',
                        price: product.price ?? (product as any).price ?? 0,
                        stock: product.stock ?? (product as any).stock ?? 0,
                        lowStockThreshold: product.lowStockThreshold ?? (product as any).lowstockthreshold ?? (product as any).lowStockThreshold ?? 0,
                        category: product.category || (product as any).category || '',
                        image: product.image || (product as any).image || ''
                      };
                      setNewProduct(productData);
                      setProductImagePreview(productData.image || '');
                      setShowAdd(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryForm({ category, onSave, onCancel }: {
  category?: Category | null;
  onSave: (category: Category) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Category>(category || {
    id: "",
    name: "",
    description: "",
    sortOrder: 0,
    image: ""
  });
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>(category?.image || "");
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 2MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCategoryImagePreview(base64);
        setFormData(prev => ({ ...prev, image: base64 }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error converting image:', error);
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium">Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            placeholder="Category name"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Sort Order</label>
          <Input
            type="number"
            value={formData.sortOrder || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Lower numbers appear first in the category list
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Category Image</label>
          <div className="space-y-2">
            {categoryImagePreview ? (
              <div className="relative inline-block">
                <img 
                  src={categoryImagePreview} 
                  alt="Category preview" 
                  className="h-32 w-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-0 right-0 -mt-2 -mr-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => {
                    setCategoryImagePreview("");
                    setFormData(prev => ({ ...prev, image: "" }));
                    if (categoryImageInputRef.current) {
                      categoryImageInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  ref={categoryImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCategoryImageUpload}
                  className="hidden"
                  id="category-image-upload"
                />
                <label
                  htmlFor="category-image-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG (max 2MB)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Category</Button>
        </div>
      </form>
    </div>
  );
}