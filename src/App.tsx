import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { migrateLocalStorageToIndexedDB, resetDBConnection, forceDBUpgrade } from "@/lib/indexeddb";
 
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Register from "./pages/Register";
import { Login } from "./components/auth/Login";
import AppPage from "./pages/AppPage";
import { AttendancePage } from "./pages/AttendancePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Reset DB connection to ensure upgrade happens
    resetDBConnection();
    
    // Ensure database is upgraded with all stores
    const ensureDBUpgrade = async () => {
      try {
        // Try to open and check stores
        const { dbGetAll } = await import('@/lib/indexeddb');
        try {
          await dbGetAll('employees');
          // If this succeeds, stores exist
        } catch (error: any) {
          if (error?.message?.includes('not found') || error?.message?.includes('does not exist')) {
            console.log('Employees store missing, forcing database upgrade...');
            await forceDBUpgrade();
          }
        }
      } catch (error) {
        console.error('Error checking database:', error);
      }
    };
    
    ensureDBUpgrade();
    
    // One-time migration from localStorage to IndexedDB
    migrateLocalStorageToIndexedDB();
    
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
