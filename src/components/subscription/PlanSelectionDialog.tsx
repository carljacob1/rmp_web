import { useState } from "react";
import { Check, CreditCard, Smartphone, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  setupFee: number;
  renewalFee: number;
  perLocationFee: number;
  maxLocations: number;
  features: string[];
  recommended?: boolean;
}

interface PlanSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'pro';
  onSelectPlan: (planId: string, paymentMethod: string) => Promise<void>;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: "Free Plan",
    description: "Perfect for single location businesses",
    price: 0,
    setupFee: 0,
    renewalFee: 0,
    perLocationFee: 0,
    maxLocations: 1,
    features: [
      "Single business type",
      "One location",
      "Mobile POS sync",
      "Basic analytics"
    ],
    recommended: false
  },
  {
    id: 'pro',
    name: "Pro Plan",
    description: "For growing businesses with multiple locations",
    price: 6000,
    setupFee: 6000,
    renewalFee: 3000,
    perLocationFee: 3000,
    maxLocations: 999,
    features: [
      "Multiple business types",
      "Unlimited locations",
      "Advanced POS features",
      "Detailed analytics",
      "No transaction fees",
      "Priority support"
    ],
    recommended: true
  }
];

export function PlanSelectionDialog({ open, onClose, currentPlan, onSelectPlan }: PlanSelectionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  const [paymentMethod, setPaymentMethod] = useState<string>('online');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
    bankName: '',
    accountNumber: ''
  });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handleProceedToPayment = () => {
    if (selectedPlan === 'free') {
      // Free plan doesn't need payment
      handleCompletePayment();
      return;
    }
    setShowPayment(true);
  };

  const handleCompletePayment = async () => {
    if (!selectedPlanData) return;

    if (selectedPlanData.id === 'pro') {
      // Validate payment details based on payment method
      if (paymentMethod === 'online' || paymentMethod === 'card') {
        if (!paymentDetails.cardNumber || !paymentDetails.cardName || !paymentDetails.expiryDate || !paymentDetails.cvv) {
          toast({
            title: "Payment Details Required",
            description: "Please fill in all payment details",
            variant: "destructive"
          });
          return;
        }
      } else if (paymentMethod === 'upi') {
        if (!paymentDetails.upiId) {
          toast({
            title: "UPI ID Required",
            description: "Please enter your UPI ID",
            variant: "destructive"
          });
          return;
        }
      } else if (paymentMethod === 'bank') {
        if (!paymentDetails.bankName || !paymentDetails.accountNumber) {
          toast({
            title: "Bank Details Required",
            description: "Please fill in bank details",
            variant: "destructive"
          });
          return;
        }
      }
    }

    setProcessing(true);
    try {
      // Simulate payment processing (replace with actual payment gateway integration)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await onSelectPlan(selectedPlan, paymentMethod);
      
      toast({
        title: "Payment Successful",
        description: `Your ${selectedPlanData.name} subscription has been activated!`,
      });
      
      setShowPayment(false);
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Payment could not be processed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const totalAmount = selectedPlanData ? (selectedPlanData.setupFee || 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </DialogHeader>

        {!showPayment ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-2 border-primary shadow-lg'
                      : 'border border-border'
                  } ${plan.recommended ? 'border-orange-500' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        {plan.recommended && (
                          <Badge className="mb-2 bg-orange-500">Most Popular</Badge>
                        )}
                        <CardTitle>{plan.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      </div>
                      {selectedPlan === plan.id && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold">₹{plan.setupFee.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-2">setup</span>
                        </div>
                        {plan.renewalFee > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            + ₹{plan.renewalFee.toLocaleString()}/year renewal
                            {plan.perLocationFee > 0 && ` + ₹${plan.perLocationFee.toLocaleString()}/year per location`}
                          </p>
                        )}
                        {plan.price === 0 && (
                          <p className="text-sm text-orange-500 mt-1">
                            + 0.20% transaction fee
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleProceedToPayment} disabled={!selectedPlan}>
                {selectedPlan === 'free' ? 'Continue' : 'Proceed to Payment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Selected Plan:</span>
                    <span className="font-semibold">{selectedPlanData?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`cursor-pointer ${paymentMethod === 'online' ? 'border-primary border-2' : ''}`} onClick={() => setPaymentMethod('online')}>
                    <CardContent className="p-4 flex items-center space-x-3">
                      <RadioGroupItem value="online" id="online" className="mt-0" />
                      <div className="flex-1">
                        <Label htmlFor="online" className="cursor-pointer flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Card Payment</span>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`cursor-pointer ${paymentMethod === 'upi' ? 'border-primary border-2' : ''}`} onClick={() => setPaymentMethod('upi')}>
                    <CardContent className="p-4 flex items-center space-x-3">
                      <RadioGroupItem value="upi" id="upi" className="mt-0" />
                      <div className="flex-1">
                        <Label htmlFor="upi" className="cursor-pointer flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span>UPI</span>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`cursor-pointer ${paymentMethod === 'bank' ? 'border-primary border-2' : ''}`} onClick={() => setPaymentMethod('bank')}>
                    <CardContent className="p-4 flex items-center space-x-3">
                      <RadioGroupItem value="bank" id="bank" className="mt-0" />
                      <div className="flex-1">
                        <Label htmlFor="bank" className="cursor-pointer flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          <span>Bank Transfer</span>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Details Forms */}
            <div className="space-y-4">
              {(paymentMethod === 'online' || paymentMethod === 'card') && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold">Card Details</h4>
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      value={paymentDetails.cardName}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardName: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        value={paymentDetails.expiryDate}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="password"
                        value={paymentDetails.cvv}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvv: e.target.value }))}
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold">UPI Details</h4>
                  <div>
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={paymentDetails.upiId}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, upiId: e.target.value }))}
                      placeholder="yourname@paytm"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold">Bank Transfer Details</h4>
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={paymentDetails.bankName}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="Bank Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={paymentDetails.accountNumber}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Account Number"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPayment(false)}>
                Back
              </Button>
              <Button onClick={handleCompletePayment} disabled={processing}>
                {processing ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

