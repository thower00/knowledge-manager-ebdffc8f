
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

  // Force re-render on component mount to ensure proper initialization
  useEffect(() => {
    console.log("ConfigurationTabs mounted, active tab:", activeTab);
    
    // Small delay to allow initial rendering to complete
    const timer = setTimeout(() => {
      console.log("Forcing ConfigurationTabs refresh");
      setActiveTab(tab => tab); // Force a state update
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Tabs 
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="document-processing">Document Processing Settings</TabsTrigger>
        <TabsTrigger value="google-drive">Google Drive Integration</TabsTrigger>
      </TabsList>
      
      <TabsContent value="document-processing" forceMount hidden={activeTab !== "document-processing"}>
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="google-drive" forceMount hidden={activeTab !== "google-drive"}>
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
