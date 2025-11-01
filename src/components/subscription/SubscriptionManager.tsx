import { useEffect, useState } from "react";
import { MapPin, Plus, Edit, Trash2, CreditCard, Building2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { PlanSelectionDialog } from "./PlanSelectionDialog";
import { getCurrentUserId, filterByUserId } from "@/lib/userUtils";

interface Location {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  businessType?: string;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro';
  status: 'active' | 'inactive' | 'expired';
  maxLocations: number;
  currentLocations: number;
  startDate: string;
  endDate?: string;
  created_at?: string;
  updated_at?: string;
}

export function SubscriptionManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocation, setNewLocation] = useState<Location>({
    id: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    businessType: "",
    isActive: true
  });
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load locations first, then subscription (which needs location count)
    await loadLocations();
    await loadSubscription();
  };

  const loadLocations = async () => {
    try {
      const userId = await getCurrentUserId();
      const rows = await dbGetAll<Location>('locations');
      // Filter by userId to show only current user's locations
      const userLocations = userId ? filterByUserId(rows, userId) : [];
      setLocations(userLocations);
      return userLocations;
    } catch (error) {
      console.error('Error loading locations:', error);
      // If store doesn't exist yet, it will be created on first write
      setLocations([]);
      return [];
    }
  };

  const loadSubscription = async () => {
    try {
      // Load current user
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      
      // Get current locations count from state (will be updated after loadLocations runs first)
      const allLocations = await dbGetAll<Location>('locations').catch(() => []);
      const userLocations = filterByUserId(allLocations, userId);
      const activeLocations = userLocations.filter(l => l.isActive).length;
      
      const subs = await dbGetAll<Subscription>('subscriptions');
      const userSub = subs.find(s => s.userId === userId);
      
      if (userSub) {
        // Update currentLocations to match actual locations
        const updatedSub = {
          ...userSub,
          currentLocations: activeLocations,
          updated_at: new Date().toISOString()
        };
        await dbPut('subscriptions', updatedSub);
        setSubscription(updatedSub);
      } else {
        // Create default free subscription
        const defaultSub: Subscription = {
          id: `sub_${Date.now()}`,
          userId: userId,
          plan: 'free',
          status: 'active',
          maxLocations: 1,
          currentLocations: activeLocations,
          startDate: new Date().toISOString()
        };
        await dbPut('subscriptions', defaultSub);
        setSubscription(defaultSub);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };


  const handleSaveLocation = async () => {
    if (!newLocation.name || !newLocation.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return;
    }

    if (!newLocation.address || !newLocation.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check subscription limits only for NEW locations (editing existing locations is allowed)
      const isNewLocation = !newLocation.id;
      
      if (isNewLocation && subscription) {
        const currentLocationCount = locations.filter(l => l.isActive).length;
        const wouldExceed = currentLocationCount >= subscription.maxLocations;
        
        if (wouldExceed && subscription.plan === 'free') {
          toast({
            title: "Subscription Limit Reached",
            description: `Your free plan allows ${subscription.maxLocations} location(s). Please upgrade to Pro to add more locations.`,
            variant: "destructive"
          });
          return;
        }
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to save locations",
          variant: "destructive"
        });
        return;
      }

      const location = newLocation.id
        ? newLocation
        : { ...newLocation, id: `loc_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
      
      const now = new Date().toISOString();
      const normalized = {
        ...location,
        userId: userId, // Add userId for data isolation
        updated_at: location.updated_at || now,
        created_at: location.created_at || now
      };

      await dbPut('locations', normalized);
      
      const updatedLocations = await loadLocations();
      
      // Update subscription location count
      if (subscription) {
        const activeLocations = updatedLocations.filter(l => l.isActive).length;
        await dbPut('subscriptions', {
          ...subscription,
          currentLocations: activeLocations,
          updated_at: now
        });
        await loadSubscription();
      }

      toast({
        title: "Success",
        description: `Location "${location.name}" ${newLocation.id ? 'updated' : 'added'} successfully`,
      });
      
      setShowAddLocation(false);
      setEditingLocation(null);
      setNewLocation({
        id: "",
        name: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        email: "",
        businessType: "",
        isActive: true
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm(`Are you sure you want to delete this location?`)) {
      return;
    }

    try {
      await dbDelete('locations', locationId);
      const updatedLocations = await loadLocations();
      
      // Update subscription location count
      if (subscription) {
        const activeLocations = updatedLocations.filter(l => l.isActive).length;
        await dbPut('subscriptions', {
          ...subscription,
          currentLocations: activeLocations,
          updated_at: new Date().toISOString()
        });
        await loadSubscription();
      }

      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive"
      });
    }
  };

  const handleUpgrade = () => {
    setShowPlanSelection(true);
  };

  const handlePlanSelection = async (planId: string, paymentMethod: string) => {
    if (!subscription) return;

    try {
      const now = new Date().toISOString();
      const planData = planId === 'pro' 
        ? {
            plan: 'pro' as const,
            maxLocations: 999, // Unlimited for pro plan
          }
        : {
            plan: 'free' as const,
            maxLocations: 1,
          };

      const updatedSub: Subscription = {
        ...subscription,
        ...planData,
        updated_at: now
      };
      
      await dbPut('subscriptions', updatedSub);
      
      // Save payment record (optional - for tracking)
      if (planId === 'pro') {
        const paymentRecord = {
          id: `payment_${Date.now()}`,
          subscriptionId: subscription.id,
          planId: planId,
          amount: 6000, // Pro plan setup fee
          paymentMethod: paymentMethod,
          status: 'completed',
          timestamp: now,
          created_at: now
        };
        // Store in a payments store (you may need to create this)
        try {
          await dbPut('payments', paymentRecord);
        } catch (error) {
          console.log('Payments store not available, skipping payment record');
        }
      }
      
      await loadSubscription();
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error; // Re-throw to handle in PlanSelectionDialog
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={subscription.plan === 'pro' ? 'default' : 'secondary'} className="mb-2">
                    {subscription.plan === 'free' ? 'Free Plan' : 'Pro Plan'}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="font-medium capitalize">{subscription.status}</span>
                  </p>
                </div>
                {subscription.plan === 'free' && (
                  <Button onClick={handleUpgrade} size="sm">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Max Locations</p>
                  <p className="text-2xl font-bold">{subscription.maxLocations}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Locations</p>
                  <p className="text-2xl font-bold">{locations.filter(l => l.isActive).length}</p>
                </div>
              </div>
              {subscription.plan === 'free' && locations.filter(l => l.isActive).length >= subscription.maxLocations && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Limit Reached:</strong> You've reached the free plan limit of 1 location. 
                    Upgrade to Pro for unlimited locations at ₹50/month per location.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading subscription...</p>
          )}
        </CardContent>
      </Card>

      {/* Locations Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Business Locations
            </CardTitle>
            <Dialog open={showAddLocation} onOpenChange={(open) => {
              setShowAddLocation(open);
              if (!open) {
                setEditingLocation(null);
                setNewLocation({
                  id: "",
                  name: "",
                  address: "",
                  city: "",
                  state: "",
                  zipCode: "",
                  phone: "",
                  email: "",
                  businessType: "",
                  isActive: true
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingLocation(null);
                    setShowAddLocation(true);
                  }}
                  disabled={subscription ? locations.filter(l => l.isActive).length >= subscription.maxLocations : false}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location-name">Location Name *</Label>
                      <Input
                        id="location-name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Main Store"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="business-type">Business Type</Label>
                      <Input
                        id="business-type"
                        value={newLocation.businessType}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, businessType: e.target.value }))}
                        placeholder="Retail, Restaurant, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      value={newLocation.address}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newLocation.city}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={newLocation.state}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">Zip Code</Label>
                      <Input
                        id="zip"
                        value={newLocation.zipCode}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="Zip Code"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newLocation.phone}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLocation.email}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email address"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddLocation(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveLocation}>
                      Save Location
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No locations added yet. Add your first location to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {location.name}
                          {!location.isActive && (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                        {(location.city || location.state) && (
                          <p className="text-xs text-muted-foreground">
                            {[location.city, location.state, location.zipCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLocation(location);
                        setNewLocation(location);
                        setShowAddLocation(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selection Dialog */}
      <PlanSelectionDialog
        open={showPlanSelection}
        onClose={() => setShowPlanSelection(false)}
        currentPlan={subscription?.plan || 'free'}
        onSelectPlan={handlePlanSelection}
      />
    </div>
  );
}

