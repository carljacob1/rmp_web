import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Store, 
  ArrowLeft, 
  Mail,
  Phone,
  MessageSquare,
  User,
  Send,
  Smartphone,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ContactFormData {
  name: string;
  email: string;
  mobile: string;
  businessType: string;
  message: string;
}

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    mobile: "",
    businessType: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.mobile || !formData.message) {
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

    // Basic mobile validation
    if (formData.mobile.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save contact request to local database (can be synced to CRM later)
      const { dbPut } = await import("@/lib/indexeddb");
      await dbPut('settings', {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: {
          ...formData,
          createdAt: new Date().toISOString(),
          status: 'pending',
          source: 'web_app'
        }
      });

      toast({
        title: "Thank You!",
        description: "Your message has been received. Our team will get in touch with you soon.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        mobile: "",
        businessType: "",
        message: ""
      });

      // Optionally sync to Supabase/CRM if online
      if (navigator.onLine) {
        try {
          const { getSupabaseClient } = await import("@/lib/supabaseClient");
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.from('settings').insert({
              id: `contact_${Date.now()}`,
              data: {
                ...formData,
                createdAt: new Date().toISOString(),
                status: 'pending',
                source: 'web_app',
                type: 'contact_request'
              }
            });
          }
        } catch (error) {
          console.log('CRM sync will happen automatically when online');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
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
            Login
          </button>
        </nav>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Important Notice */}
          <Card className="bg-orange-500/10 border-orange-500/50 mb-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Sign Up Available Only on Mobile App
                  </h3>
                  <p className="text-gray-300 mb-4">
                    To create an account and get started, please download our mobile app from the App Store or Google Play Store. 
                    The web application is for account management only.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                      onClick={() => window.open('https://play.google.com/store', '_blank')}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Google Play Store
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                      onClick={() => window.open('https://www.apple.com/app-store', '_blank')}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      App Store
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Get in Touch</h2>
                <p className="text-gray-400">
                  Fill out the form below and our team will contact you to help set up your business account
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address *
                    </Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-white">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Mobile Number *
                    </Label>
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
                    <Label htmlFor="businessType" className="text-white">
                      Business Type (Optional)
                    </Label>
                    <Input
                      id="businessType"
                      placeholder="e.g., Retail, Restaurant, Healthcare"
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    Message *
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your business and setup requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[150px]"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-orange-500 hover:text-orange-400 font-semibold"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
