
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/content/DocumentsTab";
import { ChunkingTab } from "@/components/content/chunking/ChunkingTab";
import { useToast } from "@/components/ui/use-toast";

export default function ContentManagement() {
  // Use localStorage to persist the active tab between renders
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("contentActiveTab");
    return savedTab || "documents";
  });
  const { toast } = useToast();

  // Effect to ensure components are loaded and persist tab state
  useEffect(() => {
    console.log("ContentManagement component mounted, active tab:", activeTab);
    
    // Save active tab to localStorage whenever it changes
    localStorage.setItem("contentActiveTab", activeTab);
    
    // Force refresh of the component state after a short delay
    const timer = setTimeout(() => {
      console.log("Refreshing ContentManagement component state");
      setActiveTab(prevTab => prevTab); // Force state update to ensure render
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    console.log(`Tab changed to: ${value}`);
    setActiveTab(value);
  };

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
        
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="w-full"
          defaultValue="documents"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="chunking">Chunking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4" forceMount hidden={activeTab !== "documents"}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>
                  Follow these steps to manage documents:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Select a document source from the dropdown (currently Google Drive)</li>
                  <li>Click "Refresh Documents" to retrieve files from the selected source</li>
                  <li>If you've configured a specific Google Drive folder ID in settings, only files from that folder will be retrieved</li>
                  <li>Select files you want to process by checking the boxes</li>
                  <li>Click "Process Selected" to upload the documents to the database</li>
                  <li>Use the Database Documents section below to view and manage processed documents</li>
                </ol>
              </CardContent>
            </Card>
            
            <DocumentsTab />
          </TabsContent>
          
          <TabsContent value="chunking" className="space-y-4" forceMount hidden={activeTab !== "chunking"}>
            <ChunkingTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
