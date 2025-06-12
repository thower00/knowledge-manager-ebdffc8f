
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChatConfigProvider } from "./chat/ChatConfigContext";
import { ChatConfigForm } from "./chat/ChatConfigForm";
import { useChatConfigLoader } from "./chat/useChatConfigLoader";
import { ConfigActions } from "./document-processing/ConfigActions";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChatSettings({ activeTab }: { activeTab: string }) {
  return (
    <ChatConfigProvider>
      <ChatSettingsContent activeTab={activeTab} />
    </ChatConfigProvider>
  );
}

function ChatSettingsContent({ activeTab }: { activeTab: string }) {
  const [isError, setIsError] = useState(false);
  const { loadConfig, saveConfig, isLoading, isSaving, error } = useChatConfigLoader();

  // Load the configuration when the tab is active
  useEffect(() => {
    if (activeTab === "chat-settings") {
      console.log("ChatSettings: Loading configuration");
      loadConfig().then(() => {
        console.log("ChatSettings: Configuration loaded");
      }).catch((err) => {
        console.error("Error loading chat configuration:", err);
        setIsError(true);
      });
    }
  }, [activeTab, loadConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Chat Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading chat configuration. Please check your database connection and try again.
            </AlertDescription>
          </Alert>
        )}

        <ChatConfigForm isLoading={isLoading} />
        
        <Separator className="my-6" />
        
        <ConfigActions
          onSave={saveConfig}
          isSaving={isSaving}
          isLoading={isLoading}
          error={error}
          configKey="chat_settings"
        />
      </CardContent>
    </Card>
  );
}
