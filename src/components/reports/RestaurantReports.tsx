import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingCart, Users, DollarSign, Clock, UtensilsCrossed, MapPin, Star } from "lucide-react";
import { DateRange, ReportType } from "./ReportsManager";
import { useEffect, useMemo, useState } from "react";
import { dbGetAll } from "@/lib/indexeddb";

interface RestaurantReportsProps {
  reportType: string;
  dateRange: DateRange;
}

type OrderRecord = any;
type ProductRecord = any;

// Helper function to get date range from string
function getDateRange(range: DateRange): { start: Date; end: Date } {
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
}

function inRange(ts: string | undefined, range: DateRange): boolean {
  if (!ts) return true;
  const d = new Date(ts).getTime();
  const { start, end } = getDateRange(range);
  const from = start.getTime();
  const to = end.getTime();
  if (d < from) return false;
  if (d > to) return false;
  return true;
}

export function RestaurantReports({ reportType, dateRange }: RestaurantReportsProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);

  useEffect(() => {
    (async () => {
      const [o, p] = await Promise.all([
        dbGetAll<OrderRecord>('orders'),
        dbGetAll<ProductRecord>('products')
      ]);
      setOrders(o);
      setProducts(p);
    })();
  }, []);

  const filteredOrders = useMemo(() => orders.filter(o => inRange(o.timestamp || o.createdAt, dateRange)), [orders, dateRange]);

  const salesData = useMemo(() => {
    const completed = filteredOrders.filter(o => (o.status || 'completed') === 'completed');
    const totalSales = completed.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = completed.length;
    const averageOrderValue = totalOrders ? totalSales / totalOrders : 0;

    const itemAgg: Record<string, { orders: number; revenue: number }> = {};
    completed.forEach(o => {
      const items = o.items || [];
      items.forEach((it: any) => {
        const key = it.name;
        const revenue = (it.price || 0) * (it.quantity || 0);
        if (!itemAgg[key]) itemAgg[key] = { orders: 0, revenue: 0 };
        itemAgg[key].orders += it.quantity || 0;
        itemAgg[key].revenue += revenue;
      });
    });
    const topItems = Object.entries(itemAgg)
      .map(([name, v]) => ({ name, orders: v.orders, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { totalSales, salesGrowth: 0, totalOrders, averageOrderValue, topItems };
  }, [filteredOrders]);

  const orderData = useMemo(() => {
    const dineInOrders = filteredOrders.filter(o => o.orderType === 'dine-in').length;
    const takeoutOrders = filteredOrders.filter(o => o.orderType === 'takeout').length;
    const deliveryOrders = filteredOrders.filter(o => o.orderType === 'delivery').length;
    const totalOrders = filteredOrders.length;

    const buckets: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const ts = o.timestamp || o.createdAt;
      if (!ts) return;
      const d = new Date(ts);
      const h = d.getHours();
      const key = `${h.toString().padStart(2, '0')}:00-${(h+1).toString().padStart(2, '0')}:00`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const ordersByTimeSlot = Object.entries(buckets).sort().map(([time, orders]) => ({ time, orders }));

    return { totalOrders, dineInOrders, takeoutOrders, deliveryOrders, averageOrderTime: 0, ordersByTimeSlot };
  }, [filteredOrders]);

  const menuData = useMemo(() => {
    const totalMenuItems = products.length;
    const perf: Record<string, { category: string; orders: number; revenue: number; rating: number }> = {};
    filteredOrders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const product = products.find(p => p.name === it.name) || { category: 'Uncategorized' };
        const cat = product.category || 'Uncategorized';
        if (!perf[cat]) perf[cat] = { category: cat, orders: 0, revenue: 0, rating: 0 };
        perf[cat].orders += it.quantity || 0;
        perf[cat].revenue += (it.price || 0) * (it.quantity || 0);
      });
    });
    const menuPerformance = Object.values(perf).sort((a, b) => b.revenue - a.revenue);
    const bestSellers = menuPerformance.slice(0, 3).length;
    const lowPerformers = menuPerformance.slice(-3).length;
    const newItems = 0;
    return { totalMenuItems, bestSellers, lowPerformers, newItems, menuPerformance };
  }, [filteredOrders, products]);

  const customerData = useMemo(() => {
    // Basic derivation from orders if customer info exists
    const map: Record<string, { name: string; orders: number; totalSpent: number }> = {};
    filteredOrders.forEach(o => {
      const name = o.customer?.name || o.customerName || 'Walk-in Customer';
      if (!map[name]) map[name] = { name, orders: 0, totalSpent: 0 };
      map[name].orders += 1;
      map[name].totalSpent += o.total || 0;
    });
    const topCustomers = Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
    return {
      totalCustomers: Object.keys(map).length,
      newCustomers: 0,
      returningCustomers: 0,
      customerSatisfaction: 0,
      topCustomers
    };
  }, [filteredOrders]);
  const renderSalesReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">₹{salesData.totalSales.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-success mr-1" />
              <span className="text-sm text-success">+{salesData.salesGrowth}%</span>
            </div>
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
                <p className="text-2xl font-bold">₹{salesData.averageOrderValue}</p>
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
                <p className="text-2xl font-bold">+{salesData.salesGrowth}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesData.topItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{item.revenue.toLocaleString()}</p>
                  <Badge variant="secondary">#{index + 1} Best Seller</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOrderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dine-In Orders</p>
                <p className="text-2xl font-bold">{orderData.dineInOrders}</p>
              </div>
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Takeout Orders</p>
                <p className="text-2xl font-bold">{orderData.takeoutOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Orders</p>
                <p className="text-2xl font-bold">{orderData.deliveryOrders}</p>
              </div>
              <MapPin className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Time</p>
                <p className="text-2xl font-bold">{orderData.averageOrderTime}min</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders by Time Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orderData.ordersByTimeSlot.map((slot, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <h4 className="font-medium">{slot.time}</h4>
                <div className="flex items-center">
                  <div className="w-32 bg-muted rounded-full h-2 mr-3">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(slot.orders / Math.max(1, orderData.totalOrders)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-medium">{slot.orders}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMenuPerformance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menu Items</p>
                <p className="text-2xl font-bold">{menuData.totalMenuItems}</p>
              </div>
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Sellers</p>
                <p className="text-2xl font-bold text-success">{menuData.bestSellers}</p>
              </div>
              <Star className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Performers</p>
                <p className="text-2xl font-bold text-warning">{menuData.lowPerformers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Items</p>
                <p className="text-2xl font-bold">{menuData.newItems}</p>
              </div>
              <UtensilsCrossed className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {menuData.menuPerformance.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{category.category}</h4>
                  <p className="text-sm text-muted-foreground">{category.orders} orders</p>
                  <div className="flex items-center mt-1">
                    <Star className="h-3 w-3 text-warning mr-1" />
                    <span className="text-sm">{category.rating}/5.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{category.revenue.toLocaleString()}</p>
                  <Badge variant="secondary">Category #{index + 1}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCustomerAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customerData.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Customers</p>
                <p className="text-2xl font-bold text-success">{customerData.newCustomers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Returning</p>
                <p className="text-2xl font-bold">{customerData.returningCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold">{customerData.customerSatisfaction}/5.0</p>
              </div>
              <Star className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerData.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{customer.name}</h4>
                  <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{customer.totalSpent.toLocaleString()}</p>
                  <Badge variant="secondary">VIP Customer</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (reportType) {
    case "sales":
      return renderSalesReport();
    case "orders":
      return renderOrderAnalytics();
    case "menu":
      return renderMenuPerformance();
    case "customers":
      return renderCustomerAnalytics();
    default:
      return renderSalesReport();
  }
}