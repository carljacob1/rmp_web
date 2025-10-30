import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Users, DollarSign, Clock, Star } from "lucide-react";
import { DateRange, ReportType } from "./ReportsManager";

interface ServiceReportsProps {
  reportType: string;
  dateRange: DateRange;
}

const revenueData = {
  totalRevenue: 28750.00,
  revenueGrowth: 18.3,
  totalAppointments: 145,
  averageServiceValue: 98.45,
  topServices: [
    { name: "Deep Tissue Massage", appointments: 45, revenue: 5400.00 },
    { name: "Hair Cut & Style", appointments: 38, revenue: 3230.00 },
    { name: "Facial Treatment", appointments: 32, revenue: 3040.00 },
  ]
};

const appointmentData = {
  totalAppointments: 145,
  completedAppointments: 132,
  cancelledAppointments: 8,
  noShowRate: 3.4,
  appointmentsByDay: [
    { day: "Monday", appointments: 18 },
    { day: "Tuesday", appointments: 22 },
    { day: "Wednesday", appointments: 25 },
    { day: "Thursday", appointments: 21 },
    { day: "Friday", appointments: 28 },
    { day: "Saturday", appointments: 31 },
  ]
};

const clientData = {
  totalClients: 89,
  newClients: 12,
  returningClients: 77,
  clientRetentionRate: 86.5,
  topClients: [
    { name: "Sarah Johnson", appointments: 8, totalSpent: 680.00 },
    { name: "Mike Chen", appointments: 6, totalSpent: 720.00 },
    { name: "Emma Davis", appointments: 5, totalSpent: 475.00 },
  ]
};

export function ServiceReports({ reportType, dateRange }: ServiceReportsProps) {
  const renderRevenueReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{revenueData.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-success mr-1" />
              <span className="text-sm text-success">+{revenueData.revenueGrowth}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold">{revenueData.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Service Value</p>
                <p className="text-2xl font-bold">₹{revenueData.averageServiceValue}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold">+{revenueData.revenueGrowth}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueData.topServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">{service.appointments} appointments</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{service.revenue.toLocaleString()}</p>
                  <Badge variant="secondary">#{index + 1} Revenue</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAppointmentAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold">{appointmentData.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{appointmentData.completedAppointments}</p>
              </div>
              <Star className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-warning">{appointmentData.cancelledAppointments}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No-Show Rate</p>
                <p className="text-2xl font-bold">{appointmentData.noShowRate}%</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appointmentData.appointmentsByDay.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <h4 className="font-medium">{day.day}</h4>
                <div className="flex items-center">
                  <div className="w-32 bg-muted rounded-full h-2 mr-3">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(day.appointments / 31) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-medium">{day.appointments}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderClientReports = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clientData.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Clients</p>
                <p className="text-2xl font-bold text-success">{clientData.newClients}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Returning Clients</p>
                <p className="text-2xl font-bold">{clientData.returningClients}</p>
              </div>
              <Users className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold">{clientData.clientRetentionRate}%</p>
              </div>
              <Star className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientData.topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{client.name}</h4>
                  <p className="text-sm text-muted-foreground">{client.appointments} appointments</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{client.totalSpent.toLocaleString()}</p>
                  <Badge variant="secondary">VIP Client</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderServicePerformance = () => (
    <Card>
      <CardHeader>
        <CardTitle>Service Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Service Performance Report</h3>
          <p className="text-muted-foreground">
            Detailed analysis of service performance including booking rates, client satisfaction, and seasonal trends.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  switch (reportType) {
    case "revenue":
      return renderRevenueReport();
    case "appointments":
      return renderAppointmentAnalytics();
    case "clients":
      return renderClientReports();
    case "services":
      return renderServicePerformance();
    default:
      return renderRevenueReport();
  }
}