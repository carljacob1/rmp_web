import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, AlertTriangle } from "lucide-react";
import { DateRange, ReportType } from "./ReportsManager";

interface RetailReportsProps {
  reportType: string;
  dateRange: DateRange;
}

const salesData = {
  totalSales: 15420.50,
  salesGrowth: 12.5,
  totalOrders: 342,
  averageOrderValue: 45.12,
  topSellingProducts: [
    { name: "Premium Coffee Beans", sold: 89, revenue: 2222.11 },
    { name: "Wireless Headphones", sold: 23, revenue: 3449.77 },
    { name: "Organic T-Shirt", sold: 67, revenue: 2009.33 },
  ]
};

const inventoryData = {
  totalProducts: 156,
  lowStockItems: 8,
  outOfStock: 3,
  inventoryValue: 28450.75,
  topMovingItems: [
    { name: "Premium Coffee Beans", movement: 89, trend: "up" },
    { name: "Smartphone Case", movement: 45, trend: "up" },
    { name: "Organic T-Shirt", movement: 67, trend: "down" },
  ],
  lowStockAlert: [
    { name: "Wireless Headphones", stock: 8, threshold: 15 },
    { name: "Smartphone Case", stock: 3, threshold: 10 },
  ]
};

export function RetailReports({ reportType, dateRange }: RetailReportsProps) {
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
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesData.topSellingProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">{product.sold} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{product.revenue.toLocaleString()}</p>
                  <Badge variant="secondary">#{index + 1} Best Seller</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInventoryReport = () => (
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
                <p className="text-2xl font-bold">₹{inventoryData.inventoryValue.toLocaleString()}</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );

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