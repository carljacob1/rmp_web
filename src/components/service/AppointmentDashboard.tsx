import { useEffect, useState } from "react";
import { Calendar, Clock, User, Plus, DollarSign, Phone, Mail, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { OfflinePOS } from "@/components/pos/OfflinePOS";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { getCurrentUserId, filterByUserId } from "@/lib/userUtils";
import { BulkUpload } from "@/components/common/BulkUpload";

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
}

// No hardcoded demo data; load from IndexedDB
interface ServiceItem { 
  id: string;
  name: string; 
  duration: number; 
  price: number;
  description?: string;
}

export function AppointmentDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showPOS, setShowPOS] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const { toast } = useToast();
  
  const loadData = async () => {
    const userId = await getCurrentUserId();
    const [apt, svc] = await Promise.all([
      dbGetAll<Appointment>('appointments'),
      dbGetAll<ServiceItem>('services')
    ]);
    // Filter by userId
    const userApts = userId ? filterByUserId(apt || [], userId) : apt || [];
    const userSvcs = userId ? filterByUserId(svc || [], userId) : svc || [];
    setAppointments(userApts);
    setServices(userSvcs);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('focus', handleUpdate);
    return () => window.removeEventListener('focus', handleUpdate);
  }, []);

  const handleSaveService = async (service: ServiceItem) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to save services",
          variant: "destructive"
        });
        return;
      }
      const serviceWithId = service.id 
        ? { ...service, userId }
        : { ...service, id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, userId };
      
      await dbPut('services', serviceWithId);
      await loadData();
      toast({
        title: "Success",
        description: `Service ${editingService ? 'updated' : 'added'} successfully`
      });
      setEditingService(null);
      setShowServiceForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive"
      });
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await dbDelete('services', id);
      await loadData();
      toast({
        title: "Success",
        description: "Service deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive"
      });
    }
  };
  
  const today = new Date().toISOString().slice(0,10);
  const todayAppointments = appointments.filter(apt => apt.date === today);
  const totalRevenue = appointments
    .filter(apt => apt.status === "completed")
    .reduce((sum, apt) => sum + apt.price, 0);
  const upcomingCount = appointments.filter(apt => apt.status === "scheduled").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-primary text-primary-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      case "no-show": return "bg-warning text-warning-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  if (showPOS) {
    return <OfflinePOS businessType="service" onClose={() => setShowPOS(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <BulkUpload
          businessType="service"
          storeName="services"
          fields={[
            { name: 'name', label: 'Service Name', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'text', required: false },
            { name: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
            { name: 'price', label: 'Price', type: 'number', required: true }
          ]}
          onUploadComplete={loadData}
        />
        <Button 
          onClick={() => setShowPOS(true)}
          className="bg-success hover:bg-success/90 text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Open POS
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue (Completed)</p>
                <p className="text-2xl font-bold">₹{totalRevenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Appointments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        {appointment.clientName}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{appointment.service}</p>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>{appointment.date}</span>
                      <span>{appointment.time}</span>
                      <span>{appointment.duration}min</span>
                    </div>
                    <span className="font-medium text-foreground">₹{appointment.price}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {appointment.clientPhone}
                    </span>
                    <span className="flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {appointment.clientEmail}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2 mt-3">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Complete</Button>
                    <Button variant="outline" size="sm">Invoice</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Services</CardTitle>
              <Button 
                size="sm"
                onClick={() => {
                  setEditingService(null);
                  setShowServiceForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No services available</p>
                <p className="text-sm mt-2">Add services to enable booking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center p-3 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-medium">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">₹{service.price}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingService(service);
                          setShowServiceForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Form Dialog */}
        <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            </DialogHeader>
            <ServiceForm
              service={editingService}
              onSave={handleSaveService}
              onCancel={() => {
                setEditingService(null);
                setShowServiceForm(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ServiceForm({
  service,
  onSave,
  onCancel
}: {
  service: ServiceItem | null;
  onSave: (service: ServiceItem) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: service?.name || "",
    description: service?.description || "",
    duration: service?.duration || 60,
    price: service?.price || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.duration <= 0 || formData.price <= 0) {
      return;
    }
    
    onSave({
      id: service?.id || "",
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium">Service Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Service description..."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Duration (minutes)</label>
          <Input
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Price (₹)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{service ? 'Update' : 'Add'} Service</Button>
      </div>
    </form>
  );
}