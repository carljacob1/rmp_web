import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Lock, ArrowRight, Store, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BusinessType } from "@/components/BusinessSelector";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { dbGetAll, setCurrentUser } from "@/lib/indexeddb";

interface LoginProps {
  onLogin?: (credentials: { username: string; password: string; rememberMe: boolean; businessType: BusinessType }) => void;
}

export function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
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
    
    setLoading(true);
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      toast({
        title: "Error",
        description: "Supabase is not configured. Please check your environment variables.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Step 1: Try Supabase authentication first
      let supabaseLoginSuccess = false;
      let authenticatedUser = null;
      let userData = null;

      try {
        const isEmail = credentials.username.includes('@');
        let authResponse;
        
        if (isEmail) {
          // Sign in with email
          authResponse = await supabase.auth.signInWithPassword({
            email: credentials.username,
            password: credentials.password,
          });
        } else {
          // For phone, try to find user by phone in users table first
          const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('mobile', credentials.username)
            .limit(1);
          
          if (users && users.length > 0 && users[0].email) {
            // Found user by phone, authenticate with their email
            authResponse = await supabase.auth.signInWithPassword({
              email: users[0].email,
              password: credentials.password,
            });
          } else {
            // Try as email (might be typed as phone but is actually email)
            authResponse = await supabase.auth.signInWithPassword({
              email: credentials.username,
              password: credentials.password,
            });
          }
        }

        if (authResponse?.data?.user && !authResponse?.error) {
          // Supabase Auth successful
          authenticatedUser = authResponse.data.user;
          supabaseLoginSuccess = true;
          
          // Fetch user profile from users table
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('email', authenticatedUser.email || credentials.username)
            .or(`mobile.eq.${credentials.username}`)
            .maybeSingle();

          userData = {
            id: authenticatedUser.id,
            email: authenticatedUser.email || credentials.username,
            ownerName: userProfile?.ownername || authenticatedUser.email,
            ...(userProfile || {}),
          };
        }
      } catch (supabaseError: any) {
        // Supabase login failed - will fall back to IndexedDB
        console.log('[Login] Supabase Auth failed:', supabaseError?.message || supabaseError);
      }

      // Step 2: If Supabase failed, try api.registrations table first, then IndexedDB
      if (!supabaseLoginSuccess) {
        // Try api.registrations table (has passwords)
        console.log('[Login] Checking api.registrations table...');
        try {
          const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('*')
            .or(`email.eq.${credentials.username},mobile.eq.${credentials.username}`)
            .eq('password', credentials.password)
            .maybeSingle();
          
          if (regError) {
            console.log('[Login] Error checking registrations:', regError);
          }
          
          if (registration) {
            console.log('[Login] ✅ Found user in api.registrations');
            // Fetch profile from api.users
            const { data: userProfile } = await supabase
              .from('users')
              .select('*')
              .or(`email.eq.${registration.email || credentials.username},mobile.eq.${credentials.username}`)
              .maybeSingle();
            
            userData = {
              id: userProfile?.id || registration.id,
              email: registration.email || userProfile?.email || credentials.username,
              mobile: registration.mobile || userProfile?.mobile,
              ownerName: registration.ownername || userProfile?.ownername,
              businessType: registration.businesstype || userProfile?.businessid,
              ...(userProfile || {}),
              ...registration,
            };
            
            await setCurrentUser(userData);
            
            const userBusinessType = userData.businessType || userData.businessid || 'retail';
            
            if (onLogin) {
              onLogin({
                ...credentials,
                businessType: userBusinessType as BusinessType
              });
            } else {
              navigate("/app", { 
                state: { 
                  user: userData,
                  businessType: userBusinessType 
                } 
              });
            }
            
            toast({
              title: "Success",
              description: `Logged in successfully! Welcome back, ${userData.ownerName || userData.email}`,
            });
            return;
          } else {
            console.log('[Login] User not found in api.registrations');
          }
        } catch (regCheckError) {
          console.log('[Login] Error checking api.registrations:', regCheckError);
        }
        
        // Step 3: Finally try IndexedDB
        console.log('[Login] Trying IndexedDB authentication...');
        const users = await dbGetAll<any>('users');
        
        // Debug: Log what we're looking for and what we have
        console.log('[Login] Searching for username:', credentials.username);
        console.log('[Login] Total users in IndexedDB:', users.length);
        if (users.length > 0) {
          console.log('[Login] Sample user from IndexedDB:', {
            email: users[0].email,
            mobile: users[0].mobile,
            hasPassword: !!users[0].password,
            allKeys: Object.keys(users[0])
          });
        }
        
        // Case-insensitive and field-variation tolerant search
        const foundUser = users.find((u: any) => {
          // Normalize field names (handle both camelCase and lowercase)
          const userEmail = (u.email || u.Email || '').toLowerCase().trim();
          const userMobile = (u.mobile || u.Mobile || '').trim();
          const searchValue = credentials.username.toLowerCase().trim();
          
          // Check email match (case-insensitive)
          const emailMatch = userEmail === searchValue;
          
          // Check mobile match (exact, no case needed for numbers)
          const mobileMatch = userMobile === credentials.username.trim();
          
          // Get password field (handle variations)
          const userPassword = u.password || u.Password || '';
          
          const usernameMatches = emailMatch || mobileMatch;
          const passwordMatches = userPassword === credentials.password;
          
          console.log('[Login] Checking user:', {
            email: userEmail,
            mobile: userMobile,
            emailMatch,
            mobileMatch,
            passwordMatch: passwordMatches,
            usernameMatches
          });
          
          return usernameMatches && passwordMatches;
        });

        if (foundUser) {
          console.log('[Login] ✅ Found user in IndexedDB:', foundUser);
          // IndexedDB login successful
          // Normalize field names for consistency
          userData = {
            ...foundUser,
            ownerName: foundUser.ownerName || foundUser.ownername || foundUser.OwnerName,
            email: foundUser.email || foundUser.Email,
            mobile: foundUser.mobile || foundUser.Mobile,
          };
          
          await setCurrentUser(userData);
          
          const userBusinessType = foundUser.businessType || foundUser.businesstype || foundUser.businessid || 'retail';
          
          if (onLogin) {
            onLogin({
              ...credentials,
              businessType: userBusinessType as BusinessType
            });
          } else {
            navigate("/app", { 
              state: { 
                user: userData,
                businessType: userBusinessType 
              } 
            });
          }
          
          toast({
            title: "Success",
            description: `Logged in successfully! Welcome back, ${userData.ownerName || userData.email || 'User'}`,
          });
          return;
        } else {
          console.log('[Login] ❌ User not found in IndexedDB with matching credentials');
          console.log('[Login] Available users:', users.map((u: any) => ({
            email: u.email || u.Email,
            mobile: u.mobile || u.Mobile,
            hasPassword: !!u.password
          })));
        }
      } else {
        // Supabase login was successful
        await setCurrentUser(userData);

        const userBusinessType = userData?.businesstype || userData?.businessType || userData?.businessid || 'retail';

        if (onLogin) {
          onLogin({
            ...credentials,
            businessType: userBusinessType as BusinessType
          });
        } else {
          navigate("/app", { 
            state: { 
              user: userData,
              businessType: userBusinessType 
            } 
          });
        }
        
        toast({
          title: "Success",
          description: `Logged in successfully! Welcome back, ${userData?.ownerName || authenticatedUser?.email || 'User'}`,
        });
        return;
      }

      // If both Supabase and IndexedDB failed, show detailed error
      console.error('[Login] ❌ Both Supabase and IndexedDB authentication failed');
      console.error('[Login] Username searched:', credentials.username);
      console.error('[Login] Password provided:', credentials.password ? '***' : 'empty');
      
      toast({
        title: "Error",
        description: "Invalid credentials. Please check your mobile number/email and password. Sign up is available only through our mobile app.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to login. Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <div className="text-center pt-4 space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Smartphone className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold mb-1">
                        New to RetailPro?
                      </p>
                      <p className="text-gray-300 text-xs mb-2">
                        Sign up is only available through our mobile app. Download from:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => window.open('https://play.google.com/store', '_blank')}
                          className="text-orange-500 hover:text-orange-400 text-xs font-semibold"
                        >
                          Google Play
                        </button>
                        <span className="text-gray-500 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() => window.open('https://www.apple.com/app-store', '_blank')}
                          className="text-orange-500 hover:text-orange-400 text-xs font-semibold"
                        >
                          App Store
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Need help?{" "}
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="text-orange-500 hover:text-orange-400 font-semibold"
                  >
                    Contact Us
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