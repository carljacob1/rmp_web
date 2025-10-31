import { useState } from "react";
import { EmployeeLogin } from "@/components/attendance/EmployeeLogin";
import { Attendance } from "@/components/attendance/Attendance";

interface Employee {
  id: string;
  employeeId: string;
  pin: string;
  name: string;
  position: string;
  department: string;
  status: 'active' | 'inactive' | 'on-leave';
}

export function AttendancePage() {
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);

  const handleLogin = (employee: Employee) => {
    setLoggedInEmployee(employee);
  };

  const handleLogout = () => {
    setLoggedInEmployee(null);
  };

  if (loggedInEmployee) {
    return <Attendance employee={loggedInEmployee} onLogout={handleLogout} />;
  }

  return <EmployeeLogin onLogin={handleLogin} />;
}

