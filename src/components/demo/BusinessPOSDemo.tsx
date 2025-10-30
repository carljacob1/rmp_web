import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  UtensilsCrossed, 
  Calendar, 
  Heart, 
  Fuel,
  CheckCircle,
  ArrowRight,
  Clock,
  Shield,
  CreditCard,
  BarChart3,
  Wifi,
  RefreshCw,
  Users,
  IndianRupee
} from "lucide-react";

interface BusinessPOSDemoProps {
  onStartDemo: (businessType: string) => void;
}

export function BusinessPOSDemo({ onStartDemo }: BusinessPOSDemoProps) {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const businessTypes = [
    { type: "retail", icon: Store, title: "Retail Shops", description: "Inventory management, barcode scanning, customer loyalty" },
    { type: "restaurant", icon: UtensilsCrossed, title: "Restaurants", description: "Table management, menu items, order tracking" },
    { type: "service", icon: Calendar, title: "Spa/Salon", description: "Appointment scheduling, service management, staff booking" },
    { type: "healthcare", icon: Heart, title: "Healthcare", description: "Patient records, appointment management, billing" },
    { type: "refilling", icon: Fuel, title: "Gas Refilling", description: "Cylinder tracking, delivery management, safety protocols" }
  ];

  const features = [
    {
      icon: Shield,
      title: "Multi-User Authentication",
      description: "Secure user management with role-based access control",
      points: ["Admin: Full system access", "Manager: Location management", "Staff: POS operations"]
    },
    {
      icon: Store,
      title: "Multi-Location Management", 
      description: "Manage multiple business locations from one system",
      points: ["Location-specific inventory", "Individual business settings", "Consolidated reporting"]
    },
    {
      icon: CreditCard,
      title: "Payment Integration",
      description: "Comprehensive payment processing with commission tracking",
      points: ["UPI: GPay, PhonePe", "Cash transactions", "Secure payment processing"]
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Comprehensive business insights and performance tracking", 
      points: ["Sales performance", "Revenue analytics", "Inventory alerts"]
    },
    {
      icon: Wifi,
      title: "Offline Support",
      description: "Works even with poor internet connectivity",
      points: ["Local data caching", "Offline transaction queue", "Auto-sync when online"]
    },
    {
      icon: RefreshCw,
      title: "Real-time Updates", 
      description: "WebSocket-powered live updates across all devices",
      points: ["Inventory changes", "Order notifications", "Payment confirmations"]
    }
  ];

  const staffFeatures = [
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Complete attendance monitoring system",
      points: ["Clock in/out with break tracking", "Overtime calculation (8+ hours)", "Late arrival detection", "Monthly attendance reports"]
    },
    {
      icon: Shield,
      title: "Multi-User Permissions", 
      description: "Role-based access control system",
      points: ["Admin, Manager, Staff roles", "Customizable permissions per user", "Location-specific access control", "Business selection persistence"]
    },
    {
      icon: IndianRupee,
      title: "Salary Management",
      description: "Indian government compliant payroll",
      points: ["PF (12%), ESI (0.75%), Prof Tax", "Performance bonus system", "Punctuality & attendance tracking", "Monthly salary calculations"]
    }
  ];

  const completedFeatures = [
    "Multi-Business POS",
    "Staff Time Tracking", 
    "Salary Management",
    "Indian Compliance",
    "Payment Processing",
    "Multi-User Access"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-4xl font-bold mb-4">Business POS System</h1>
          <p className="text-xl text-white/90">Comprehensive Multi-Location Point of Sale Solution</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Live Demo Applications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl">🎯</div>
              Live Demo Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <div className="text-xl">📱</div>
                    Mobile App Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Complete mobile POS system with location-based billing</p>
                  <Button 
                    onClick={() => onStartDemo("retail")} 
                    className="w-full mb-4"
                  >
                    Launch Mobile Demo
                  </Button>
                  <p className="text-sm"><strong>Features:</strong> Location billing, industry-specific dashboards, payment processing</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-success/20 hover:border-success/40 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <div className="text-xl">💳</div>
                    Location Billing System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Automated billing for multi-location businesses</p>
                  <Button 
                    variant="outline" 
                    onClick={() => onStartDemo("service")}
                    className="w-full mb-4"
                  >
                    Try Billing Demo
                  </Button>
                  <p className="text-sm"><strong>Pricing:</strong> First location free, ₹50/month per additional location</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-warning/20 hover:border-warning/40 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <div className="text-xl">🏥</div>
                    Multi-Business Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Supports 5 industry types with specialized features</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveDemo("industries")}
                    className="w-full mb-4"
                  >
                    View Industries
                  </Button>
                  <p className="text-sm"><strong>Industries:</strong> Retail, Restaurant, Service, Hospital, Refilling</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Location-Based Pricing */}
        <Card className="mb-8 border-2 border-info/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl">💰</div>
              Location-Based Pricing Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-subtle p-6 rounded-lg border-l-4 border-info">
              <h3 className="text-info font-bold text-xl mb-4">Simple, Transparent Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-success mb-2">FREE</div>
                  <div className="font-bold mb-2">First Location</div>
                  <div className="text-muted-foreground">Always free - no monthly charges</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-info mb-2">₹50</div>
                  <div className="font-bold mb-2">Additional Locations</div>
                  <div className="text-muted-foreground">Per location per month</div>
                </div>
              </div>
              <div className="text-center p-4 bg-background/80 rounded-lg">
                <strong>Example:</strong> 1 location = Free | 3 locations = ₹100/month | 5 locations = ₹200/month
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Types Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl">🌟</div>
              Business Types Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {businessTypes.map((business) => {
                const Icon = business.icon;
                return (
                  <div key={business.type} className="text-center p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" onClick={() => onStartDemo(business.type)}>
                    <div className="text-4xl mb-3">
                      <Icon className="h-12 w-12 mx-auto text-primary" />
                    </div>
                    <h3 className="font-bold mb-2">{business.title}</h3>
                    <p className="text-sm text-muted-foreground">{business.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Flow */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl">📱</div>
              Transaction Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center flex-1 p-4 border-2 border-muted rounded-lg">
                <h3 className="font-bold mb-2">1. Product Selection</h3>
                <p className="text-muted-foreground">Scan barcode or search products</p>
              </div>
              <ArrowRight className="text-primary h-8 w-8 hidden md:block" />
              <div className="text-center flex-1 p-4 border-2 border-muted rounded-lg">
                <h3 className="font-bold mb-2">2. Payment Processing</h3>
                <p className="text-muted-foreground">GPay, PhonePe, or Cash</p>
              </div>
              <ArrowRight className="text-primary h-8 w-8 hidden md:block" />
              <div className="text-center flex-1 p-4 border-2 border-muted rounded-lg">
                <h3 className="font-bold mb-2">3. Inventory Update</h3>
                <p className="text-muted-foreground">Stock levels adjusted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <ul className="space-y-1">
                    {feature.points.map((point, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Advanced Staff Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl">🧑‍💼</div>
              Advanced Staff Management
            </CardTitle>
            <p className="text-muted-foreground">Comprehensive workforce management system with Indian government compliance</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staffFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <ul className="space-y-1">
                        {feature.points.map((point, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Complete Business Solution */}
        <Card className="border-2 border-info bg-gradient-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <CheckCircle className="h-6 w-6" />
              Complete Business Solution
            </CardTitle>
            <p>Fully operational POS and workforce management system:</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {completedFeatures.map((feature, index) => (
                <div key={index} className="text-center p-4 bg-background/60 rounded-lg">
                  <div className="text-2xl text-success mb-2">
                    <CheckCircle className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-sm font-medium">{feature}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Demo Button */}
        <div className="text-center mt-8">
          <Button 
            size="lg" 
            onClick={() => onStartDemo("retail")}
            className="px-8 py-4 text-lg"
          >
            Start Free Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}