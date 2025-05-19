
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

export function DocumentProcessingSettings({ activeTab }: { activeTab: string }) {
  return (
    <ConfigProvider>
      <DocumentProcessingSettingsContent activeTab={activeTab} />
    </ConfigProvider>
  );
}

function DocumentProcessingSettingsContent({ activeTab }: { activeTab: string }) {
  // Load configuration when component mounts
  useConfigLoader(activeTab);
  
  return (
    <Card>
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
