
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/content/DocumentsTab";

export default function ContentManagement() {
  return (
    <>
      <Helmet>
        <title>Content Management | Knowledge Manager</title>
      </Helmet>
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Manage your content assets and knowledge base resources.
          </p>
        </div>
        
        <Tabs defaultValue="documents">
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
