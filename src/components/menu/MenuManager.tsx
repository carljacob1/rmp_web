import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Tag, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Modifier {
  id: string;
  name: string;
  price: number;
  required: boolean;
}

interface Variation {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  modifiers: Modifier[];
  variations: Variation[];
  tags: string[];
  expiryDate?: string; // For pharmacy/healthcare
}

interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { deleteOne, syncCategoriesToLocal, syncProductsToLocal, upsertOne } from "@/lib/sync";
import { BulkUpload } from "@/components/common/BulkUpload";

export function MenuManager({ businessType = "restaurant" }: { businessType?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      // Try pulling latest from Supabase into local, then read local
      try {
        await Promise.all([syncCategoriesToLocal(), syncProductsToLocal()]);
      } catch {}
      const [cats, products] = await Promise.all([
        dbGetAll<Category>('categories'),
        dbGetAll<MenuItem>('products')
      ]);
      setCategories(cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setMenuItems(products);
    })();
  }, []);

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || "Unknown";
  };

  const handleSaveItem = async (item: MenuItem) => {
    const itemWithId = item.id ? item : { ...item, id: `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
    await dbPut<MenuItem>('products', itemWithId);
    try { await upsertOne('products', itemWithId as any); } catch {}
    setMenuItems(prev => {
      const exists = prev.some(i => i.id === itemWithId.id);
      return exists ? prev.map(i => i.id === itemWithId.id ? itemWithId : i) : [...prev, itemWithId];
    });
    toast({ title: editingItem ? "Item updated successfully" : "Item added successfully" });
    setEditingItem(null);
    setIsAddingItem(false);
  };

  const handleDeleteItem = async (id: string) => {
    await dbDelete('products', id);
    try { await deleteOne('products', id); } catch {}
    setMenuItems(prev => prev.filter(item => item.id !== id));
    toast({ title: "Item deleted successfully" });
  };

  const handleSaveCategory = async (category: Category) => {
    const categoryWithId = category.id ? category : { ...category, id: `cat_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
    await dbPut<Category>('categories', categoryWithId);
    try { await upsertOne('categories', categoryWithId as any); } catch {}
    setCategories(prev => {
      const exists = prev.some(c => c.id === categoryWithId.id);
      const next = exists ? prev.map(c => c.id === categoryWithId.id ? categoryWithId : c) : [...prev, categoryWithId];
      return next.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
    toast({ title: editingCategory ? "Category updated successfully" : "Category added successfully" });
    setEditingCategory(null);
    setIsAddingCategory(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <div className="flex gap-2">
          <BulkUpload
            businessType={businessType}
            storeName="products"
            fields={[
              { name: 'name', label: 'Name', type: 'text', required: true },
              { name: 'price', label: 'Price', type: 'number', required: true },
              { name: 'category', label: 'Category', type: 'text', required: false },
              { name: 'description', label: 'Description', type: 'text', required: false },
              { name: 'stock', label: 'Stock', type: 'number', required: false }
            ]}
            onUploadComplete={() => {
              loadMenu();
              loadCategories();
            }}
          />
          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CategoryForm 
                category={editingCategory} 
                onSave={handleSaveCategory}
                onCancel={() => setIsAddingCategory(false)}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <MenuItemForm 
                item={editingItem}
                categories={categories}
                businessType={businessType}
                onSave={handleSaveItem}
                onCancel={() => {
                  setEditingItem(null);
                  setIsAddingItem(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Items ({menuItems.length})
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name} ({menuItems.filter(item => item.category === category.id).length})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <Card key={item.id} className={`${!item.available ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  <Badge variant="secondary">{getCategoryName(item.category)}</Badge>
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <MenuItemForm 
                        item={item}
                        categories={categories}
                        businessType={businessType}
                        onSave={handleSaveItem}
                        onCancel={() => setEditingItem(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">₹{item.price.toFixed(2)}</span>
                  <Badge variant={item.available ? "default" : "secondary"}>
                    {item.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                
                {businessType === "healthcare" && item.expiryDate && (
                  <div className="text-sm text-warning">
                    Expires: {new Date(item.expiryDate).toLocaleDateString()}
                  </div>
                )}
                
                {item.modifiers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Modifiers: {item.modifiers.length}
                  </div>
                )}
                
                {item.variations.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Variations: {item.variations.length}
                  </div>
                )}
                
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MenuItemForm({ 
  item, 
  categories, 
  businessType,
  onSave, 
  onCancel 
}: {
  item?: MenuItem | null;
  categories: Category[];
  businessType: string;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<MenuItem>(item || {
    id: "",
    name: "",
    description: "",
    price: 0,
    category: categories[0]?.id || "",
    available: true,
    modifiers: [],
    variations: [],
    tags: [],
    expiryDate: businessType === "healthcare" ? "" : undefined
  });

  const [newModifier, setNewModifier] = useState({ name: "", price: 0, required: false });
  const [newVariation, setNewVariation] = useState({ name: "", price: 0 });
  const [newTag, setNewTag] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    onSave(formData);
  };

  const addModifier = () => {
    if (!newModifier.name) return;
    setFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, { ...newModifier, id: Date.now().toString() }]
    }));
    setNewModifier({ name: "", price: 0, required: false });
  };

  const addVariation = () => {
    if (!newVariation.name) return;
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { ...newVariation, id: Date.now().toString() }]
    }));
    setNewVariation({ name: "", price: 0 });
  };

  const addTag = () => {
    if (!newTag || formData.tags.includes(newTag)) return;
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]
    }));
    setNewTag("");
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{item ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Price</label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {businessType === "healthcare" && (
            <div>
              <label className="text-sm font-medium">Expiry Date</label>
              <Input
                type="date"
                value={formData.expiryDate || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={formData.available}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: !!checked }))}
          />
          <label className="text-sm font-medium">Available</label>
        </div>

        {/* Modifiers Section */}
        <div>
          <h4 className="font-semibold mb-2">Modifiers</h4>
          <div className="space-y-2">
            {formData.modifiers.map(modifier => (
              <div key={modifier.id} className="flex items-center justify-between p-2 border rounded">
                <span>{modifier.name} (+₹{modifier.price.toFixed(2)})</span>
                <Badge variant={modifier.required ? "default" : "secondary"}>
                  {modifier.required ? "Required" : "Optional"}
                </Badge>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Modifier name"
                value={newModifier.name}
                onChange={(e) => setNewModifier(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Price"
                value={newModifier.price}
                onChange={(e) => setNewModifier(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={newModifier.required}
                  onCheckedChange={(checked) => setNewModifier(prev => ({ ...prev, required: !!checked }))}
                />
                <label className="text-sm">Required</label>
              </div>
              <Button type="button" onClick={addModifier}>Add</Button>
            </div>
          </div>
        </div>

        {/* Variations Section */}
        <div>
          <h4 className="font-semibold mb-2">Variations</h4>
          <div className="space-y-2">
            {formData.variations.map(variation => (
              <div key={variation.id} className="flex items-center justify-between p-2 border rounded">
                <span>{variation.name}</span>
                <span>+₹{variation.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Variation name"
                value={newVariation.name}
                onChange={(e) => setNewVariation(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Additional price"
                value={newVariation.price}
                onChange={(e) => setNewVariation(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
              <Button type="button" onClick={addVariation}>Add</Button>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <h4 className="font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {formData.tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button type="button" onClick={addTag}>Add</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Item</Button>
        </div>
      </form>
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
    sortOrder: 0
  });

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
          <label className="text-sm font-medium">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Sort Order</label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Category</Button>
        </div>
      </form>
    </div>
  );
}