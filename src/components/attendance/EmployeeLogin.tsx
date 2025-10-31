import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbGetAll } from "@/lib/indexeddb";

interface Employee {
  id: string;
  employeeId: string;
  pin: string;
  name: string;
  position: string;
  department: string;
  status: 'active' | 'inactive' | 'on-leave';
}

interface EmployeeLoginProps {
  onLogin: (employee: Employee) => void;
}

export function EmployeeLogin({ onLogin }: EmployeeLoginProps) {
  const [credentials, setCredentials] = useState({
    employeeId: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.employeeId || !credentials.pin) {
      toast({
        title: "Error",
        description: "Please enter both Employee ID and PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find employee in IndexedDB
      const employees = await dbGetAll<Employee>('employees');
      const foundEmployee = employees.find(
        (emp: Employee) => 
          emp.employeeId.toUpperCase() === credentials.employeeId.toUpperCase().trim() && 
          emp.pin === credentials.pin
      );

      if (foundEmployee) {
        // Check if employee is active
        if (foundEmployee.status !== 'active') {
          toast({
            title: "Access Denied",
            description: `Employee status is ${foundEmployee.status}. Only active employees can mark attendance.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Login successful
        onLogin(foundEmployee);
        toast({
          title: "Login Successful",
          description: `Welcome ${foundEmployee.name}!`,
        });
        setCredentials({ employeeId: '', pin: '' });
      } else {
        toast({
          title: "Error",
          description: "Invalid Employee ID or PIN. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during login:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Employee Attendance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your Employee ID and PIN to mark attendance
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="Enter your Employee ID"
                  value={credentials.employeeId}
                  onChange={(e) => setCredentials(prev => ({ ...prev, employeeId: e.target.value.toUpperCase() }))}
                  className="pl-10"
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter your 4-digit PIN"
                  value={credentials.pin}
                  onChange={(e) => setCredentials(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  className="pl-10"
                  maxLength={4}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !credentials.employeeId || !credentials.pin}
            >
              {loading ? (
                "Logging in..."
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                If you don't have an Employee ID or PIN, please contact your administrator.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

