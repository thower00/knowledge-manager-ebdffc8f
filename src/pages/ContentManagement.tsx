
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Content Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Manage your document library, including uploads, organization, and metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Document management functionality coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Media Management</CardTitle>
              <CardDescription>
                Manage images, videos, and other media files.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Media management functionality coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Management</CardTitle>
              <CardDescription>
                Create and manage content templates for consistent formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Template management functionality coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
