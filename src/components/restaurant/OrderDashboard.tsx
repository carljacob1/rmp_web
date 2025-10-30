import { useEffect, useState } from "react";
import { ShoppingCart, Clock, CheckCircle, DollarSign, Plus, MapPin, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OfflinePOS } from "@/components/pos/OfflinePOS";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  orderTime: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  orderType: "dine-in" | "takeout" | "delivery";
  tableNumber?: string;
  address?: string;
}

import { dbGetAll, dbPut } from "@/lib/indexeddb";
import { fetchAll, syncProductsToLocal } from "@/lib/sync";

export function OrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Array<{ name: string; price: number; category: string }>>([]);
  const [showPOS, setShowPOS] = useState(false);
  
  useEffect(() => {
    (async () => {
      try {
        // Pull latest from Supabase if available
        const [remoteOrders] = await Promise.all([
          fetchAll<Order>('orders').catch(() => []),
          syncProductsToLocal().catch(() => {})
        ]);
        for (const ro of remoteOrders) await dbPut('orders', ro);
      } catch {}
      const [ordersFromDb, products] = await Promise.all([
        dbGetAll<Order>('orders'),
        dbGetAll<any>('products')
      ]);
      setOrders(ordersFromDb);
      setMenuItems(products.map((p) => ({ name: p.name, price: p.price, category: p.category })));
    })();
  }, []);
  
  const activeOrders = orders.filter(order => 
    order.status !== "completed" && order.status !== "cancelled"
  );
  const todayRevenue = orders
    .filter(order => order.status === "completed")
    .reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter(order => order.status === "pending").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning text-warning-foreground";
      case "preparing": return "bg-info text-info-foreground";
      case "ready": return "bg-success text-success-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case "dine-in": return "🍽️";
      case "takeout": return "🥡";
      case "delivery": return "🚚";
      default: return "📋";
    }
  };

  if (showPOS) {
    return <OfflinePOS businessType="restaurant" onClose={() => setShowPOS(false)} />;
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
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">₹{todayRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Current Orders</CardTitle>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        <span className="mr-2">{getOrderTypeIcon(order.orderType)}</span>
                        {order.id} - {order.customerName}
                      </h4>
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                      {order.tableNumber && (
                        <p className="text-sm text-muted-foreground">{order.tableNumber}</p>
                      )}
                      {order.address && (
                        <p className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {order.address}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      Order Time: {order.orderTime}
                    </div>
                    <div className="font-medium">
                      Total: ₹{order.total.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-3">
                    {order.status === "pending" && (
                      <Button size="sm">Start Preparing</Button>
                    )}
                    {order.status === "preparing" && (
                      <Button size="sm" className="bg-success hover:bg-success/90">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Ready
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button size="sm">Complete Order</Button>
                    )}
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Add Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {menuItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{item.price}</p>
                    <Button variant="ghost" size="sm">Add</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Manage Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}