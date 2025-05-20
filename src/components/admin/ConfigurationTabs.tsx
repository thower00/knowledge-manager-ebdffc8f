
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentProcessingSettings } from "./DocumentProcessingSettings";
import { GoogleDriveIntegration } from "./GoogleDriveIntegration";

export function ConfigurationTabs() {
  // Use localStorage to persist the active tab between renders
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab or default to document-processing
    return localStorage.getItem("configActiveTab") || "document-processing";
  });

  useEffect(() => {
    console.log("ConfigurationTabs: active tab set to:", activeTab);
    localStorage.setItem("configActiveTab", activeTab);
  }, [activeTab]);

  return (
    <Tabs 
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
      defaultValue="document-processing"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="document-processing">Document Processing Settings</TabsTrigger>
        <TabsTrigger value="google-drive">Google Drive Integration</TabsTrigger>
      </TabsList>
      
      <TabsContent value="document-processing">
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="google-drive">
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
