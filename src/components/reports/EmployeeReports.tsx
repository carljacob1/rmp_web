import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Clock, TrendingUp, Download, Plus, AlertTriangle, UserCheck } from "lucide-react";
import { DateRange } from "./ReportsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatIndianCurrency } from "@/lib/indian-tax-utils";
import { toast } from "@/hooks/use-toast";

interface EmployeeReportsProps {
  reportType: string;
  dateRange: DateRange;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  status: 'active' | 'inactive' | 'on-leave';
  hoursWorked: number;
  overtimeHours: number;
  performanceScore: number;
}

interface PayrollEntry {
  id: string;
  employeeId: string;
  period: string;
  basicSalary: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  taxWithheld: number;
}

interface EmployeeSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalHours: number;
  totalOvertime: number;
  avgPerformance: number;
}

const EMPLOYEES_STORAGE_KEY = 'employees_data';
const PAYROLL_STORAGE_KEY = 'payroll_data';

export function EmployeeReports({ reportType, dateRange }: EmployeeReportsProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    status: 'active',
    performanceScore: 80
  });
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);

  // Load data from localStorage
  useEffect(() => {
    const storedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    const storedPayroll = localStorage.getItem(PAYROLL_STORAGE_KEY);
    
    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees));
      } catch (error) {
        console.error('Error loading employee data:', error);
      }
    }
    
    if (storedPayroll) {
      try {
        setPayrollEntries(JSON.parse(storedPayroll));
      } catch (error) {
        console.error('Error loading payroll data:', error);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(payrollEntries));
  }, [payrollEntries]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const calculateEmployeeSummary = (): EmployeeSummary => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    
    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      totalPayroll: activeEmployees.reduce((sum, emp) => sum + emp.salary, 0),
      averageSalary: activeEmployees.length > 0 ? activeEmployees.reduce((sum, emp) => sum + emp.salary, 0) / activeEmployees.length : 0,
      totalHours: activeEmployees.reduce((sum, emp) => sum + emp.hoursWorked, 0),
      totalOvertime: activeEmployees.reduce((sum, emp) => sum + emp.overtimeHours, 0),
      avgPerformance: activeEmployees.length > 0 ? activeEmployees.reduce((sum, emp) => sum + emp.performanceScore, 0) / activeEmployees.length : 0
    };
  };

  const addEmployee = () => {
    if (!newEmployee.name || !newEmployee.position || !newEmployee.department || !newEmployee.salary) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name!,
      position: newEmployee.position!,
      department: newEmployee.department!,
      hireDate: new Date().toISOString().split('T')[0],
      salary: newEmployee.salary!,
      status: newEmployee.status as 'active' | 'inactive' | 'on-leave',
      hoursWorked: newEmployee.hoursWorked || 0,
      overtimeHours: newEmployee.overtimeHours || 0,
      performanceScore: newEmployee.performanceScore || 80
    };

    setEmployees(prev => [...prev, employee]);
    setNewEmployee({ status: 'active', performanceScore: 80 });
    setIsEmployeeDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Employee added successfully",
    });
  };

  const generatePayroll = () => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const newPayrollEntries = activeEmployees.map(emp => {
      const overtimePay = emp.overtimeHours * (emp.salary / 160) * 1.5; // 1.5x overtime rate
      const basicSalary = emp.salary;
      const bonuses = emp.performanceScore > 90 ? emp.salary * 0.1 : 0;
      const grossPay = basicSalary + overtimePay + bonuses;
      const taxWithheld = grossPay * 0.2; // 20% tax
      const deductions = grossPay * 0.05; // 5% other deductions
      const netPay = grossPay - taxWithheld - deductions;

      return {
        id: `${emp.id}-${currentPeriod}`,
        employeeId: emp.id,
        period: currentPeriod,
        basicSalary,
        overtime: overtimePay,
        bonuses,
        deductions,
        netPay,
        taxWithheld
      };
    });

    setPayrollEntries(prev => [...prev.filter(entry => entry.period !== currentPeriod), ...newPayrollEntries]);
    
    toast({
      title: "Success",
      description: `Payroll generated for ${activeEmployees.length} employees`,
    });
  };

  const exportEmployeeData = (format: 'csv' | 'json', type: 'employees' | 'payroll') => {
    const data = type === 'employees' ? employees : payrollEntries;
    
    if (format === 'csv') {
      let csvHeaders = '';
      let csvData = '';
      
      if (type === 'employees') {
        csvHeaders = 'ID,Name,Position,Department,Hire Date,Salary,Status,Hours Worked,Overtime Hours,Performance Score\n';
        csvData = employees.map(emp => 
          `${emp.id},${emp.name},${emp.position},${emp.department},${emp.hireDate},${emp.salary},${emp.status},${emp.hoursWorked},${emp.overtimeHours},${emp.performanceScore}`
        ).join('\n');
      } else {
        csvHeaders = 'ID,Employee ID,Period,Basic Salary,Overtime,Bonuses,Deductions,Net Pay,Tax Withheld\n';
        csvData = payrollEntries.map(entry => 
          `${entry.id},${entry.employeeId},${entry.period},${entry.basicSalary},${entry.overtime},${entry.bonuses},${entry.deductions},${entry.netPay},${entry.taxWithheld}`
        ).join('\n');
      }
      
      const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const exportData = { data, exportDate: new Date().toISOString(), type };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `${type} data exported as ${format.toUpperCase()}`,
    });
  };

  const summary = calculateEmployeeSummary();

  const renderEmployeeOverview = () => (
    <div className="space-y-6">
      {offlineMode && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">Offline Mode - Data saved locally</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold text-success">{summary.activeEmployees}</p>
              </div>
              <UserCheck className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">{formatIndianCurrency(summary.totalPayroll)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold">{summary.avgPerformance.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => exportEmployeeData('csv', 'employees')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Employees CSV
          </Button>
          <Button onClick={() => exportEmployeeData('csv', 'payroll')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Payroll CSV
          </Button>
          <Button onClick={generatePayroll} variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Generate Payroll
          </Button>
        </div>
        
        <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newEmployee.name || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={newEmployee.position || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="e.g., Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newEmployee.department || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., IT, HR, Sales"
                />
              </div>
              <div>
                <Label htmlFor="salary">Monthly Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={newEmployee.salary || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: parseFloat(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="hoursWorked">Hours Worked (Monthly)</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  value={newEmployee.hoursWorked || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, hoursWorked: parseFloat(e.target.value) }))}
                  placeholder="160"
                />
              </div>
              <Button onClick={addEmployee} className="w-full">
                Add Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee List ({employees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{formatIndianCurrency(employee.salary)}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : employee.status === 'on-leave' ? 'secondary' : 'destructive'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll ({payrollEntries.slice(-5).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollEntries.slice(-5).map((entry) => {
                  const employee = employees.find(emp => emp.id === entry.employeeId);
                  const grossPay = entry.basicSalary + entry.overtime + entry.bonuses;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.period}</TableCell>
                      <TableCell>{employee?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatIndianCurrency(grossPay)}</TableCell>
                      <TableCell>{formatIndianCurrency(entry.netPay)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return renderEmployeeOverview();
}