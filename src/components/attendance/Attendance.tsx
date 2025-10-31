import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogOut, Calendar, CheckCircle, XCircle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbPut, dbGetAll } from "@/lib/indexeddb";

interface Employee {
  id: string;
  employeeId: string;
  pin: string;
  name: string;
  position: string;
  department: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm
  checkOut?: string; // HH:mm
  status: 'present' | 'absent' | 'late' | 'half-day';
  hoursWorked?: number;
  timestamp: string;
}

interface AttendanceProps {
  employee: Employee;
  onLogout: () => void;
}

export function Attendance({ employee, onLogout }: AttendanceProps) {
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load today's attendance record
  useEffect(() => {
    const loadTodayRecord = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const records = await dbGetAll<AttendanceRecord>('attendance');
        const todayRec = records.find(
          (rec: AttendanceRecord) => 
            rec.employeeId === employee.employeeId && rec.date === today
        );
        
        if (todayRec) {
          setTodayRecord(todayRec);
          setCheckInTime(todayRec.checkIn);
          setCheckOutTime(todayRec.checkOut || null);
        }

        // Load recent records (last 7 days)
        const recent = records
          .filter((rec: AttendanceRecord) => rec.employeeId === employee.employeeId)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7);
        setRecentRecords(recent);
      } catch (error) {
        console.error('Error loading attendance:', error);
      }
    };
    loadTodayRecord();
  }, [employee]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].slice(0, 5); // HH:mm format
      
      // Check if already checked in today
      if (todayRecord) {
        toast({
          title: "Already Checked In",
          description: `You checked in at ${todayRecord.checkIn} today.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Determine status (late if after 10 AM)
      const hour = now.getHours();
      const status: 'present' | 'late' = hour >= 10 ? 'late' : 'present';

      const record: AttendanceRecord = {
        id: `att_${employee.id}_${date}_${Date.now()}`,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        date,
        checkIn: time,
        status,
        timestamp: now.toISOString()
      };

      await dbPut('attendance', record);
      setTodayRecord(record);
      setCheckInTime(time);
      
      toast({
        title: "Check-In Successful",
        description: status === 'late' 
          ? `Checked in at ${time} (Late)` 
          : `Checked in at ${time}`,
        variant: status === 'late' ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord || !checkInTime) {
      toast({
        title: "Error",
        description: "Please check in first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].slice(0, 5); // HH:mm format
      
      // Calculate hours worked
      const checkInParts = checkInTime.split(':');
      const checkOutParts = time.split(':');
      const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
      const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
      const hoursWorked = (checkOutMinutes - checkInMinutes) / 60;

      // Update record
      const updatedRecord: AttendanceRecord = {
        ...todayRecord,
        checkOut: time,
        hoursWorked: Math.max(0, hoursWorked)
      };

      await dbPut('attendance', updatedRecord);
      setTodayRecord(updatedRecord);
      setCheckOutTime(time);
      
      toast({
        title: "Check-Out Successful",
        description: `Checked out at ${time}. Hours worked: ${hoursWorked.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error checking out:', error);
      toast({
        title: "Error",
        description: "Failed to check out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case 'late':
        return <Badge className="bg-warning text-warning-foreground">Late</Badge>;
      case 'absent':
        return <Badge className="bg-destructive text-destructive-foreground">Absent</Badge>;
      case 'half-day':
        return <Badge variant="secondary">Half Day</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Attendance System</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome, {employee.name} ({employee.employeeId})
                </p>
                <p className="text-xs text-muted-foreground">
                  {employee.position} • {employee.department}
                </p>
              </div>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Today's Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Check In</span>
                  {checkInTime && <CheckCircle className="h-5 w-5 text-success" />}
                </div>
                <p className="text-2xl font-bold">
                  {checkInTime || '--:--'}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Check Out</span>
                  {checkOutTime && <CheckCircle className="h-5 w-5 text-success" />}
                </div>
                <p className="text-2xl font-bold">
                  {checkOutTime || '--:--'}
                </p>
              </div>
            </div>

            {todayRecord && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(todayRecord.status)}
                {todayRecord.hoursWorked && (
                  <>
                    <span className="text-sm text-muted-foreground ml-4">
                      Hours Worked:
                    </span>
                    <span className="font-semibold">
                      {todayRecord.hoursWorked.toFixed(2)} hours
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!checkInTime && (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Check In
                </Button>
              )}
              {checkInTime && !checkOutTime && (
                <Button 
                  onClick={handleCheckOut} 
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                  variant="outline"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Check Out
                </Button>
              )}
              {checkInTime && checkOutTime && (
                <div className="flex-1 p-4 bg-success/10 border border-success rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium">Attendance Complete</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You've completed your attendance for today
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.checkIn} {record.checkOut && `→ ${record.checkOut}`}
                          {record.hoursWorked && ` (${record.hoursWorked.toFixed(2)}h)`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

