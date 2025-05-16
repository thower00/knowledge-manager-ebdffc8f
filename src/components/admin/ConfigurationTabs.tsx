
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentProcessingSettings } from "./DocumentProcessingSettings";
import { GoogleDriveIntegration } from "./GoogleDriveIntegration";

export function ConfigurationTabs() {
  const [activeTab, setActiveTab] = useState("document-processing");

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
      
      <TabsContent value="document-processing">
        <DocumentProcessingSettings activeTab={activeTab} />
      </TabsContent>
      
      <TabsContent value="google-drive">
        <GoogleDriveIntegration activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
