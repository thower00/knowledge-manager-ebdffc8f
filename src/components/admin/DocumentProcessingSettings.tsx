
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
import { logger } from "@/utils/logger";

export function DocumentProcessingSettings({ activeTab }: { activeTab: string }) {
  return (
    <ConfigProvider>
      <DocumentProcessingSettingsContent activeTab={activeTab} />
    </ConfigProvider>
  );
}

// This is a separate component to ensure the hook is called inside a function component
function DocumentProcessingSettingsContent({ activeTab }: { activeTab: string }) {
  const { loadConfig, saveConfig, isLoading, isSaving, error } = useConfigLoader("document_processing");
  
  // Load configuration when component mounts or activeTab changes
  useEffect(() => {
    if (activeTab === "document-processing") {
      logger.info(`DocumentProcessingSettings rendered with activeTab: ${activeTab}`);
      loadConfig().catch((err) => {
        logger.error("Error loading document processing configuration:", err);
      });
    }
  }, [activeTab, loadConfig]);
  
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
        <ConfigActions 
          onSave={saveConfig}
          isSaving={isSaving}
          isLoading={isLoading}
          error={error}
          configKey="document_processing"
        />
      </CardFooter>
    </Card>
  );
}
