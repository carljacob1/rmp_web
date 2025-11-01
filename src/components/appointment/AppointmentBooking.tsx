import { useState, useEffect } from "react";
import { Calendar, Clock, User, Mail, Phone, QrCode, Send, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { dbGetAll, dbPut, dbDelete } from "@/lib/indexeddb";
import { BulkUpload } from "@/components/common/BulkUpload";
import { getCurrentUserId, filterByUserId } from "@/lib/userUtils";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

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
  notes?: string;
  googleEventId?: string;
  timestamp?: string;
}

interface Invoice {
  id: string;
  appointmentId: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  barcode: string;
  paymentMethod?: string;
}

export function AppointmentBooking() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();

  // Load appointments and services from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = await getCurrentUserId();
        const [apts, svcs] = await Promise.all([
          dbGetAll<Appointment>('appointments'),
          dbGetAll<Service>('services')
        ]);
        // Filter by userId
        const userApts = userId ? filterByUserId(apts || [], userId) : apts || [];
        const userSvcs = userId ? filterByUserId(svcs || [], userId) : svcs || [];
        setAppointments(userApts);
        setServices(userSvcs);
      } catch (error) {
        console.error('Error loading appointment data:', error);
        toast({
          title: "Error",
          description: "Failed to load appointments and services",
          variant: "destructive"
        });
      }
    };
    loadData();
    
    // Listen for updates
    const handleUpdate = () => loadData();
    window.addEventListener('focus', handleUpdate);
    return () => window.removeEventListener('focus', handleUpdate);
  }, [toast]);

  const generateBarcode = (invoiceId: string): string => {
    // Simple barcode generation - in real implementation, use proper barcode library
    return `*${invoiceId}*`;
  };

  const handleBookAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'googleEventId'>) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast({
          title: "Error",
          description: "Please log in to book appointments",
          variant: "destructive"
        });
        return;
      }

      const newAppointment: Appointment = {
        ...appointmentData,
        id: `apt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        status: "scheduled",
        timestamp: new Date().toISOString(),
        userId: userId as any // Add userId for data isolation
      };

      // Save to IndexedDB
      await dbPut('appointments', newAppointment);
      
      // Simulate Google Calendar sync (optional)
      try {
        const googleEventId = await syncWithGoogleCalendar(newAppointment);
        newAppointment.googleEventId = googleEventId;
        await dbPut('appointments', newAppointment); // Update with Google ID
      } catch (error) {
        // Google sync failed, but appointment is saved
        console.log('Google Calendar sync failed, appointment still saved');
      }
      
      // Update local state
      setAppointments(prev => [...prev, newAppointment]);
      toast({
        title: "Appointment Booked",
        description: "Appointment scheduled successfully"
      });
      setShowBookingForm(false);
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveService = async (service: Service) => {
    try {
      const serviceWithId = service.id 
        ? service 
        : { ...service, id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
      
      await dbPut('services', serviceWithId);
      setServices(prev => {
        const exists = prev.some(s => s.id === serviceWithId.id);
        return exists 
          ? prev.map(s => s.id === serviceWithId.id ? serviceWithId : s)
          : [...prev, serviceWithId];
      });
      
      toast({
        title: "Success",
        description: `Service ${editingService ? 'updated' : 'added'} successfully`
      });
      
      setEditingService(null);
      setShowServiceForm(false);
    } catch (error) {
      console.error('Error saving service:', error);
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
      setServices(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Success",
        description: "Service deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive"
      });
    }
  };

  const syncWithGoogleCalendar = async (appointment: Appointment): Promise<string> => {
    // Simulate Google Calendar API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`goog_${appointment.id}_${Date.now()}`);
      }, 1000);
    });
  };

  const generateInvoice = (appointment: Appointment) => {
    const invoiceId = `INV-${Date.now()}`;
    const invoice: Invoice = {
      id: invoiceId,
      appointmentId: appointment.id,
      amount: appointment.price,
      status: "pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      barcode: generateBarcode(invoiceId)
    };
    
    setInvoices(prev => [...prev, invoice]);
    setSelectedAppointment(appointment);
    setShowInvoiceModal(true);
    
    toast({
      title: "Invoice Generated",
      description: `Invoice ${invoiceId} created for ${appointment.clientName}`
    });
  };

  const sendInvoice = async (invoice: Invoice, appointment: Appointment) => {
    // Simulate sending invoice via email/SMS
    try {
      // In real implementation, integrate with email/SMS service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invoice Sent",
        description: `Invoice sent to ${appointment.clientEmail} and ${appointment.clientPhone}`
      });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send invoice",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-primary text-primary-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      case "no-show": return "bg-warning text-warning-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Appointment Management</h2>
        <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <BookingForm services={services} onBook={handleBookAppointment} onCancel={() => setShowBookingForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments ({appointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map(appointment => {
                const service = services.find(s => s.id === appointment.service);
                const invoice = invoices.find(i => i.appointmentId === appointment.id);
                
                return (
                  <div key={appointment.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{appointment.clientName}</h4>
                        <p className="text-sm text-muted-foreground">{service?.name}</p>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {appointment.date}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {appointment.time}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {appointment.clientPhone}
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {appointment.clientEmail}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-medium">₹{appointment.price}</span>
                      <div className="flex gap-2">
                        {appointment.googleEventId && (
                          <Badge variant="outline" className="text-xs">
                            Synced
                          </Badge>
                        )}
                        {invoice ? (
                          <Badge className={getInvoiceStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateInvoice(appointment)}
                          >
                            Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {appointments.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Available Services</CardTitle>
              <div className="flex gap-2">
                <BulkUpload
                  businessType="service"
                  storeName="services"
                  fields={[
                    { name: 'name', label: 'Service Name', type: 'text', required: true },
                    { name: 'description', label: 'Description', type: 'text', required: false },
                    { name: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
                    { name: 'price', label: 'Price', type: 'number', required: true }
                  ]}
                  onUploadComplete={async () => {
                    const svcs = await dbGetAll<Service>('services');
                    setServices(svcs || []);
                  }}
                />
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
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services available</p>
                <p className="text-sm mt-2">Add services to enable appointment booking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(service => (
                  <div key={service.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">₹{service.price}</span>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Generated</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <InvoiceView 
              appointment={selectedAppointment}
              invoice={invoices.find(i => i.appointmentId === selectedAppointment.id)!}
              onSend={(invoice) => sendInvoice(invoice, selectedAppointment)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Service Form Modal */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent>
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
  );
}

function BookingForm({ 
  services, 
  onBook, 
  onCancel 
}: {
  services: Service[];
  onBook: (appointment: Omit<Appointment, 'id' | 'status' | 'googleEventId'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    service: "",
    date: "",
    time: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.service || !formData.date || !formData.time) return;
    
    const selectedService = services.find(s => s.id === formData.service);
    if (!selectedService) {
      return;
    }
    
    onBook({
      ...formData,
      service: selectedService.name, // Store service name for display
      duration: selectedService.duration,
      price: selectedService.price
    });
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Book New Appointment</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium">Client Name</label>
          <Input
            value={formData.clientName}
            onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.clientPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
              required
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Service</label>
          <Select value={formData.service} onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - ₹{service.price} ({service.duration}min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Time</label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              required
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Notes (Optional)</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any special requirements or notes..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Book Appointment</Button>
        </div>
      </form>
    </div>
  );
}

function InvoiceView({ 
  appointment, 
  invoice, 
  onSend 
}: {
  appointment: Appointment;
  invoice: Invoice;
  onSend: (invoice: Invoice) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Invoice #{invoice.id}</h3>
        <div className="font-mono text-2xl mt-2 p-2 bg-muted rounded">
          {invoice.barcode}
        </div>
        <div className="flex items-center justify-center mt-2">
          <QrCode className="h-4 w-4 mr-1" />
          <span className="text-sm text-muted-foreground">Scan to pay</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Client:</span>
          <span className="font-medium">{appointment.clientName}</span>
        </div>
        <div className="flex justify-between">
          <span>Service:</span>
          <span className="font-medium">{appointment.service}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span className="font-medium">{appointment.date} at {appointment.time}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount:</span>
          <span className="font-medium">₹{invoice.amount}</span>
        </div>
        <div className="flex justify-between">
          <span>Due Date:</span>
          <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <Badge className={getInvoiceStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSend(invoice)}>
          <Send className="h-4 w-4 mr-2" />
          Send Invoice
        </Button>
      </div>
    </div>
  );
}

function getInvoiceStatusColor(status: string) {
  switch (status) {
    case "paid": return "bg-success text-success-foreground";
    case "pending": return "bg-warning text-warning-foreground";
    case "overdue": return "bg-destructive text-destructive-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
}

function ServiceForm({
  service,
  onSave,
  onCancel
}: {
  service: Service | null;
  onSave: (service: Service) => void;
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
    <div>
      <DialogHeader>
        <DialogTitle>{service ? 'Edit Service' : 'Add New Service'}</DialogTitle>
      </DialogHeader>
      
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
    </div>
  );
}