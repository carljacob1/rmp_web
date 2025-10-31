import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Check, ArrowLeft } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free Plan",
      description: "Perfect for single location businesses",
      price: "₹0",
      priceDescription: "setup",
      additionalFee: "+ 0.20% transaction fee",
      features: [
        "Single business type",
        "One location",
        "Mobile POS sync",
        "Basic analytics"
      ],
      borderColor: "border-gray-700",
      recommended: false
    },
    {
      name: "Pro Plan",
      description: "For growing businesses with multiple locations",
      price: "₹6,000",
      priceDescription: "setup",
      additionalFee: "+ ₹3,000/year renewal + ₹3,000/year per additional location",
      features: [
        "Multiple business types",
        "Unlimited locations",
        "Advanced POS features",
        "Detailed analytics",
        "No transaction fees",
        "Priority support"
      ],
      borderColor: "border-orange-500",
      recommended: true
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

      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <Button 
            variant="outline" 
            className="bg-orange-500/10 text-orange-500 border-orange-500/50 mb-4"
          >
            Pricing
          </Button>
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose the right plan for your business
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className="relative">
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <Card className={`bg-gray-800 border-2 ${plan.borderColor} h-full`}>
                <CardHeader>
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <p className="text-gray-400">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400 ml-2">{plan.priceDescription}</span>
                    </div>
                    <p className={`text-sm mt-2 ${plan.additionalFee.includes('transaction fee') ? 'text-orange-500' : 'text-gray-400'}`}>
                      {plan.additionalFee}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => navigate('/contact')}
                    className={`w-full ${
                      plan.recommended 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                  >
                    Contact Us
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:text-orange-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

