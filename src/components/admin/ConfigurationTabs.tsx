
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentProcessingSettings } from "./DocumentProcessingSettings";
import { GoogleDriveIntegration } from "./GoogleDriveIntegration";
import { ChatSettings } from "./ChatSettings";
import { SearchSettings } from "./SearchSettings";

export function ConfigurationTabs() {
  // Use localStorage to persist the active tab between renders
  const [activeTab, setActiveTab] = useState(() => {
    try {
      // Get saved tab or default to document-processing
      return localStorage.getItem("configActiveTab") || "document-processing";
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return "document-processing";
    }
  });

  useEffect(() => {
    try {
      console.log("ConfigurationTabs: active tab set to:", activeTab);
      localStorage.setItem("configActiveTab", activeTab);
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
  }, [activeTab]);

  return (
    <Tabs 
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
      defaultValue="document-processing"
    >
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="document-processing">Document Processing</TabsTrigger>
        <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
        <TabsTrigger value="chat-settings">AI Chat</TabsTrigger>
        <TabsTrigger value="search-settings">Search Settings</TabsTrigger>
      </TabsList>
      
      <TabsContent value="document-processing">
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="google-drive">
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="chat-settings">
        <ChatSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="search-settings">
        <SearchSettings activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
