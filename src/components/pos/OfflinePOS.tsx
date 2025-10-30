import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Minus, ShoppingCart, CreditCard, ArrowLeft, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { dbGetAll } from '@/lib/indexeddb';
import { upsertOne } from '@/lib/sync';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface OfflinePOSProps {
  businessType: string;
  onClose: () => void;
}

interface CategoryRec { id: string; name: string; }
interface ProductRec { id: string; name: string; price: number; category: string; }

export const OfflinePOS: React.FC<OfflinePOSProps> = ({ businessType, onClose }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<CategoryRec[]>([]);
  const [products, setProducts] = useState<ProductRec[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', email: '' });
  const [showPayment, setShowPayment] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const { toast } = useToast();
  const { saveData } = useOfflineStorage('pos-orders', 'pos_orders');

  useEffect(() => {
    (async () => {
      const [cats, prods] = await Promise.all([
        dbGetAll<CategoryRec>('categories'),
        dbGetAll<ProductRec>('products')
      ]);
      const sortedCats = cats.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCats);
      setProducts(prods);
      setSelectedCategory(sortedCats[0]?.id || '');
    })();
  }, [businessType]);

  const addToCart = (name: string, price: number, category: string) => {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.name === name 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        price,
        quantity: 1,
        category
      };
      setCart([...cart, newItem]);
    }
    
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 18; // 18% GST
    const tax = (subtotal * taxRate) / 100;
    const processingFee = 1; // ₹1 flat fee
    const total = subtotal + tax + processingFee;

    return { subtotal, tax, processingFee, total, taxRate };
  };

  const handleKeypadInput = (value: string) => {
    if (value === 'clear') {
      setKeypadValue('');
    } else if (value === 'backspace') {
      setKeypadValue(prev => prev.slice(0, -1));
    } else if (value === 'ok') {
      setCustomItemPrice(keypadValue);
      setShowKeypad(false);
      setKeypadValue('');
    } else {
      // Limit to reasonable price length
      if (keypadValue.length < 8) {
        setKeypadValue(prev => prev + value);
      }
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty. Add items to proceed.",
        variant: "destructive"
      });
      return;
    }

    const totals = calculateTotals();
    const orderData = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessType,
      items: cart,
      customer: customerInfo,
      ...totals,
      paymentMethod: 'offline',
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    try {
      await saveData(orderData);
      try { await upsertOne('orders', orderData as any); } catch {}
      
      toast({
        title: "Order Completed",
        description: `Order ${orderData.id} processed successfully! Total: ₹${totals.total.toFixed(2)}. Order saved locally and will sync when online.`,
      });

      // Reset form
      setCart([]);
      setCustomerInfo({ name: '', phone: '', email: '' });
      setShowPayment(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const { subtotal, tax, processingFee, total, taxRate } = calculateTotals();

  // Keypad Component
  const Keypad = () => (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center">
      <Card className="w-80 max-w-sm mx-4">
        <CardHeader>
          <CardTitle className="text-center">Enter Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background border rounded-lg p-4 mb-4 text-right text-2xl font-bold min-h-[60px] flex items-center justify-end">
            {keypadValue ? `₹${keypadValue}` : '₹0'}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'].map((key) => (
              <Button
                key={key}
                variant="outline"
                className="h-12 text-lg font-semibold"
                onClick={() => handleKeypadInput(key)}
              >
                {key}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleKeypadInput('clear')}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleKeypadInput('backspace')}
            >
              ⌫
            </Button>
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowKeypad(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleKeypadInput('ok')}
              disabled={!keypadValue}
            >
              OK
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-primary text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Payment - {businessType.charAt(0).toUpperCase() + businessType.slice(1)} POS</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPayment(false)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Customer Name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                />
                <Input
                  placeholder="Phone Number"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  type="tel"
                />
                <Input
                  placeholder="Email Address"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  type="email"
                />
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Fee:</span>
                  <span>₹{processingFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-warning/10 border border-warning rounded-lg p-4 text-center">
              <p className="text-warning-foreground">
                📱 Offline Mode: Order will be saved locally and synced when internet returns
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t">
          <Button
            onClick={processPayment}
            className="w-full bg-success hover:bg-success/90 text-white text-lg py-6"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Process Payment - ₹{total.toFixed(2)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">{businessType.charAt(0).toUpperCase() + businessType.slice(1)} POS - Offline</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Categories and Items */}
        <div className="flex-1 p-6 border-r overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Quick Add Custom Item */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Add Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Item name"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  <Input
                    placeholder="Price"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    type="number"
                    className="w-24"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="sm"
                onClick={() => setShowKeypad(true)}
                    className="px-2"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    const price = parseFloat(customItemPrice);
                    if (customItemName.trim() && !isNaN(price) && price > 0) {
                  const catName = categories.find(c => c.id === selectedCategory)?.name || 'General';
                  addToCart(customItemName.trim(), price, catName);
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items from IndexedDB */}
          <div>
            <h3 className="text-md font-semibold mb-4">Items</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {products.filter(p => !selectedCategory || p.category === selectedCategory).map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    const catName = categories.find(c => c.id === selectedCategory)?.name || 'General';
                    addToCart(item.name, item.price, catName);
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <h4 className="font-medium text-sm mb-1">{item.name}</h4>
                    <p className="text-muted-foreground text-sm">₹{item.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Cart</h2>
            <Badge variant="secondary">
              <ShoppingCart className="h-3 w-3 mr-1" />
              {cart.length} items
            </Badge>
          </div>

          <ScrollArea className="flex-1 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Cart is empty. Add items to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                          <p className="text-sm">₹{item.price.toFixed(2)} each</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold text-primary">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({taxRate}%):</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee:</span>
                    <span>₹{processingFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full bg-success hover:bg-success/90 text-white"
                >
                  Proceed to Payment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Keypad Modal */}
      {showKeypad && <Keypad />}
    </div>
  );
};

// removed hardcoded item lists; items now come from IndexedDB 'products'