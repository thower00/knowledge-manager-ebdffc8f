
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/content/DocumentsTab";
import { DocumentProcessingTab } from "@/components/content/processing/DocumentProcessingTab";
import { useToast } from "@/components/ui/use-toast";

export default function ContentManagement() {
  // Use localStorage to persist the active tab between renders with error handling
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem("contentActiveTab");
      console.log("Initial content tab from localStorage:", savedTab);
      // Update default tab to 'documents' if saved tab was 'chunking'
      if (savedTab === "chunking") {
        return "processing";
      }
      return savedTab || "documents";
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return "documents";
    }
  });
  
  const { toast } = useToast();

  // Effect to store the active tab in localStorage
  useEffect(() => {
    try {
      console.log("ContentManagement: active tab changed to:", activeTab);
      localStorage.setItem("contentActiveTab", activeTab);
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
  }, [activeTab]);

  // Debug rendering of the component
  useEffect(() => {
    console.log("ContentManagement component rendered with activeTab:", activeTab);
  }, []);

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
          onValueChange={setActiveTab}
          className="w-full"
          defaultValue="documents"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
          </TabsList>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
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
          
          {/* Document Processing Tab - Always render to prevent hooks issues */}
          <TabsContent value="processing" className="space-y-4">
            <DocumentProcessingTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
