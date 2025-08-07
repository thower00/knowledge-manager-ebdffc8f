
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { VerificationStatusAlert, VerificationButton } from "./VerificationStatus";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GoogleDriveConfig {
  client_email: string;
  private_key: string;
  project_id: string;
  private_key_id: string;
  folder_id: string;
}

interface VerificationStatus {
  isVerifying: boolean;
  isValid?: boolean;
  message?: string;
}

export function GoogleDriveIntegration({ activeTab }: { activeTab: string }) {
  const [googleDriveConfig, setGoogleDriveConfig] = useState<GoogleDriveConfig>({
    client_email: "",
    private_key: "",
    project_id: "",
    private_key_id: "",
    folder_id: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [googleDriveVerification, setGoogleDriveVerification] = useState<VerificationStatus>({
    isVerifying: false
  });
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const { toast } = useToast();

  // Fetch configurations from the database
  useEffect(() => {
    const fetchGoogleDriveConfig = async () => {
      try {
        // First check if the configuration entry exists
        const { data: configExists, error: checkError } = await supabase
          .from("configurations")
          .select("id")
          .eq("key", "google_drive_integration")
          .maybeSingle();
          
        if (checkError) {
          console.error("Error checking Google Drive config:", checkError);
          return;
        }
        
        // If the configuration doesn't exist, create it
        if (!configExists) {
          console.log("Creating new Google Drive configuration entry");
          const { error: createError } = await supabase
            .from("configurations")
            .insert({ 
              key: "google_drive_integration", 
              value: {}, 
              description: "Google Drive integration settings"
            });
            
          if (createError) {
            console.error("Error creating Google Drive config:", createError);
            return;
          }
        }
        
        // Now fetch the configuration
        const { data, error } = await supabase
          .from("configurations")
          .select("value")
          .eq("key", "google_drive_integration")
          .single();
          
        if (error) {
          console.error("Error fetching Google Drive config:", error);
          return;
        }
        
        if (data && data.value) {
          // Type assertion to safely convert from Json to GoogleDriveConfig
          const configData = data.value as Record<string, string>;
          const hasConfig = Object.values(configData).some(value => value && value.trim() !== "");
          setConfigSaved(hasConfig);
          
          setGoogleDriveConfig({
            client_email: configData.client_email || "",
            private_key: configData.private_key || "",
            project_id: configData.project_id || "",
            private_key_id: configData.private_key_id || "",
            folder_id: configData.folder_id || ""
          });
        }
      } catch (error) {
        console.error("Error in fetchGoogleDriveConfig:", error);
      }
    };
    
    if (activeTab === "google-drive") {
      fetchGoogleDriveConfig();
    }
  }, [activeTab]);

  const handleGoogleDriveConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setGoogleDriveConfig({ ...googleDriveConfig, [name]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log("Saving Google Drive configuration");
      
      // Convert GoogleDriveConfig to Json compatible object
      const jsonValue = {
        client_email: googleDriveConfig.client_email,
        private_key: googleDriveConfig.private_key,
        project_id: googleDriveConfig.project_id,
        private_key_id: googleDriveConfig.private_key_id,
        folder_id: googleDriveConfig.folder_id
      } as Json;
      
      const { error } = await supabase
        .from("configurations")
        .update({ value: jsonValue })
        .eq("key", "google_drive_integration");
        
      if (error) {
        console.error("Error saving Google Drive config:", error);
        toast({
          variant: "destructive",
          title: "Error saving configuration",
          description: "There was a problem saving your Google Drive configuration. " + error.message,
        });
        return;
      }
      
      setConfigSaved(true);
      setShowSensitiveData(false);
      
      toast({
        title: "Google Drive configuration saved",
        description: "Your Google Drive integration settings have been saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving configuration:", error);
      toast({
        variant: "destructive",
        title: "Error saving configuration",
        description: `There was a problem saving your configuration: ${error.message || "Unknown error"}`,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const verifyGoogleDriveConfig = async () => {
    setGoogleDriveVerification({ isVerifying: true });
    
    try {
      console.log("Verifying Google Drive configuration");
      
      // Call Supabase Edge Function to verify Google Drive configuration
      const { data, error } = await supabase.functions.invoke("verify-google-drive", {
        body: { 
          client_email: googleDriveConfig.client_email,
          private_key: googleDriveConfig.private_key,
          project_id: googleDriveConfig.project_id,
          folder_id: googleDriveConfig.folder_id,
        },
      });
      
      console.log("Google Drive verification response:", data, error);
      
      if (error) {
        throw new Error(error.message || "Verification failed");
      }
      
      if (data?.valid) {
        setGoogleDriveVerification({ 
          isVerifying: false, 
          isValid: true, 
          message: data.message || "Google Drive configuration is valid" 
        });
      } else {
        setGoogleDriveVerification({ 
          isVerifying: false, 
          isValid: false, 
          message: data?.error || "Invalid Google Drive configuration" 
        });
      }
    } catch (error: any) {
      console.error("Error verifying Google Drive config:", error);
      setGoogleDriveVerification({ 
        isVerifying: false, 
        isValid: false, 
        message: `Verification failed: ${error.message || "Unknown error"}` 
      });
    }
  };

  const maskValue = (value: string, isEmail = false) => {
    if (!value || !configSaved || showSensitiveData) return value;
    
    if (isEmail) {
      const [username, domain] = value.split('@');
      if (username && domain) {
        return `${username.slice(0, 2)}***@${domain}`;
      }
    }
    
    if (value.length <= 8) {
      return "***";
    }
    return `${value.slice(0, 3)}***${value.slice(-3)}`;
  };

  const maskPrivateKey = (value: string) => {
    if (!value || !configSaved || showSensitiveData) return value;
    return "***PRIVATE KEY SET***";
  };

  const toggleSensitiveVisibility = () => {
    if (!showSensitiveData) {
      // Show confirmation before revealing sensitive data
      const confirmed = window.confirm(
        "Are you sure you want to view sensitive configuration data? This should only be done for editing purposes."
      );
      if (!confirmed) return;
    }
    setShowSensitiveData(!showSensitiveData);
  };

  const clearConfiguration = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all Google Drive configuration? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("configurations")
        .update({ value: {} })
        .eq("key", "google_drive_integration");
        
      if (error) throw error;
      
      setGoogleDriveConfig({
        client_email: "",
        private_key: "",
        project_id: "",
        private_key_id: "",
        folder_id: ""
      });
      setConfigSaved(false);
      setShowSensitiveData(false);
      
      toast({
        title: "Configuration cleared",
        description: "Google Drive configuration has been cleared successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error clearing configuration",
        description: error.message,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive Integration</CardTitle>
        <CardDescription>
          Configure Google Drive integration for accessing and storing documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configSaved && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sensitive configuration data is masked for security. Use the "Show/Hide" button to view or edit values.
            </AlertDescription>
          </Alert>
        )}
        
        {configSaved && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Configuration Status</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {showSensitiveData ? "Showing sensitive data" : "Data masked"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSensitiveVisibility}
                className="flex items-center gap-2"
              >
                {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSensitiveData ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="client_email">Client Email <span className="text-red-500">*</span></Label>
          <Input
            id="client_email"
            name="client_email"
            type={configSaved && !showSensitiveData ? "password" : "email"}
            value={maskValue(googleDriveConfig.client_email, true)}
            onChange={handleGoogleDriveConfigChange}
            placeholder="service-account@project-id.iam.gserviceaccount.com"
            disabled={configSaved && !showSensitiveData}
          />
          <p className="text-sm text-muted-foreground">
            Service account email from Google Cloud.
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="private_key">Private Key <span className="text-red-500">*</span></Label>
          <Textarea
            id="private_key"
            name="private_key"
            value={maskPrivateKey(googleDriveConfig.private_key)}
            onChange={handleGoogleDriveConfigChange}
            placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
            rows={configSaved && !showSensitiveData ? 1 : 5}
            className="font-mono"
            disabled={configSaved && !showSensitiveData}
          />
          <p className="text-sm text-muted-foreground">
            Private key for the service account (includes BEGIN/END markers).
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="project_id">Project ID <span className="text-sm text-muted-foreground">(Optional)</span></Label>
          <Input
            id="project_id"
            name="project_id"
            type="text"
            value={googleDriveConfig.project_id}
            onChange={handleGoogleDriveConfigChange}
            placeholder="your-project-id"
          />
          <p className="text-sm text-muted-foreground">
            Google Cloud project ID associated with the service account.
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="private_key_id">Private Key ID <span className="text-sm text-muted-foreground">(Optional)</span></Label>
          <Input
            id="private_key_id"
            name="private_key_id"
            type={configSaved && !showSensitiveData ? "password" : "text"}
            value={maskValue(googleDriveConfig.private_key_id)}
            onChange={handleGoogleDriveConfigChange}
            placeholder="a1b2c3d4e5f6g7h8i9j0"
            disabled={configSaved && !showSensitiveData}
          />
          <p className="text-sm text-muted-foreground">
            ID of the private key for the service account.
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="folder_id">Google Drive Folder ID <span className="text-sm text-muted-foreground">(Optional)</span></Label>
          <Input
            id="folder_id"
            name="folder_id"
            type="text"
            value={googleDriveConfig.folder_id}
            onChange={handleGoogleDriveConfigChange}
            placeholder="1abCdEfGhIjKlMnOpQrStUvWxYz"
          />
          <p className="text-sm text-muted-foreground">
            ID of the Google Drive folder to use for document storage.
          </p>
        </div>
        
        <div className="mt-4">
          <VerificationButton 
            onClick={verifyGoogleDriveConfig}
            isVerifying={googleDriveVerification.isVerifying}
            disabled={!googleDriveConfig.client_email || !googleDriveConfig.private_key}
          />
          
          <VerificationStatusAlert {...googleDriveVerification} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={clearConfiguration}
          disabled={isSaving || !configSaved}
        >
          Clear Configuration
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving || (configSaved && !showSensitiveData)}
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
