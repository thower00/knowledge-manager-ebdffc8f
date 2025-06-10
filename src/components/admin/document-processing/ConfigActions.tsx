
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Loader2, AlertCircle, Check } from "lucide-react";

export interface ConfigActionsProps {
  onSave: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean; 
  error?: string | null;
  configKey?: string;
}

export function ConfigActions({ 
  onSave, 
  isSaving, 
  isLoading, 
  error,
  configKey = "document_processing"
}: ConfigActionsProps) {
  const [saveSuccess, setSaveSuccess] = React.useState<boolean>(false);
  
  const handleSave = async () => {
    setSaveSuccess(false);
    await onSave();
    setSaveSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {configKey === "document_processing" 
              ? "Document processing settings saved successfully!"
              : configKey === "chat_settings" 
                ? "Chat configuration saved successfully!"
                : "Configuration saved successfully!"}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </div>
    </div>
  );
}
