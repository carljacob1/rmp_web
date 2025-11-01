import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Minus, ShoppingCart, CreditCard, ArrowLeft, Calculator, QrCode, Smartphone, Banknote, CheckCircle, AlertTriangle, ScanLine, Camera, CameraOff, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { dbGetAll, dbPut, dbGetById } from '@/lib/indexeddb';
import { getCurrentUserId, filterByUserId } from '@/lib/userUtils';
import { createTransaction } from '@/lib/transactionUtils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  productId?: string; // Store product ID for stock updates
  image?: string; // Product image
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
interface ProductRec { 
  id: string; 
  name: string; 
  sku?: string; // SKU/Barcode for scanning
  price: number; 
  category: string;
  stock?: number; // Stock/quantity available
}

export const OfflinePOS: React.FC<OfflinePOSProps> = ({ businessType, onClose }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<CategoryRec[]>([]);
  const [products, setProducts] = useState<ProductRec[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemBarcode, setCustomItemBarcode] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', email: '' });
  const [showPayment, setShowPayment] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'upi' | 'card' | null>(null);
  const [upiId, setUpiId] = useState(''); // Customer UPI ID (for payment requests)
  const [merchantUPI, setMerchantUPI] = useState(''); // Merchant UPI ID (for QR code)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | null>(null);
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST, customizable
  const { toast } = useToast();
  const { saveData } = useOfflineStorage('pos-orders', 'pos_orders');

  // Function to reload products from IndexedDB
  const reloadProducts = async () => {
    try {
      const userId = await getCurrentUserId();
      const prods = await dbGetAll<ProductRec>('products');
      // Filter by userId to show only current user's products
      const userProds = userId ? filterByUserId(prods, userId) : prods;
      // Normalize product data to ensure SKU field is accessible
      const normalizedProds = userProds.map(p => ({
        ...p,
        sku: p.sku || (p as any).sku || (p as any).SKU || (p as any).skucode || '',
      }));
      setProducts(normalizedProds);
    } catch (error) {
      console.error('Error reloading products:', error);
    }
  };

  useEffect(() => {
    (async () => {
      const userId = await getCurrentUserId();
      const [cats, prods, settings] = await Promise.all([
        dbGetAll<CategoryRec>('categories'),
        dbGetAll<ProductRec>('products'),
        dbGetAll<any>('settings')
      ]);
      // Filter by userId
      const userCats = userId ? filterByUserId(cats, userId) : cats;
      const userProds = userId ? filterByUserId(prods, userId) : prods;
      const sortedCats = userCats.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCats);
      // Normalize product data to ensure SKU field is accessible
      const normalizedProds = userProds.map(p => ({
        ...p,
        sku: p.sku || (p as any).sku || (p as any).SKU || (p as any).skucode || '',
      }));
      setProducts(normalizedProds);
      // Default to showing all products (no category filter)
      setSelectedCategory('');
      
      // Load merchant UPI ID from settings
      if (settings && settings.length > 0) {
        const setting = settings[0];
        const settingData = setting.data || setting;
        const merchantUpiId = settingData.merchantUPI || settingData.merchantupi || settingData.upiId || settingData.upiid || '';
        if (merchantUpiId) {
          setMerchantUPI(merchantUpiId);
        }
      }
    })();
  }, [businessType]);

  const addToCart = (name: string, price: number, category: string, productId?: string, image?: string) => {
    console.log('addToCart called:', { name, price, category, productId, image, currentCartSize: cart.length });
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.name === name);
      
      if (existingItem) {
        const updated = prevCart.map(item =>
          item.name === name 
            ? { ...item, quantity: item.quantity + 1, productId: productId || item.productId, image: image || item.image }
            : item
        );
        console.log('Updated existing item in cart. New cart:', updated);
        return updated;
      } else {
        const newItem: CartItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          price,
          quantity: 1,
          category,
          productId,
          image
        };
        const updated = [...prevCart, newItem];
        console.log('Added new item to cart. New cart:', updated);
        return updated;
      }
    });
    
    setCustomItemName('');
    setCustomItemPrice('');
    setBarcodeInput('');
  };

  // Search product by SKU/Barcode
  const findProductByBarcode = (barcode: string): ProductRec | null => {
    if (!barcode || !barcode.trim()) return null;
    const barcodeLower = barcode.trim().toLowerCase();
    const barcodeValue = barcode.trim();
    
    return products.find(p => {
      // Try to get SKU from various possible field names (case-insensitive)
      const sku = (p.sku || (p as any).sku || (p as any).SKU || '').toString().trim();
      const productId = (p.id || '').toString().trim();
      
      // Match by exact SKU (case-insensitive)
      if (sku && sku.toLowerCase() === barcodeLower) {
        return true;
      }
      
      // Match by product ID (if barcode matches product ID)
      if (productId && productId.toLowerCase() === barcodeLower) {
        return true;
      }
      
      // Match by product name (exact match, case-insensitive)
      if (p.name && p.name.toLowerCase() === barcodeLower) {
        return true;
      }
      
      // Match by partial name (for flexible searching)
      if (p.name && p.name.toLowerCase().includes(barcodeLower) && barcodeLower.length >= 3) {
        return true;
      }
      
      return false;
    }) || null;
  };

  // Save barcode to product if missing
  const saveBarcodeToProduct = async (product: ProductRec, barcode: string) => {
    try {
      // Normalize keys before saving
      const { forceAllKeysToLowercase } = await import('@/lib/keyNormalizer');
      const now = new Date().toISOString();
      
      const updatedProduct = {
        ...product,
        sku: barcode.trim(),
        updated_at: now
      };
      
      const normalized = forceAllKeysToLowercase(updatedProduct);
      await dbPut('products', normalized);
      
      // Reload products to reflect the change
      await reloadProducts();
    } catch (error) {
      console.error('Error saving barcode to product:', error);
    }
  };

  // Handle barcode scan (Enter key or fast input)
  const handleBarcodeScan = async (value: string) => {
    if (!value || !value.trim()) {
      return;
    }
    
    const barcodeValue = value.trim();
    console.log('Scanning barcode:', barcodeValue, 'Total products:', products.length);
    
    const product = findProductByBarcode(barcodeValue);
    
    if (product) {
      console.log('Product found:', product.name, 'Price:', product.price, 'SKU:', product.sku);
      
      // If product doesn't have SKU/barcode, save it
      const currentSku = product.sku || (product as any).sku || '';
      if (!currentSku || currentSku.trim() === '') {
        await saveBarcodeToProduct(product, barcodeValue);
        toast({
          title: "Barcode Saved",
          description: `Barcode saved to ${product.name}`,
        });
        // Reload products to get updated product with SKU
        await reloadProducts();
      }
      
      // Check stock
      const stock = product.stock ?? (product as any).stock;
      if (stock !== undefined && stock <= 0) {
        toast({
          title: "Out of Stock",
          description: `${product.name} is out of stock`,
          variant: "destructive"
        });
        setBarcodeInput('');
        if (showCameraScanner) stopCameraScanner();
        return;
      }
      
      const categoryObj = categories.find(c => c.id === product.category || c.name === product.category);
      const catName = categoryObj?.name || product.category || 'General';
      
      // Ensure price is valid
      const productPrice = product.price || (product as any).price || 0;
      if (productPrice <= 0) {
        toast({
          title: "Invalid Price",
          description: `${product.name} has invalid price. Please set price before adding to cart.`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Adding to cart:', product.name, 'Price:', productPrice);
      const productImage = (product as any).image || '';
      addToCart(product.name, productPrice, catName, product.id, productImage);
      
      toast({
        title: "Item Added to Cart",
        description: `${product.name} (₹${productPrice.toFixed(2)}) added to cart successfully`,
      });
      
      // Stop camera scanner after successful scan (with delay to allow toast)
      if (showCameraScanner) {
        setTimeout(() => {
          stopCameraScanner();
        }, 1000);
      }
    } else {
      console.log('Product not found. Available products:', products.map(p => ({ 
        name: p.name, 
        sku: p.sku || (p as any).sku || 'NO SKU',
        id: p.id 
      })));
      toast({
        title: "Product Not Found",
        description: `No product found with barcode/SKU: "${barcodeValue}". Try scanning the product name or ensure the product has a SKU set.`,
        variant: "destructive"
      });
    }
  };

  // Handle barcode input with auto-submit on Enter
  const handleBarcodeInputChange = (value: string) => {
    setBarcodeInput(value);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  // Camera scanner functions
  const startCameraScanner = async () => {
    try {
      setIsScanning(true);
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Get available video devices
      const videoInputDevices = await codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        toast({
          title: "No Camera Found",
          description: "Please connect a camera device",
          variant: "destructive"
        });
        setIsScanning(false);
        return;
      }

      // Use the first available camera (usually the default)
      const selectedDeviceId = videoInputDevices[0].deviceId;

      if (videoRef.current) {
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
          if (result) {
            const barcodeValue = result.getText();
            handleBarcodeScan(barcodeValue);
          }
          if (error && error.name !== 'NotFoundException') {
            // NotFoundException is normal when no barcode is visible
            // Only log other errors
            console.debug('Scanning...', error.name);
          }
        });
      }
    } catch (error) {
      console.error('Error starting camera scanner:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive"
      });
      setIsScanning(false);
      setShowCameraScanner(false);
    }
  };

  const stopCameraScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
    setShowCameraScanner(false);
  };

  // Cleanup camera on unmount or when closing scanner
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Start/stop camera when showCameraScanner changes
  useEffect(() => {
    if (showCameraScanner && !isScanning) {
      startCameraScanner();
    } else if (!showCameraScanner && isScanning) {
      stopCameraScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCameraScanner]);

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
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    return { subtotal, tax, total, taxRate };
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

  const handlePaymentMethodSelect = (method: 'cash' | 'upi' | 'card') => {
    setSelectedPaymentMethod(method);
    setPaymentStatus(null);
    if (method === 'cash') {
      // Cash payments are immediate
      setPaymentStatus('completed');
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

    if (!selectedPaymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please select a payment method to proceed.",
        variant: "destructive"
      });
      return;
    }

    if (selectedPaymentMethod === 'upi' && paymentStatus !== 'completed') {
      toast({
        title: "Payment Pending",
        description: "Please complete UPI payment first.",
        variant: "destructive"
      });
      return;
    }

    const totals = calculateTotals();
    const now = new Date().toISOString();
    
    // Prepare transaction data using new schema
    const transactionData = {
      location_id: undefined, // Will be set from first location if available
      customer_name: customerInfo.name || undefined,
      customer_phone: customerInfo.phone || undefined,
      customer_email: customerInfo.email || undefined,
      subtotal: totals.subtotal,
      discount_amount: 0,
      total_tax: totals.tax,
      total: totals.total,
      payment_method: selectedPaymentMethod!,
      payment_status: 'completed',
      upi_id: selectedPaymentMethod === 'upi' ? upiId : undefined,
      business_type: businessType,
      receipt_data: {
        businessType,
        timestamp: now,
        status: 'completed'
      }
    };

    // Prepare transaction items
    const transactionItems = cart.map((cartItem) => ({
      product_id: cartItem.productId,
      item_name: cartItem.name,
      item_type: cartItem.category,
      quantity: cartItem.quantity,
      price: cartItem.price,
      tax_amount: (cartItem.price * cartItem.quantity) * (taxRate / 100),
      total: cartItem.price * cartItem.quantity
    }));

    try {
      // Create transaction using new schema structure
      const { transactionId } = await createTransaction(transactionData, transactionItems);
      
      // Legacy: Also save to orders for backward compatibility
      const orderData = {
        id: transactionId,
        businessType,
        items: cart,
        customer: customerInfo,
        ...totals,
        paymentMethod: selectedPaymentMethod,
        upiId: selectedPaymentMethod === 'upi' ? upiId : undefined,
        paymentStatus: 'completed',
        timestamp: now,
        status: 'completed'
      };
      await saveData(orderData);
      
      // Update product stock for each item in cart
      for (const cartItem of cart) {
        if (cartItem.productId) {
          try {
            // Get product from IndexedDB
            const product = await dbGetById<any>('products', cartItem.productId);
            if (product) {
              // Decrease stock by quantity sold
              const currentStock = product.stock || 0;
              const newStock = Math.max(0, currentStock - cartItem.quantity);
              
              // Update product with new stock
              const now = new Date().toISOString();
              const updatedProduct = {
                ...product,
                stock: newStock,
                updated_at: now
              };
              
              await dbPut('products', updatedProduct);
              // Sync functionality removed - data stored only in IndexedDB
            }
          } catch (error) {
            console.error(`Failed to update stock for product ${cartItem.productId}:`, error);
            // Continue with other products even if one fails
          }
        } else {
          // For custom items without productId, try to find by name and update stock
          try {
            const allProducts = await dbGetAll<any>('products');
            const product = allProducts.find((p: any) => p.name === cartItem.name);
            if (product && product.stock !== undefined) {
              const currentStock = product.stock || 0;
              const newStock = Math.max(0, currentStock - cartItem.quantity);
              
              const now = new Date().toISOString();
              const updatedProduct = {
                ...product,
                stock: newStock,
                updated_at: now
              };
              
              await dbPut('products', updatedProduct);
              // Sync functionality removed - data stored only in IndexedDB
            }
          } catch (error) {
            console.error(`Failed to update stock for custom item ${cartItem.name}:`, error);
          }
        }
      }
      
      // Reload all products from IndexedDB to ensure UI reflects latest stock
      await reloadProducts();
      
      // Dispatch custom event to notify other components about stock update
      window.dispatchEvent(new CustomEvent('inventory-updated', { 
        detail: { transactionId, orderId: transactionId } 
      }));
      
      toast({
        title: "Payment Successful",
        description: `Transaction ${transactionId.slice(0, 12)}... completed! Total: ₹${totals.total.toFixed(2)}. Payment via ${selectedPaymentMethod?.toUpperCase()}. Inventory updated.`,
      });

      // Reset form
      setCart([]);
      setCustomerInfo({ name: '', phone: '', email: '' });
      setShowPayment(false);
      setSelectedPaymentMethod(null);
      setUpiId('');
      setPaymentStatus(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      });
      console.error('Error processing payment:', error);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  // Generate UPI payment QR code data
  // Note: This QR code is for customers to scan and pay TO the merchant
  const upiQRCodeData = useMemo(() => {
    // UPI QR code format: upi://pay?pa=<UPI_ID>&pn=<Payee Name>&am=<Amount>&cu=INR&tn=<Transaction Note>
    // This should be the MERCHANT's UPI ID where customers send payments
    const merchantUpiId = merchantUPI || '';
    
    if (!merchantUpiId) {
      // Return empty string if no merchant UPI is set - QR code won't work
      return '';
    }
    
    const merchantName = 'RetailPro Merchant'; // Can be loaded from settings later
    const amount = total.toFixed(2);
    const transactionNote = `Payment for ${businessType} order`;
    
    return `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  }, [total, businessType, merchantUPI]);

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
      <div className="fixed inset-0 bg-gradient-to-br from-background to-muted/20 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-primary text-white p-5 flex justify-between items-center shadow-lg border-b-4 border-primary/30">
          <div>
            <h1 className="text-2xl font-bold mb-1">Payment</h1>
            <p className="text-white/80 text-sm">{businessType.charAt(0).toUpperCase() + businessType.slice(1)} POS System</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowPayment(false);
              setSelectedPaymentMethod(null);
              setUpiId('');
              setPaymentStatus(null);
            }}
            className="text-white hover:bg-white/10 border border-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Customer Information */}
            <Card className="shadow-md border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Customer Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
            <Card className="shadow-md border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2.5 border-b last:border-0">
                      <span className="text-sm font-medium">{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                      <span className="font-semibold text-primary">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card className="shadow-md border-2 border-primary/20">
              <CardHeader className="pb-3 bg-primary/5">
                <CardTitle className="text-lg">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-muted-foreground">Tax:</span>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="w-20 h-9 text-sm font-medium"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center pt-2 border-t-2 border-primary/30">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-primary">₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="shadow-md border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Cash Payment */}
                  <Button
                    variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                    className={`h-24 flex-col ${selectedPaymentMethod === 'cash' ? 'bg-success text-white' : ''}`}
                    onClick={() => handlePaymentMethodSelect('cash')}
                  >
                    <Banknote className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Cash</span>
                  </Button>

                  {/* UPI Payment */}
                  <Button
                    variant={selectedPaymentMethod === 'upi' ? 'default' : 'outline'}
                    className={`h-24 flex-col ${selectedPaymentMethod === 'upi' ? 'bg-primary text-white' : ''}`}
                    onClick={() => handlePaymentMethodSelect('upi')}
                  >
                    <Smartphone className="h-6 w-6 mb-2" />
                    <span className="font-semibold">UPI</span>
                    <span className="text-xs mt-1">GPay/PhonePe</span>
                  </Button>

                  {/* Card Payment */}
                  <Button
                    variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                    className={`h-24 flex-col ${selectedPaymentMethod === 'card' ? 'bg-info text-white' : ''}`}
                    onClick={() => handlePaymentMethodSelect('card')}
                  >
                    <CreditCard className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Card</span>
                    <span className="text-xs mt-1">Debit/Credit</span>
                  </Button>
                </div>

                {/* UPI Payment Details */}
                {selectedPaymentMethod === 'upi' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Merchant UPI ID (Required for QR Code)</label>
                        <Input
                          placeholder="Your business UPI ID (e.g., yourbusiness@paytm)"
                          value={merchantUPI}
                          onChange={(e) => setMerchantUPI(e.target.value)}
                          className="mb-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter your business UPI ID to generate a working payment QR code. Customers will scan and pay to this UPI ID.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Customer UPI ID (Optional)</label>
                        <Input
                          placeholder="Customer's UPI ID for payment request (optional)"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="mb-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Enter customer's UPI ID to send payment request. Or use QR code below for customer to scan and pay.
                        </p>
                      </div>

                      {/* UPI QR Code Option */}
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <QrCode className="h-4 w-4" />
                          <span className="text-sm font-medium">Scan QR Code to Pay</span>
                        </div>
                        {!merchantUPI ? (
                          <div className="bg-warning/10 border border-warning rounded-lg p-4 text-center">
                            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-2" />
                            <p className="text-sm font-medium text-warning mb-1">
                              Merchant UPI ID Required
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Please enter your business UPI ID above to generate a working payment QR code.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white p-6 rounded-lg border-2 border-primary/20 flex flex-col items-center justify-center">
                            <div className="bg-white p-3 rounded-lg shadow-lg mb-3">
                              <QRCodeSVG
                                value={upiQRCodeData}
                                size={200}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                  src: '',
                                  height: 0,
                                  width: 0,
                                  excavate: false,
                                }}
                              />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                Scan with any UPI app
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Amount: <span className="font-semibold text-primary">₹{total.toFixed(2)}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Merchant UPI: <span className="font-semibold">{merchantUPI}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                (GPay, PhonePe, Paytm, BHIM, etc.)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* UPI Payment Status */}
                      {paymentStatus && (
                        <div className={`p-3 rounded-lg ${
                          paymentStatus === 'completed' 
                            ? 'bg-success/10 border border-success' 
                            : 'bg-warning/10 border border-warning'
                        }`}>
                          <div className="flex items-center gap-2">
                            {paymentStatus === 'completed' ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-success" />
                                <span className="text-sm font-medium text-success">
                                  Payment Received
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="h-5 w-5 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-medium text-warning">
                                  Processing Payment...
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Confirmation Buttons */}
                      {paymentStatus !== 'completed' && (
                        <Button
                          onClick={() => {
                            setPaymentStatus('processing');
                            toast({
                              title: "QR Code Active",
                              description: "Customer can scan the QR code to pay. Click 'Payment Received' after customer completes payment.",
                            });
                          }}
                          className="w-full"
                        >
                          <Smartphone className="h-4 w-4 mr-2" />
                          Ready for Payment
                        </Button>
                      )}
                      
                      {paymentStatus === 'processing' && (
                        <Button
                          onClick={() => setPaymentStatus('completed')}
                          className="w-full bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Payment Received - Complete
                        </Button>
                      )}
                      
                      {paymentStatus === 'completed' && (
                        <div className="w-full p-3 bg-success/10 border border-success rounded-lg flex items-center justify-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <span className="text-sm font-medium text-success">
                            Payment Confirmed ✓
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Card Payment Details */}
                {selectedPaymentMethod === 'card' && (
                  <Card className="bg-info/5 border-info/20">
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Card Number</label>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Expiry Date</label>
                          <Input placeholder="MM/YY" maxLength={5} />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">CVV</label>
                          <Input placeholder="123" maxLength={4} type="password" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Cardholder Name</label>
                        <Input placeholder="Name on card" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cash Payment Confirmation */}
                {selectedPaymentMethod === 'cash' && (
                  <Card className="bg-success/5 border-success/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-sm font-medium">Cash payment - Ready to complete</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Collect Amount:</span>
                          <span className="text-lg font-bold">₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="bg-warning/10 border border-warning rounded-lg p-4 text-center shadow-sm">
              <p className="text-warning-foreground text-sm font-medium">
                📱 Offline Mode: Order will be saved locally and synced when internet returns
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <Button
              onClick={processPayment}
              disabled={!selectedPaymentMethod || (selectedPaymentMethod === 'upi' && paymentStatus !== 'completed')}
              className="w-full max-w-md mx-auto bg-success hover:bg-success/90 text-white text-lg py-6 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all font-semibold"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete Order - ₹{total.toFixed(2)}
            </Button>
          </div>
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
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              All
            </Button>
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

          {/* Barcode Scanner */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5" />
                  Barcode Scanner
                </div>
                <Button
                  variant={showCameraScanner ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCameraScanner(!showCameraScanner)}
                >
                  {showCameraScanner ? (
                    <>
                      <CameraOff className="h-4 w-4 mr-2" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Camera Scanner */}
              {showCameraScanner && (
                <div className="mb-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full max-h-64 object-cover"
                      playsInline
                      muted
                    />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-center text-white">
                          <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                          <p>Starting camera...</p>
                        </div>
                      </div>
                    )}
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-green-500 rounded-lg w-64 h-32 relative">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-500"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-500"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-500"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-500"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Position barcode within the frame to scan automatically
                  </p>
                </div>
              )}

              {/* Manual Input Scanner */}
              <div className="flex gap-2">
                <Input
                  placeholder="Scan barcode or enter SKU (Press Enter)"
                  value={barcodeInput}
                  onChange={(e) => handleBarcodeInputChange(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  className="flex-1 text-lg"
                  autoFocus={!showCameraScanner}
                  onFocus={(e) => e.target.select()}
                  disabled={showCameraScanner}
                />
                <Button
                  onClick={() => {
                    if (barcodeInput.trim()) {
                      handleBarcodeScan(barcodeInput);
                    }
                  }}
                  disabled={!barcodeInput.trim() || showCameraScanner}
                  className="min-w-[100px]"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {showCameraScanner 
                  ? "Camera scanner is active. Point camera at barcode to scan automatically."
                  : "Scan a barcode using a barcode scanner device, or type the product SKU and press Enter to add to cart. Scanned barcodes will be saved to products automatically."}
              </p>
            </CardContent>
          </Card>

          {/* Quick Add Custom Item */}
          <Card className="mb-6 border-2 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Quick Add Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Item name *"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Barcode/SKU"
                    value={customItemBarcode}
                    onChange={(e) => setCustomItemBarcode(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    <Input
                      placeholder="Price *"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      className="flex-1"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKeypad(true)}
                      className="px-2 flex-shrink-0"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    const price = parseFloat(customItemPrice);
                    if (customItemName.trim() && !isNaN(price) && price > 0) {
                      const catName = categories.find(c => c.id === selectedCategory)?.name || 'General';
                      const categoryId = selectedCategory || categories.find(c => c.name === catName)?.id || '';
                      
                      // Save as product to IndexedDB if barcode is provided
                      if (customItemBarcode.trim()) {
                        try {
                          const userId = await getCurrentUserId();
                          if (!userId) {
                            toast({
                              title: "Error",
                              description: "Please log in to save products",
                              variant: "destructive"
                            });
                            return;
                          }

                          const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
                          const now = new Date().toISOString();
                          
                          const { forceAllKeysToLowercase } = await import('@/lib/keyNormalizer');
                          const newProduct = {
                            id: productId,
                            name: customItemName.trim(),
                            sku: customItemBarcode.trim(),
                            price: price,
                            category: categoryId || catName,
                            stock: 0,
                            lowstockthreshold: 0,
                            userId: userId, // Add userId for data isolation
                            created_at: now,
                            updated_at: now
                          };
                          
                          const normalized = forceAllKeysToLowercase(newProduct);
                          await dbPut('products', normalized);
                          await reloadProducts();
                          
                          toast({
                            title: "Product Saved",
                            description: `"${customItemName.trim()}" saved with barcode "${customItemBarcode.trim()}"`,
                          });
                        } catch (error) {
                          console.error('Error saving product:', error);
                        }
                      }
                      
                      addToCart(customItemName.trim(), price, catName, undefined, '');
                      
                      // Clear form
                      setCustomItemName('');
                      setCustomItemPrice('');
                      setCustomItemBarcode('');
                    } else {
                      toast({
                        title: "Validation Error",
                        description: "Please enter item name and price",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items from IndexedDB */}
          <div>
            <h3 className="text-md font-semibold mb-4">Items {products.length > 0 && `(${products.filter(p => !selectedCategory || p.category === selectedCategory || p.category === categories.find(c => c.id === selectedCategory)?.id).length})`}</h3>
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No products found. Add products from the Menu Manager.</p>
                  <Button variant="outline" onClick={() => {
                    toast({
                      title: "Add Products",
                      description: "Go to Menu Management to add products first.",
                    });
                  }}>
                    Add Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products
                  .filter(p => {
                    // Show all products if no category selected
                    if (!selectedCategory) return true;
                    // Match by category ID or check if product category matches selected
                    return p.category === selectedCategory || 
                           p.category === categories.find(c => c.id === selectedCategory)?.id ||
                           p.category === categories.find(c => c.id === selectedCategory)?.name;
                  })
                  .map((item) => {
                    const categoryObj = categories.find(c => c.id === item.category || c.name === item.category);
                    const catName = categoryObj?.name || item.category || 'General';
                    const itemImage = (item as any).image || '';
                    const isOutOfStock = item.stock !== undefined && item.stock <= 0;
                    const isLowStock = item.stock !== undefined && item.stock > 0 && item.stock < 5;
                    
                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${
                          isOutOfStock 
                            ? 'opacity-60 border-muted' 
                            : isLowStock 
                            ? 'border-yellow-300 hover:border-yellow-400' 
                            : 'border-border hover:border-primary'
                        }`}
                        onClick={() => {
                          // Check if item is out of stock
                          if (isOutOfStock) {
                            toast({
                              title: "Out of Stock",
                              description: `${item.name} is out of stock`,
                              variant: "destructive"
                            });
                            return;
                          }
                          const productImage = (item as any).image || '';
                          addToCart(item.name, item.price, catName, item.id, productImage);
                          toast({
                            title: "Added to Cart",
                            description: `${item.name} added to cart`,
                          });
                        }}
                      >
                      <CardContent className="p-4">
                        {/* Product Image */}
                        {itemImage ? (
                          <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={itemImage} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 mb-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border">
                            <Package className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        
                        {/* Product Info */}
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-semibold text-base mb-1 line-clamp-2 min-h-[2.5rem]">{item.name}</h4>
                            {catName && (
                              <Badge variant="secondary" className="text-xs mb-2">
                                {catName}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                              <p className="text-lg font-bold text-primary">₹{item.price.toFixed(2)}</p>
                            </div>
                            {item.stock !== undefined && (
                              <Badge 
                                variant={isOutOfStock ? "destructive" : isLowStock ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {isOutOfStock ? 'Out' : `Stock: ${item.stock}`}
                              </Badge>
                            )}
                          </div>
                          
                          {item.sku && (
                            <p className="text-xs text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </CardContent>
                      </Card>
                    );
                  })}
                {products.filter(p => {
                  if (!selectedCategory) return true;
                  return p.category === selectedCategory || 
                         p.category === categories.find(c => c.id === selectedCategory)?.id ||
                         p.category === categories.find(c => c.id === selectedCategory)?.name;
                }).length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No products in this category. Try another category or add products.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
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
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex gap-3 p-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {item.image ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border">
                              <Package className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1 line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                              <p className="text-xs text-muted-foreground">₹{item.price.toFixed(2)} each</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-destructive hover:text-destructive h-6 w-6 p-0 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-bold text-primary text-base">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
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
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>Tax:</span>
                      <Input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="w-16 h-7 text-xs"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-xs">%</span>
                    </div>
                    <span>₹{tax.toFixed(2)}</span>
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