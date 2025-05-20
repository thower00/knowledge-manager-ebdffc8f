
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentProcessingSettings } from "./DocumentProcessingSettings";
import { GoogleDriveIntegration } from "./GoogleDriveIntegration";

export function ConfigurationTabs() {
  // Use localStorage to persist the active tab between renders
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("configActiveTab");
    return savedTab || "document-processing";
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("configActiveTab", activeTab);
    console.log("Active tab changed to:", activeTab);
  }, [activeTab]);

  return (
    <Tabs 
      defaultValue="document-processing" 
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="document-processing">Document Processing Settings</TabsTrigger>
        <TabsTrigger value="google-drive">Google Drive Integration</TabsTrigger>
      </TabsList>
      
      <TabsContent value="document-processing" forceMount>
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="google-drive" forceMount>
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
