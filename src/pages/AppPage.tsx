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
import { OpenItemsDashboard } from "@/components/open-items/OpenItemsDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calculator, LogOut, Store, Calendar, UtensilsCrossed, Heart, Fuel, UserCheck, Settings, CreditCard, Package } from "lucide-react";
import { Settings as SettingsComponent } from "@/components/settings/Settings";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { getCurrentUser, setCurrentUser as setIndexedDBCurrentUser } from "@/lib/indexeddb";

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
  const [currentView, setCurrentView] = useState<"dashboard" | "reports" | "accounting" | "settings" | "subscription" | "open-items">(() => {
    const saved = localStorage.getItem("currentView");
    return (saved as "dashboard" | "reports" | "accounting" | "settings" | "subscription" | "open-items") || "dashboard";
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
          // Remove the 'current' key (it's just the IndexedDB key, not user data)
          const userData = { ...indexedUser };
          delete userData.id; // Remove 'current' key
          setCurrentUser(userData);
          setUserBusinessType(userData.businessType);
          // Also save to localStorage for compatibility
          localStorage.setItem("currentUser", JSON.stringify(userData));
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
    if (currentView === "subscription") {
      return <SubscriptionManager />;
    }
    if (currentView === "open-items") {
      return <OpenItemsDashboard />;
    }
    return renderDashboard();
  };

  const handleLogout = async () => {
    localStorage.removeItem("currentUser");
    // Clear IndexedDB currentUser
    await setIndexedDBCurrentUser(null);
    // Clear React state
    setCurrentUser(null);
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
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-md border-b border-blue-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-3 gap-3">
            {/* Left Section - Branding & User Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 flex-shrink-0">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Business Management</h1>
                <div className="flex items-center gap-2 text-xs sm:text-sm mt-0.5">
                  <span className="text-white/90 truncate">
                    {currentUser.ownerName || currentUser.username || "User"}
                  </span>
                  <span className="text-white/40">•</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-1.5 py-0 font-mono text-[10px] sm:text-xs">
                    {currentUser.businessId || "No ID"}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white hover:bg-white/15 border border-transparent hover:border-white/20 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm"
                onClick={() => navigate('/attendance')}
              >
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Attendance</span>
              </Button>
              <Button
                variant={currentView === "dashboard" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "dashboard" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("dashboard")}
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant={currentView === "reports" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "reports" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("reports")}
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Reports</span>
              </Button>
              <Button
                variant={currentView === "accounting" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "accounting" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("accounting")}
              >
                <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Accounting</span>
              </Button>
              <Button
                variant={currentView === "open-items" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "open-items" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("open-items")}
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Open Items</span>
              </Button>
              <Button
                variant={currentView === "subscription" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "subscription" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("subscription")}
              >
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Subscriptions</span>
              </Button>
              <Button
                variant={currentView === "settings" ? "default" : "ghost"}
                size="sm"
                className={`h-8 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm ${
                  currentView === "settings" 
                    ? "bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" 
                    : "text-white hover:bg-white/15 border border-transparent hover:border-white/20"
                }`}
                onClick={() => setCurrentView("settings")}
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <div className="hidden lg:block w-px h-5 bg-white/30 mx-0.5"></div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white hover:bg-red-500/20 hover:text-white border border-transparent hover:border-red-400/30 rounded-md px-2 sm:px-3 transition-all duration-200 text-xs sm:text-sm"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
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

