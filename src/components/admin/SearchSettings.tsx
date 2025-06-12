
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SearchConfigProvider } from "./search/SearchConfigContext";
import { SearchConfigForm } from "./search/SearchConfigForm";
import { useSearchConfigLoader } from "./search/useSearchConfigLoader";
import { ConfigActions } from "./document-processing/ConfigActions";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SearchSettings({ activeTab }: { activeTab: string }) {
  return (
    <SearchConfigProvider>
      <SearchSettingsContent activeTab={activeTab} />
    </SearchConfigProvider>
  );
}

function SearchSettingsContent({ activeTab }: { activeTab: string }) {
  const [isError, setIsError] = useState(false);
  const { loadConfig, saveConfig, isLoading, isSaving, error } = useSearchConfigLoader();

  // Load the configuration when the tab is active
  useEffect(() => {
    if (activeTab === "search-settings") {
      console.log("SearchSettings: Loading configuration");
      loadConfig().then(() => {
        console.log("SearchSettings: Configuration loaded");
      }).catch((err) => {
        console.error("Error loading search configuration:", err);
        setIsError(true);
      });
    }
  }, [activeTab, loadConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> These search configuration values are currently not being used by the system. 
            They are available for future implementation and testing purposes. The search system currently uses 
            hard-coded default values for optimal performance.
          </AlertDescription>
        </Alert>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading search configuration. Please check your database connection and try again.
            </AlertDescription>
          </Alert>
        )}

        <SearchConfigForm isLoading={isLoading} />
        
        <Separator className="my-6" />
        
        <ConfigActions
          onSave={saveConfig}
          isSaving={isSaving}
          isLoading={isLoading}
          error={error}
          configKey="search_settings"
        />
      </CardContent>
    </Card>
  );
}
