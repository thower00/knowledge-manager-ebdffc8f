
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentProcessingSettings } from "./DocumentProcessingSettings";
import { GoogleDriveIntegration } from "./GoogleDriveIntegration";

export function ConfigurationTabs() {
  // Use localStorage to persist the active tab between renders
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab or default to document-processing
    const savedTab = localStorage.getItem("configActiveTab");
    return savedTab || "document-processing";
  });

  // Effect to ensure components are properly loaded and initialized
  useEffect(() => {
    console.log("ConfigurationTabs component mounted, active tab:", activeTab);
    
    // Save active tab to localStorage whenever it changes
    localStorage.setItem("configActiveTab", activeTab);
    
    // Small delay to ensure proper initialization
    const timer = setTimeout(() => {
      console.log("Forcing ConfigurationTabs refresh");
      setActiveTab(prev => prev); // Force state update
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log(`Tab changed to: ${value}`);
    setActiveTab(value);
    localStorage.setItem("configActiveTab", value);
  };

  return (
    <Tabs 
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full"
      defaultValue="document-processing"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="document-processing">Document Processing Settings</TabsTrigger>
        <TabsTrigger value="google-drive">Google Drive Integration</TabsTrigger>
      </TabsList>
      
      <TabsContent 
        value="document-processing" 
        forceMount 
        hidden={activeTab !== "document-processing"}
        className={activeTab === "document-processing" ? "block" : "hidden"}
      >
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent 
        value="google-drive" 
        forceMount 
        hidden={activeTab !== "google-drive"}
        className={activeTab === "google-drive" ? "block" : "hidden"}
      >
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
