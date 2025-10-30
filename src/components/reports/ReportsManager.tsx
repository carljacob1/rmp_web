import { useState } from "react";
import { FileText, Download, Calendar, TrendingUp, BarChart3, PieChart, Calculator, Users, Fuel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BusinessType } from "@/components/BusinessSelector";
import { RetailReports } from "./RetailReports";
import { ServiceReports } from "./ServiceReports";
import { RestaurantReports } from "./RestaurantReports";
import { TaxReports } from "./TaxReports";
import { EmployeeReports } from "./EmployeeReports";

interface ReportsManagerProps {
  businessType: BusinessType;
}

export type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";
export type ReportType = "sales" | "inventory" | "customer" | "performance" | "financial" | "tax" | "employee";

const reportTypes = {
  retail: [
    { id: "sales", name: "Sales Report", icon: TrendingUp },
    { id: "inventory", name: "Inventory Report", icon: BarChart3 },
    { id: "performance", name: "Product Performance", icon: PieChart },
    { id: "financial", name: "Financial Summary", icon: FileText },
    { id: "tax", name: "Tax Reports", icon: Calculator },
    { id: "employee", name: "Employee Reports", icon: Users },
  ],
  service: [
    { id: "revenue", name: "Revenue Report", icon: TrendingUp },
    { id: "appointments", name: "Appointment Analytics", icon: Calendar },
    { id: "clients", name: "Client Reports", icon: BarChart3 },
    { id: "services", name: "Service Performance", icon: PieChart },
    { id: "tax", name: "Tax Reports", icon: Calculator },
    { id: "employee", name: "Employee Reports", icon: Users },
  ],
  restaurant: [
    { id: "sales", name: "Sales Report", icon: TrendingUp },
    { id: "orders", name: "Order Analytics", icon: BarChart3 },
    { id: "menu", name: "Menu Performance", icon: PieChart },
    { id: "customers", name: "Customer Analytics", icon: FileText },
    { id: "tax", name: "Tax Reports", icon: Calculator },
    { id: "employee", name: "Employee Reports", icon: Users },
  ],
  healthcare: [
    { id: "patients", name: "Patient Reports", icon: Users },
    { id: "appointments", name: "Appointment Analytics", icon: Calendar },
    { id: "revenue", name: "Revenue Report", icon: TrendingUp },
    { id: "performance", name: "Performance Analytics", icon: BarChart3 },
    { id: "tax", name: "Tax Reports", icon: Calculator },
    { id: "employee", name: "Employee Reports", icon: Users },
  ],
  refilling: [
    { id: "vessels", name: "Vessel Reports", icon: Fuel },
    { id: "refills", name: "Refill Analytics", icon: TrendingUp },
    { id: "maintenance", name: "Maintenance Reports", icon: BarChart3 },
    { id: "delivery", name: "Delivery Reports", icon: PieChart },
    { id: "tax", name: "Tax Reports", icon: Calculator },
    { id: "employee", name: "Employee Reports", icon: Users },
  ]
};

export function ReportsManager({ businessType }: ReportsManagerProps) {
  const [selectedReport, setSelectedReport] = useState(reportTypes[businessType][0].id);
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const currentReports = reportTypes[businessType];

  const renderReports = () => {
    // Handle tax and employee reports for all business types
    if (selectedReport === "tax") {
      return <TaxReports reportType={selectedReport} dateRange={dateRange} />;
    }
    if (selectedReport === "employee") {
      return <EmployeeReports reportType={selectedReport} dateRange={dateRange} />;
    }

    // Handle business-specific reports
    switch (businessType) {
      case "retail":
        return <RetailReports reportType={selectedReport} dateRange={dateRange} />;
      case "service":
        return <ServiceReports reportType={selectedReport} dateRange={dateRange} />;
      case "restaurant":
        return <RestaurantReports reportType={selectedReport} dateRange={dateRange} />;
      case "healthcare":
        return <RetailReports reportType={selectedReport} dateRange={dateRange} />; // Reuse retail reports for now
      case "refilling":
        return <div className="p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Fuel className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Refilling Reports</h3>
          <p className="text-muted-foreground mb-4">
            Detailed reports for {selectedReport} are coming soon. Use the main dashboard for vessel tracking.
          </p>
          <p className="text-sm text-muted-foreground">
            Currently showing tax and employee reports for gas refilling business.
          </p>
        </div>;
      default:
        return null;
    }
  };

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    // Mock export functionality
    const fileName = `${businessType}_${selectedReport}_${dateRange}_report.${format}`;
    console.log(`Exporting ${fileName}`);
    
    // In a real app, this would trigger actual file download
    alert(`Exporting ${fileName} - This would download the file in a real application`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Generate comprehensive reports for your {businessType} business
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          <Button variant="outline" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Report Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {currentReports.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport === report.id;
              
              return (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary shadow-business' : ''
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <h4 className={`font-medium text-sm ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {report.name}
                    </h4>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {renderReports()}
    </div>
  );
}