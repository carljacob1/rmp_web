import { useState, useEffect } from "react";
import { BusinessSelector, BusinessType } from "@/components/BusinessSelector";
import { BusinessPOSDemo } from "@/components/demo/BusinessPOSDemo";
import { InventoryDashboard } from "@/components/retail/InventoryDashboard";
import { AppointmentDashboard } from "@/components/service/AppointmentDashboard";
import { OrderDashboard } from "@/components/restaurant/OrderDashboard";
import { EPRDashboard } from "@/components/healthcare/EPRDashboard";
import { RefillingDashboard } from "@/components/refilling/RefillingDashboard";
import { ReportsManager } from "@/components/reports/ReportsManager";
import { AccountingDashboard } from "@/components/accounting/AccountingDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Login } from "@/components/auth/Login";
import { Button } from "@/components/ui/button";
import { BarChart3, Home, Calculator, Shield, LogOut, Store, Calendar, UtensilsCrossed, Heart, Fuel } from "lucide-react";

const Index = () => {
  // Load saved business type from localStorage, default to "retail"
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessType>(() => {
    const saved = localStorage.getItem("selectedBusinessType");
    return (saved as BusinessType) || "retail";
  });
  
  const [userBusinessType, setUserBusinessType] = useState<BusinessType | null>(null);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  
  // Load saved view from localStorage, default to "demo" for new users
  const [currentView, setCurrentView] = useState<"demo" | "dashboard" | "reports" | "accounting">(() => {
    const saved = localStorage.getItem("currentView");
    return (saved as "demo" | "dashboard" | "reports" | "accounting") || "demo";
  });
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Save business type selection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedBusinessType", selectedBusiness);
  }, [selectedBusiness]);

  // Save current view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("currentView", currentView);
  }, [currentView]);

  const renderDashboard = () => {
    switch (selectedBusiness) {
      case "retail":
        return <InventoryDashboard />;
      case "service":
        return <AppointmentDashboard />;
      case "restaurant":
        return <OrderDashboard />;
      case "healthcare":
        return <EPRDashboard />;
      case "refilling":
        return <RefillingDashboard />;
      default:
        return <InventoryDashboard />;
    }
  };

  const handleStartDemo = (businessType: string) => {
    setSelectedBusiness(businessType as BusinessType);
    setCurrentView("dashboard");
  };

  const renderContent = () => {
    if (currentView === "demo") {
      return <BusinessPOSDemo onStartDemo={handleStartDemo} />;
    }
    if (currentView === "reports") {
      return <ReportsManager businessType={selectedBusiness} />;
    }
    if (currentView === "accounting") {
      return <AccountingDashboard />;
    }
    return renderDashboard();
  };

  // Handle main login
  if (!isLoggedIn) {
    return (
      <Login 
        onLogin={(credentials) => {
          setIsLoggedIn(true);
          setUserBusinessType(credentials.businessType);
          setSelectedBusiness(credentials.businessType);
          // For demo purposes, assume single location business
          setHasMultipleLocations(false);
        }} 
      />
    );
  }

  // Handle admin login/logout
  if (showAdminLogin && !isAdminLoggedIn) {
    return (
      <AdminLogin 
        onLogin={() => {
          setIsAdminLoggedIn(true);
          setShowAdminLogin(false);
        }} 
      />
    );
  }

  if (isAdminLoggedIn) {
    return (
      <AdminDashboard 
        onLogout={() => {
          setIsAdminLoggedIn(false);
          setShowAdminLogin(false);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6 shadow-business">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Business Management System</h1>
            <p className="text-white/90">Manage your retail, service, or restaurant business all in one place</p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={currentView === "demo" ? "secondary" : "ghost"}
              onClick={() => setCurrentView("demo")}
              className={currentView === "demo" ? "" : "text-white hover:bg-white/10"}
            >
              <Home className="h-4 w-4 mr-2" />
              Demo
            </Button>
            <Button
              variant={currentView === "dashboard" ? "secondary" : "ghost"}
              onClick={() => setCurrentView("dashboard")}
              className={currentView === "dashboard" ? "" : "text-white hover:bg-white/10"}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={currentView === "reports" ? "secondary" : "ghost"}
              onClick={() => setCurrentView("reports")}
              className={currentView === "reports" ? "" : "text-white hover:bg-white/10"}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button
              variant={currentView === "accounting" ? "secondary" : "ghost"}
              onClick={() => setCurrentView("accounting")}
              className={currentView === "accounting" ? "" : "text-white hover:bg-white/10"}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Accounting
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowAdminLogin(true)}
              className="text-white hover:bg-white/10"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsLoggedIn(false)}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={currentView === "demo" ? "" : "max-w-7xl mx-auto p-6"}>
        {currentView !== "demo" && hasMultipleLocations && (
          <BusinessSelector 
            selectedBusiness={selectedBusiness}
            onBusinessChange={setSelectedBusiness}
          />
        )}
        
        {currentView !== "demo" && userBusinessType && !hasMultipleLocations && (
          <div className="mb-6 p-4 bg-card rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                {userBusinessType === "retail" && <Store className="h-5 w-5 text-white" />}
                {userBusinessType === "service" && <Calendar className="h-5 w-5 text-white" />}
                {userBusinessType === "restaurant" && <UtensilsCrossed className="h-5 w-5 text-white" />}
                {userBusinessType === "healthcare" && <Heart className="h-5 w-5 text-white" />}
                {userBusinessType === "refilling" && <Fuel className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h2 className="font-semibold text-lg capitalize">{userBusinessType} Business</h2>
                <p className="text-muted-foreground text-sm">Specialized features for your industry</p>
              </div>
            </div>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
