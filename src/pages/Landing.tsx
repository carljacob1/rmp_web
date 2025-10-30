import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Building2, BarChart3, Smartphone, MapPin, TrendingUp, CreditCard, ShieldCheck, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Smartphone,
      title: "Mobile POS",
      description: "Complete mobile point of sale system with location-based billing"
    },
    {
      icon: Building2,
      title: "Multi-Location",
      description: "Manage multiple business locations from one dashboard"
    },
    {
      icon: TrendingUp,
      title: "Real-time Analytics",
      description: "Track sales, inventory, and performance metrics live"
    }
  ];

  const allFeatures = [
    {
      icon: Building2,
      title: "Multi-Location Management",
      description: "Manage multiple business locations from one dashboard"
    },
    {
      icon: Smartphone,
      title: "Mobile POS Integration",
      description: "Sync with Android POS devices for seamless transactions"
    },
    {
      icon: TrendingUp,
      title: "Real-time Analytics",
      description: "Track sales, inventory, and performance metrics"
    },
    {
      icon: CreditCard,
      title: "Flexible Pricing Plans",
      description: "Choose between free and paid plans based on your needs"
    },
    {
      icon: Store,
      title: "Industry-Specific Features",
      description: "Customized features for different business types"
    },
    {
      icon: ShieldCheck,
      title: "Transaction Processing",
      description: "Secure payment processing with transparent fees"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Store className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold text-white">RetailPro</span>
        </div>
        <nav className="flex space-x-6 items-center">
          <button 
            onClick={() => navigate('/pricing')} 
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
          <Button 
            onClick={() => navigate('/login')} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Login
          </Button>
        </nav>
      </header>

      {/* Hero Section - First Landing Page Style */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - CTA */}
          <div className="text-white space-y-8">
            <h1 className="text-5xl font-bold leading-tight">
              Manage Your Business Like a Pro
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Complete retail management platform with mobile POS integration, multi-location support, and real-time analytics. Start free or upgrade for advanced features.
            </p>
            
            {/* Key Features */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="text-center space-y-2">
                    <Icon className="h-8 w-8 mx-auto text-orange-500" />
                    <p className="text-sm text-gray-300">{feature.title}</p>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => navigate('/register')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
              size="lg"
            >
              Start Your Business Journey
            </Button>
          </div>

          {/* Right Section - Dashboard Demo */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Business Dashboard</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-blue-400 text-3xl font-bold">₹45,280</div>
                  <div className="text-gray-400 text-sm">Today's Sales</div>
                </div>
                <div>
                  <div className="text-blue-400 text-3xl font-bold">156</div>
                  <div className="text-gray-400 text-sm">Transactions</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-gray-300 text-sm mb-2">Main Store</div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500 text-sm">POS Connected • 3 locations active</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm mb-2">Recent Activity</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Sale #1234</span>
                    <span className="text-white font-semibold">₹2,480</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Sale #1233</span>
                    <span className="text-white font-semibold">₹1,250</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Second Landing Page Style - Features Grid */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Button variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/50 mb-4">
            Features
          </Button>
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything you need to run your business
          </h2>
          <p className="text-xl text-gray-300">
            From single location to multi-chain management, we've got you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-gray-800 border-gray-700 hover:border-orange-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Landing;

