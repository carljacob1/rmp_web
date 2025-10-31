import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings as SettingsIcon, Bell } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

interface SettingsProps {
  onBack: () => void;
  businessType?: string;
}

export function Settings({ onBack, businessType = "retail" }: SettingsProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  if (showAdminLogin && !isAdminLoggedIn) {
    return (
      <AdminLogin 
        onLogin={() => {
          setIsAdminLoggedIn(true);
          setShowAdminLogin(false);
        }} 
      />
    );
  }

  if (isAdminLoggedIn) {
    return (
      <AdminDashboard 
        onLogout={() => {
          setIsAdminLoggedIn(false);
          setShowAdminLogin(false);
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your account and system preferences</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your basic preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Business Type</h4>
                  <p className="text-sm text-muted-foreground">
                    Your current business category
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{businessType}</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Offline Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    Data stored locally using IndexedDB
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>
                Access administrative functions and system management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Admin Access</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to access the admin panel. You'll need admin credentials to proceed.
                  </p>
                  <Button onClick={() => setShowAdminLogin(true)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Access Admin Panel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your business
                  </p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">SMS Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive SMS alerts for important events
                  </p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

