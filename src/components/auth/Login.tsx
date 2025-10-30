import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Lock, ArrowRight, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BusinessType } from "@/components/BusinessSelector";
import { dbGetAll, setCurrentUser } from "@/lib/indexeddb";

interface LoginProps {
  onLogin?: (credentials: { username: string; password: string; rememberMe: boolean; businessType: BusinessType }) => void;
}

export function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    rememberMe: false,
    businessType: '' as BusinessType
  });

  useEffect(() => {
    if (location.state?.message) {
      toast({
        title: "Success",
        description: location.state.message,
      });
    }
  }, [location]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Try to find user in IndexedDB
    const users = await dbGetAll<any>('users');
    const foundUser = users.find((u: any) => 
      (u.mobile === credentials.username || u.email === credentials.username) && 
      u.password === credentials.password
    );

    if (foundUser) {
      // User found in local database
      const userBusinessType = foundUser.businessType;
      await setCurrentUser(foundUser);
      
      if (onLogin) {
        onLogin({
          ...credentials,
          businessType: userBusinessType as BusinessType
        });
      } else {
        // Navigate to main app
        navigate("/app", { 
          state: { 
            user: foundUser,
            businessType: userBusinessType 
          } 
        });
      }
      
      toast({
        title: "Success",
        description: `Logged in successfully! Welcome back, ${foundUser.ownerName}`,
      });
      return;
    }

    // If no user found, show error
    toast({
      title: "Error",
      description: "Invalid credentials. Please check your mobile number/email and password, or register a new account.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Store className="h-6 w-6 text-orange-500" />
            <span className="text-xl font-bold text-white">RetailPro</span>
          </div>
          <nav className="flex space-x-4 text-sm">
            <button 
              onClick={() => navigate('/')} 
              className="text-white hover:text-orange-500 transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => navigate('/pricing')} 
              className="text-white hover:text-orange-500 transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="text-white hover:text-orange-500 transition-colors"
            >
              Support
            </button>
          </nav>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
            <p className="text-gray-400 mt-2">Login to your RetailPro account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Mobile Number / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter mobile or email"
                    className="pl-9 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    className="pl-9 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={credentials.rememberMe}
                    onCheckedChange={(checked) => 
                      setCredentials(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                    className="border-gray-600"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-gray-300">Remember me</Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6"
              >
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center pt-4">
                <p className="text-gray-400 text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-orange-500 hover:text-orange-400 font-semibold"
                  >
                    Register Now
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}