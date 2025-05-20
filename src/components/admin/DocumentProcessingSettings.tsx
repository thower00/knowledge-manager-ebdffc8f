
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfigProvider } from "./document-processing/ConfigContext";
import { useConfigLoader } from "./document-processing/useConfigLoader";
import { ConfigForm } from "./document-processing/ConfigForm";
import { ConfigActions } from "./document-processing/ConfigActions";
import { useEffect } from "react";

export function DocumentProcessingSettings({ activeTab }: { activeTab: string }) {
  return (
    <ConfigProvider>
      <DocumentProcessingSettingsContent activeTab={activeTab} />
    </ConfigProvider>
  );
}

// This is a separate component to ensure the hook is called inside a function component
function DocumentProcessingSettingsContent({ activeTab }: { activeTab: string }) {
  // Load configuration when component mounts or activeTab changes
  useConfigLoader(activeTab);
  
  // Debug log to check if component is rendering with the correct activeTab
  useEffect(() => {
    console.log(`DocumentProcessingSettings rendered with activeTab: ${activeTab}`);
  }, [activeTab]);
  
  return (
    <Card className="transition-all">
      <CardHeader>
        <CardTitle>Document Processing Settings</CardTitle>
        <CardDescription>
          Configure how documents are processed and stored in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfigForm />
      </CardContent>
      <CardFooter>
        <ConfigActions />
      </CardFooter>
    </Card>
  );
}
