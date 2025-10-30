import { useState } from "react";
import { Calendar, Clock, User, Mail, Phone, QrCode, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

const services: Service[] = [
  { id: "1", name: "Hair Cut & Style", duration: 60, price: 85, description: "Professional haircut and styling" },
  { id: "2", name: "Deep Tissue Massage", duration: 90, price: 120, description: "Therapeutic deep tissue massage" },
  { id: "3", name: "Facial Treatment", duration: 75, price: 95, description: "Rejuvenating facial treatment" },
  { id: "4", name: "Manicure & Pedicure", duration: 45, price: 65, description: "Complete nail care service" },
];

export function AppointmentBooking() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const generateBarcode = (invoiceId: string): string => {
    // Simple barcode generation - in real implementation, use proper barcode library
    return `*${invoiceId}*`;
  };

  const handleBookAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'googleEventId'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString(),
      status: "scheduled"
    };

    // Simulate Google Calendar sync
    try {
      // In real implementation, use Google Calendar API
      const googleEventId = await syncWithGoogleCalendar(newAppointment);
      newAppointment.googleEventId = googleEventId;
      
      setAppointments(prev => [...prev, newAppointment]);
      toast({
        title: "Appointment Booked",
        description: "Appointment scheduled and synced with Google Calendar"
      });
    } catch (error) {
      setAppointments(prev => [...prev, newAppointment]);
      toast({
        title: "Appointment Booked",
        description: "Appointment scheduled (Google Calendar sync failed)"
      });
    }
    
    setShowBookingForm(false);
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
            <CardTitle>Available Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                    </div>
                    <span className="font-medium">₹{service.price}</span>
                  </div>
                </div>
              ))}
            </div>
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
    
    const selectedService = services.find(s => s.id === formData.service)!;
    
    onBook({
      ...formData,
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