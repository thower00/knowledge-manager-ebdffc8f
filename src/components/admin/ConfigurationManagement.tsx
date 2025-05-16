
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ConfigSettings {
  apiKey: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  storagePath: string;
  customConfiguration: string;
}

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

export function ConfigurationManagement() {
  const [config, setConfig] = useState<ConfigSettings>({
    apiKey: "",
    embeddingModel: "openai",
    chunkSize: "1000",
    chunkOverlap: "200",
    storagePath: "/data/documents",
    customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  });
  
  const [googleDriveConfig, setGoogleDriveConfig] = useState<GoogleDriveConfig>({
    client_email: "",
    private_key: "",
    project_id: "",
    private_key_id: "",
    folder_id: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("document-processing");
  const [openAIVerification, setOpenAIVerification] = useState<VerificationStatus>({
    isVerifying: false
  });
  const [googleDriveVerification, setGoogleDriveVerification] = useState<VerificationStatus>({
    isVerifying: false
  });
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
    
    fetchGoogleDriveConfig();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleGoogleDriveConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setGoogleDriveConfig({ ...googleDriveConfig, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig({ ...config, [name]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // If we're on the Google Drive tab, save that config
      if (activeTab === "google-drive") {
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
        
        toast({
          title: "Google Drive configuration saved",
          description: "Your Google Drive integration settings have been saved successfully",
        });
      } else {
        // Save document processing settings (in a real app)
        toast({
          title: "Document Processing settings saved",
          description: "Your configuration has been saved successfully",
        });
      }
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
  
  const verifyOpenAIKey = async () => {
    setOpenAIVerification({ isVerifying: true });
    
    try {
      // Call Edge Function to verify OpenAI API key
      const response = await fetch('/api/verify-openai-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: config.apiKey }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setOpenAIVerification({ 
          isVerifying: false, 
          isValid: true, 
          message: "OpenAI API key is valid" 
        });
      } else {
        setOpenAIVerification({ 
          isVerifying: false, 
          isValid: false, 
          message: data.error || "Invalid OpenAI API key" 
        });
      }
    } catch (error: any) {
      console.error("Error verifying OpenAI key:", error);
      setOpenAIVerification({ 
        isVerifying: false, 
        isValid: false, 
        message: `Verification failed: ${error.message || "Unknown error"}` 
      });
    }
  };
  
  const verifyGoogleDriveConfig = async () => {
    setGoogleDriveVerification({ isVerifying: true });
    
    try {
      // Call Edge Function to verify Google Drive configuration
      const response = await fetch('/api/verify-google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          client_email: googleDriveConfig.client_email,
          private_key: googleDriveConfig.private_key,
          project_id: googleDriveConfig.project_id,
          folder_id: googleDriveConfig.folder_id,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setGoogleDriveVerification({ 
          isVerifying: false, 
          isValid: true, 
          message: "Google Drive configuration is valid" 
        });
      } else {
        setGoogleDriveVerification({ 
          isVerifying: false, 
          isValid: false, 
          message: data.error || "Invalid Google Drive configuration" 
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

  return (
    <div className="grid gap-6">
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
          <Card>
            <CardHeader>
              <CardTitle>Document Processing Settings</CardTitle>
              <CardDescription>
                Configure how documents are processed and stored in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    value={config.apiKey}
                    onChange={handleChange}
                    placeholder="Enter your API key"
                    className="flex-grow"
                  />
                  <Button 
                    onClick={verifyOpenAIKey} 
                    disabled={openAIVerification.isVerifying || !config.apiKey}
                    variant="outline"
                  >
                    {openAIVerification.isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying
                      </>
                    ) : "Verify Key"}
                  </Button>
                </div>
                {openAIVerification.message && (
                  <Alert variant={openAIVerification.isValid ? "default" : "destructive"} className="mt-2">
                    {openAIVerification.isValid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{openAIVerification.isValid ? "Verification Successful" : "Verification Failed"}</AlertTitle>
                    <AlertDescription>
                      {openAIVerification.message}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  API key for external services like OpenAI or Cohere.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="embeddingModel">Embedding Model</Label>
                <Select
                  value={config.embeddingModel}
                  onValueChange={(value) => 
                    handleSelectChange("embeddingModel", value)
                  }
                >
                  <SelectTrigger id="embeddingModel">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="cohere">Cohere</SelectItem>
                    <SelectItem value="huggingface">HuggingFace</SelectItem>
                    <SelectItem value="local">Local Model</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Model used for creating text embeddings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <Input
                    id="chunkSize"
                    name="chunkSize"
                    value={config.chunkSize}
                    onChange={handleChange}
                    placeholder="1000"
                  />
                  <p className="text-sm text-muted-foreground">
                    Size of text chunks for processing.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input
                    id="chunkOverlap"
                    name="chunkOverlap"
                    value={config.chunkOverlap}
                    onChange={handleChange}
                    placeholder="200"
                  />
                  <p className="text-sm text-muted-foreground">
                    Overlap between consecutive chunks.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storagePath">Storage Path</Label>
                <Input
                  id="storagePath"
                  name="storagePath"
                  value={config.storagePath}
                  onChange={handleChange}
                  placeholder="/data/documents"
                />
                <p className="text-sm text-muted-foreground">
                  Path where processed documents are stored.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customConfiguration">Custom Configuration (JSON)</Label>
                <Textarea
                  id="customConfiguration"
                  name="customConfiguration"
                  value={config.customConfiguration}
                  onChange={handleChange}
                  placeholder="Enter custom JSON configuration"
                  rows={5}
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Additional configuration in JSON format.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="google-drive">
          <Card>
            <CardHeader>
              <CardTitle>Google Drive Integration</CardTitle>
              <CardDescription>
                Configure Google Drive integration for accessing and storing documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="text"
                  value={googleDriveConfig.client_email}
                  onChange={handleGoogleDriveConfigChange}
                  placeholder="service-account@project-id.iam.gserviceaccount.com"
                />
                <p className="text-sm text-muted-foreground">
                  Service account email from Google Cloud.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="private_key">Private Key</Label>
                <Textarea
                  id="private_key"
                  name="private_key"
                  value={googleDriveConfig.private_key}
                  onChange={handleGoogleDriveConfigChange}
                  placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
                  rows={5}
                  className="font-mono"
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
                  type="text"
                  value={googleDriveConfig.private_key_id}
                  onChange={handleGoogleDriveConfigChange}
                  placeholder="a1b2c3d4e5f6g7h8i9j0"
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
                <Button 
                  onClick={verifyGoogleDriveConfig} 
                  disabled={googleDriveVerification.isVerifying || !googleDriveConfig.client_email || !googleDriveConfig.private_key}
                  variant="outline"
                >
                  {googleDriveVerification.isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying
                    </>
                  ) : "Verify Configuration"}
                </Button>
                
                {googleDriveVerification.message && (
                  <Alert 
                    variant={googleDriveVerification.isValid ? "default" : "destructive"} 
                    className="mt-2"
                  >
                    {googleDriveVerification.isValid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {googleDriveVerification.isValid ? "Verification Successful" : "Verification Failed"}
                    </AlertTitle>
                    <AlertDescription>
                      {googleDriveVerification.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
