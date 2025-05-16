
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRoleManagement } from "@/components/admin/UserRoleManagement";
import { ConfigurationManagement } from "@/components/admin/ConfigurationManagement";
import { TestManagement } from "@/components/admin/TestManagement";

export default function Admin() {
  // In a real app, we would check if the user is authorized to access this page
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UserRoleManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Management</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigurationManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="testing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Management</CardTitle>
            </CardHeader>
            <CardContent>
              <TestManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
