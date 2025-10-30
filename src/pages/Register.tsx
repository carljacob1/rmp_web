import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Store, 
  ArrowLeft, 
  Building2, 
  Coffee, 
  Heart, 
  Scissors, 
  Wrench, 
  ShoppingBag, 
  Car,
  MoreHorizontal,
  CheckCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { dbGetAll, dbPut, setCurrentUser } from "@/lib/indexeddb";

type BusinessType = "retail" | "service" | "restaurant" | "healthcare" | "refilling" | "beauty" | "service_center" | "grocery" | "automotive" | "other";
type PlanType = "free" | "pro";

interface RegistrationData {
  // Step 1
  ownerName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  // Step 2
  businessType: BusinessType | null;
  // Step 3
  plan: PlanType | null;
}

const businessTypes = [
  { 
    type: "retail" as BusinessType, 
    icon: Building2, 
    title: "Retail Store", 
    description: "General merchandise, electronics, clothing" 
  },
  { 
    type: "restaurant" as BusinessType, 
    icon: Coffee, 
    title: "Restaurant", 
    description: "Food service, cafes, quick service" 
  },
  { 
    type: "healthcare" as BusinessType, 
    icon: Heart, 
    title: "Healthcare", 
    description: "Clinics, pharmacy, medical services" 
  },
  { 
    type: "beauty" as BusinessType, 
    icon: Scissors, 
    title: "Beauty & Wellness", 
    description: "Salons, spas, fitness centers" 
  },
  { 
    type: "service_center" as BusinessType, 
    icon: Wrench, 
    title: "Service Center", 
    description: "Repair services, maintenance" 
  },
  { 
    type: "grocery" as BusinessType, 
    icon: ShoppingBag, 
    title: "Grocery Store", 
    description: "Supermarkets, local stores" 
  },
  { 
    type: "automotive" as BusinessType, 
    icon: Car, 
    title: "Automotive", 
    description: "Auto repair, car wash, parts" 
  },
  { 
    type: "other" as BusinessType, 
    icon: MoreHorizontal, 
    title: "Other", 
    description: "Other business types" 
  }
];

const Register = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>({
    ownerName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    businessType: null,
    plan: null
  });

  // Clear any existing registration data and start fresh
  useEffect(() => {
    setCurrentStep(1);
    setFormData({
      ownerName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      businessType: null,
      plan: null
    });
  }, []);

  const saveToLocalDB = async (data: RegistrationData) => {
    await dbPut('settings', { id: 'registrationDraft', data });
    await dbPut('registrations', {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString()
    });
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerName || !formData.email || !formData.mobile || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate email from IndexedDB
    const existingUsers = await dbGetAll<any>('users');
    const emailExists = existingUsers.some((user: any) => 
      user.email && user.email.toLowerCase() === formData.email.toLowerCase()
    );
    
    if (emailExists) {
      toast({
        title: "Error",
        description: "This email is already registered. Please use a different email or login.",
        variant: "destructive"
      });
      return;
    }

    // Basic mobile validation
    if (formData.mobile.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate mobile
    const mobileExists = existingUsers.some((user: any) => 
      user.mobile && user.mobile === formData.mobile
    );
    
    if (mobileExists) {
      toast({
        title: "Error",
        description: "This mobile number is already registered. Please use a different number or login.",
        variant: "destructive"
      });
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    // Password confirmation match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(2);
    await saveToLocalDB(formData);
  };

  const handleStep2Submit = async () => {
    if (!formData.businessType) {
      toast({
        title: "Error",
        description: "Please select a business type",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep(3);
    await saveToLocalDB(formData);
  };

  const handleStep3Submit = async () => {
    if (!formData.plan) {
      toast({
        title: "Error",
        description: "Please select a plan",
        variant: "destructive"
      });
      return;
    }
    
    // Save to local database
    await saveToLocalDB(formData);
    
    toast({
      title: "Registration Complete!",
      description: "Your business has been registered successfully",
    });

    // Generate business ID
    const businessId = `BIZ_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Map business types to system types
    // System supports: retail, service, restaurant, healthcare, refilling
    const businessTypeMap: Record<string, string> = {
      retail: "retail",
      service_center: "service",
      beauty: "service",
      restaurant: "restaurant",
      healthcare: "healthcare",
      grocery: "retail",
      automotive: "service",
      other: "retail", // Default to retail for unknown types
      refilling: "refilling" // If refilling is added later
    };
    
    const mappedBusinessType = businessTypeMap[formData.businessType || "retail"] || "retail";
    
    // Save user account (remove confirmPassword from saved data)
    const { confirmPassword, ...userDataWithoutConfirm } = formData;
    const userAccount = {
      id: `user_${Date.now()}`,
      businessId,
      ...userDataWithoutConfirm,
      businessType: mappedBusinessType, // Map to system business type
      originalBusinessType: formData.businessType, // Keep original for reference
      createdAt: new Date().toISOString()
    };
    
    // Save user to IndexedDB and set session
    await dbPut('users', userAccount);
    await setCurrentUser(userAccount);

    // Navigate to login or dashboard
    setTimeout(() => {
      navigate("/login", { 
        state: { 
          message: `Registration successful! Your Business ID is ${businessId}. Use your mobile number (${formData.mobile}) or email (${formData.email}) to login.` 
        } 
      });
    }, 1500);
  };

  const renderStep1 = () => (
    <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
      <CardContent className="p-8">
        <h2 className="text-3xl font-bold text-white mb-2">Tell us about your business</h2>
        <p className="text-gray-400 mb-8">We'll create a unique business ID for you.</p>
        
        <form onSubmit={handleStep1Submit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ownerName" className="text-white">Owner Name *</Label>
            <Input
              id="ownerName"
              placeholder="Enter your full name"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-white">Mobile Number *</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="9876543210"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "") })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              minLength={6}
              required
            />
            <p className="text-xs text-gray-400">Password must be at least 6 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="bg-gray-800 border-gray-700 max-w-4xl mx-auto">
      <CardContent className="p-8">
        <h2 className="text-3xl font-bold text-white mb-2">What type of business do you run?</h2>
        <p className="text-gray-400 mb-8">Select the category that best describes your business</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {businessTypes.map((business) => {
            const Icon = business.icon;
            const isSelected = formData.businessType === business.type;
            
            return (
              <Card
                key={business.type}
                onClick={() => setFormData({ ...formData, businessType: business.type })}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-gray-700 bg-gray-700 hover:border-gray-600'
                }`}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-3 ${isSelected ? 'text-orange-500' : 'text-gray-400'}`} />
                  <h3 className={`font-semibold mb-2 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {business.title}
                  </h3>
                  <p className="text-xs text-gray-400">{business.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          onClick={handleStep2Submit}
          disabled={!formData.businessType}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-6 disabled:opacity-50"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const selectedBusiness = businessTypes.find(b => b.type === formData.businessType);
    
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-4xl mx-auto">
        <CardContent className="p-8">
          <h2 className="text-3xl font-bold text-white mb-2">Choose your plan</h2>
          <p className="text-gray-400 mb-8">
            Selected business type: <span className="text-white font-semibold">{selectedBusiness?.title}</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free Plan */}
            <Card
              onClick={() => setFormData({ ...formData, plan: "free" })}
              className={`cursor-pointer transition-all ${
                formData.plan === "free"
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-700 hover:border-gray-600'
              }`}
            >
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">Free Plan</h3>
                <p className="text-gray-400 text-sm mb-4">Perfect for single location businesses</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-white">₹0</span>
                    <span className="text-gray-400 ml-2 text-sm">setup</span>
                  </div>
                  <p className="text-orange-500 text-sm mt-2">+ 0.20% transaction fee</p>
                </div>

                <div className="space-y-2 mb-6">
                  {["Single business type only", "One location", "Mobile POS sync", "Basic analytics"].map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card
              onClick={() => setFormData({ ...formData, plan: "pro" })}
              className={`cursor-pointer transition-all relative ${
                formData.plan === "pro"
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-700 hover:border-gray-600'
              }`}
            >
              {formData.plan !== "pro" && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Recommended
                  </span>
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">Pro Plan</h3>
                <p className="text-gray-400 text-sm mb-4">For growing businesses with multiple locations</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-white">₹6,000</span>
                    <span className="text-gray-400 ml-2 text-sm">setup</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">+ ₹3,000/year renewal + ₹3,000/year per location</p>
                </div>

                <div className="space-y-2 mb-6">
                  {["Multiple business types", "Unlimited locations", "No transaction fees", "Advanced analytics", "Priority support"].map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={handleStep3Submit}
            disabled={!formData.plan}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 disabled:opacity-50"
          >
            Complete Registration
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/')}
            className="text-white hover:text-orange-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <Store className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold text-white">RetailPro</span>
        </div>
        <nav className="flex space-x-6">
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
      </header>

      {/* Progress Indicator */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center items-center space-x-4 mb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step <= currentStep
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-600 text-gray-600'
                }`}
              >
                {step < currentStep ? <CheckCircle className="h-6 w-6" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 mb-8">
          Step {currentStep} of 3:{" "}
          {currentStep === 1 && "Business Information"}
          {currentStep === 2 && "Business Type"}
          {currentStep === 3 && "Plan Selection"}
        </p>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default Register;

