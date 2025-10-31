import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BusinessSelector, BusinessType } from "@/components/BusinessSelector";
import { InventoryDashboard } from "@/components/retail/InventoryDashboard";
import { AppointmentDashboard } from "@/components/service/AppointmentDashboard";
import { OrderDashboard } from "@/components/restaurant/OrderDashboard";
import { EPRDashboard } from "@/components/healthcare/EPRDashboard";
import { RefillingDashboard } from "@/components/refilling/RefillingDashboard";
import { ReportsManager } from "@/components/reports/ReportsManager";
import { AccountingDashboard } from "@/components/accounting/AccountingDashboard";
import { Button } from "@/components/ui/button";
import { BarChart3, Calculator, LogOut, Store, Calendar, UtensilsCrossed, Heart, Fuel, UserCheck, Settings } from "lucide-react";
import { Settings as SettingsComponent } from "@/components/settings/Settings";
import { getCurrentUser } from "@/lib/indexeddb";

const AppPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved business type from localStorage or location state
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessType>(() => {
    const saved = localStorage.getItem("selectedBusinessType");
    return (saved as BusinessType) || "retail";
  });
  
  const [userBusinessType, setUserBusinessType] = useState<BusinessType | null>(null);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  
  // Load saved view from localStorage, default to "dashboard"
  const [currentView, setCurrentView] = useState<"dashboard" | "reports" | "accounting" | "settings">(() => {
    const saved = localStorage.getItem("currentView");
    return (saved as "dashboard" | "reports" | "accounting" | "settings") || "dashboard";
  });

  // Load user from localStorage, IndexedDB, or location state
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        // First check location state (from navigation)
        if (location.state?.user) {
          setCurrentUser(location.state.user);
          setUserBusinessType(location.state.user.businessType);
          setIsLoading(false);
          return;
        }

        // Then check localStorage
        const saved = localStorage.getItem("currentUser");
        if (saved) {
          try {
            const user = JSON.parse(saved);
            setCurrentUser(user);
            setUserBusinessType(user.businessType);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing localStorage user:', e);
          }
        }

        // Finally check IndexedDB
        const indexedUser = await getCurrentUser();
        if (indexedUser) {
          setCurrentUser(indexedUser);
          setUserBusinessType(indexedUser.businessType);
          // Also save to localStorage for compatibility
          localStorage.setItem("currentUser", JSON.stringify(indexedUser));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [location.state]);

  // Redirect if not logged in (after loading)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/login");
    }
  }, [isLoading, currentUser, navigate]);

  // Update business type when user loads
  useEffect(() => {
    if (currentUser?.businessType) {
      setSelectedBusiness(currentUser.businessType);
      setUserBusinessType(currentUser.businessType);
    }
  }, [currentUser]);

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

  const renderContent = () => {
    if (currentView === "reports") {
      return <ReportsManager businessType={selectedBusiness} />;
    }
    if (currentView === "accounting") {
      return <AccountingDashboard />;
    }
    if (currentView === "settings") {
      return <SettingsComponent onBack={() => setCurrentView("dashboard")} businessType={selectedBusiness} />;
    }
    return renderDashboard();
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setIsLoggedIn(false);
    navigate("/");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6 shadow-business">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Business Management System</h1>
            <p className="text-white/90">
              Welcome, {currentUser.ownerName || currentUser.username} • {currentUser.businessId || "No Business ID"}
            </p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              onClick={() => navigate('/attendance')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Employee Attendance
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
              variant={currentView === "settings" ? "secondary" : "ghost"}
              onClick={() => setCurrentView("settings")}
              className={currentView === "settings" ? "" : "text-white hover:bg-white/10"}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {hasMultipleLocations && (
          <BusinessSelector 
            selectedBusiness={selectedBusiness}
            onBusinessChange={setSelectedBusiness}
          />
        )}
        
        {userBusinessType && !hasMultipleLocations && (
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

export default AppPage;

