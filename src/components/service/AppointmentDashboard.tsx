import { useEffect, useState } from "react";
import { Calendar, Clock, User, Plus, DollarSign, Phone, Mail, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OfflinePOS } from "@/components/pos/OfflinePOS";
import { dbGetAll } from "@/lib/indexeddb";

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
interface ServiceItem { name: string; duration: number; price: number; id: string }

export function AppointmentDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showPOS, setShowPOS] = useState(false);
  
  useEffect(() => {
    (async () => {
      const [apt, svc] = await Promise.all([
        dbGetAll<Appointment>('appointments'),
        dbGetAll<ServiceItem>('services')
      ]);
      setAppointments(apt);
      setServices(svc);
    })();
  }, []);
  
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
      {/* POS Button */}
      <div className="flex justify-end">
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
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
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
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{service.price}</p>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}