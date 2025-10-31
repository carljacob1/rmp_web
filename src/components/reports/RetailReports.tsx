import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, AlertTriangle } from "lucide-react";
import { DateRange, ReportType } from "./ReportsManager";
import { dbGetAll } from "@/lib/indexeddb";

interface RetailReportsProps {
  reportType: string;
  dateRange: DateRange;
}

interface Order {
  id: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  timestamp?: string;
  status?: string;
  paymentMethod?: string;
}

interface Product {
  id: string;
  name: string;
  stock?: number;
  lowStockThreshold?: number;
  price: number;
}

export function RetailReports({ reportType, dateRange }: RetailReportsProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ordersData, productsData] = await Promise.all([
          dbGetAll<Order>('orders'),
          dbGetAll<Product>('products')
        ]);
        setOrders(ordersData || []);
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Listen for inventory updates
    const handleUpdate = () => loadData();
    window.addEventListener('inventory-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    
    return () => {
      window.removeEventListener('inventory-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  // Helper function to get date range from string
  const getDateRange = (range: DateRange): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
    }

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  // Calculate sales metrics from real orders
  const salesData = useMemo(() => {
    // Filter orders by date range if specified
    const { start: periodStart, end: periodEnd } = getDateRange(dateRange);
    const filteredOrders = orders.filter(order => {
      if (!order.timestamp) return false;
      const orderDate = new Date(order.timestamp);
      return orderDate >= periodStart && orderDate <= periodEnd;
    });

    const completedOrders = filteredOrders.filter(o => !o.status || o.status === 'completed');
    const totalSales = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculate top selling products from order items
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        const current = productSales.get(item.name) || { quantity: 0, revenue: 0 };
        productSales.set(item.name, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + (item.price * item.quantity)
        });
      });
    });

    const topSellingProducts = Array.from(productSales.entries())
      .map(([name, data]) => ({
        name,
        sold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10

    // Calculate growth (compare this period to previous period of same length)
    let salesGrowth = 0;
    if (filteredOrders.length > 0) {
      const periodDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) || 30;
      
      // Previous period (same length, before current period)
      const previousPeriodEnd = new Date(periodStart.getTime() - 1);
      const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
      
      const previousOrders = orders.filter(order => {
        if (!order.timestamp) return false;
        const orderDate = new Date(order.timestamp);
        return orderDate >= previousPeriodStart && orderDate <= previousPeriodEnd;
      }).filter(o => !o.status || o.status === 'completed');
      
      const previousSales = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      salesGrowth = previousSales > 0 ? ((totalSales - previousSales) / previousSales * 100) : (totalSales > 0 ? 100 : 0);
    }

    return {
      totalSales,
      salesGrowth: Math.round(salesGrowth * 10) / 10,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      topSellingProducts
    };
  }, [orders, dateRange]);

  // Calculate inventory metrics from real products
  const inventoryData = useMemo(() => {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => 
      p.stock !== undefined && 
      p.lowStockThreshold !== undefined && 
      p.stock > 0 && 
      p.stock <= p.lowStockThreshold
    ).length;
    const outOfStock = products.filter(p => p.stock !== undefined && p.stock <= 0).length;
    const inventoryValue = products.reduce((sum, p) => 
      sum + (p.price * (p.stock || 0)), 0);

    // Low stock alerts
    const lowStockAlert = products
      .filter(p => 
        p.stock !== undefined && 
        p.lowStockThreshold !== undefined && 
        p.stock <= p.lowStockThreshold
      )
      .map(p => ({
        name: p.name,
        stock: p.stock || 0,
        threshold: p.lowStockThreshold || 0
      }))
      .slice(0, 10);

    // Top moving items (products with most stock changes - simplified as products sold)
    // This would require tracking stock history, for now we'll use products sorted by sales
    const topMovingItems = salesData.topSellingProducts.slice(0, 5).map(item => ({
      name: item.name,
      movement: item.sold,
      trend: "up" as const
    }));

    return {
      totalProducts,
      lowStockItems,
      outOfStock,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      topMovingItems,
      lowStockAlert
    };
  }, [products, salesData]);
  const renderSalesReport = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">₹{salesData.totalSales.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
              {salesData.salesGrowth !== 0 && (
                <div className="flex items-center mt-2">
                  {salesData.salesGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                  )}
                  <span className={`text-sm ${salesData.salesGrowth > 0 ? 'text-success' : 'text-destructive'}`}>
                    {salesData.salesGrowth > 0 ? '+' : ''}{salesData.salesGrowth}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{salesData.totalOrders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">₹{salesData.averageOrderValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className={`text-2xl font-bold ${salesData.salesGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {salesData.salesGrowth > 0 ? '+' : ''}{salesData.salesGrowth}%
                  </p>
                </div>
                {salesData.salesGrowth >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.topSellingProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sales data available yet.</p>
                <p className="text-sm mt-2">Complete orders in POS to see top selling products here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesData.topSellingProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">{product.sold} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{product.revenue.toFixed(2)}</p>
                      <Badge variant="secondary">#{index + 1} Best Seller</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading inventory data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{inventoryData.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-warning">{inventoryData.lowStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-destructive">{inventoryData.outOfStock}</p>
                </div>
                <Package className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold">₹{inventoryData.inventoryValue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Moving Items</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryData.topMovingItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales data available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventoryData.topMovingItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.movement} units moved</p>
                      </div>
                      <div className="flex items-center">
                        {item.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryData.lowStockAlert.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All products are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventoryData.lowStockAlert.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-warning/20 bg-warning/5 rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {item.stock} | Min: {item.threshold}
                        </p>
                      </div>
                      <Badge variant="destructive">Low Stock</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderPerformanceReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Product Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Product Performance Report</h3>
          <p className="text-muted-foreground">
            Detailed analysis of product performance including profit margins, turnover rates, and seasonal trends.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderFinancialReport = () => (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Financial Summary Report</h3>
          <p className="text-muted-foreground">
            Comprehensive financial overview including revenue, costs, profit margins, and tax reporting.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  switch (reportType) {
    case "sales":
      return renderSalesReport();
    case "inventory":
      return renderInventoryReport();
    case "performance":
      return renderPerformanceReport();
    case "financial":
      return renderFinancialReport();
    default:
      return renderSalesReport();
  }
}