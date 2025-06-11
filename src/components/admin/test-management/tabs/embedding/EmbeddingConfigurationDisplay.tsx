
import { Settings, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EmbeddingConfig, ConfigValidationResult } from "@/utils/embeddingConfigMapper";

interface EmbeddingConfigurationDisplayProps {
  configLoaded: boolean;
  mappedConfig: EmbeddingConfig | null;
  configValidation: ConfigValidationResult;
}

export function EmbeddingConfigurationDisplay({ 
  configLoaded, 
  mappedConfig, 
  configValidation 
}: EmbeddingConfigurationDisplayProps) {
  
  const handleOpenConfiguration = () => {
    window.open('/configuration-management', '_blank');
  };

  const getStatusIcon = () => {
    if (!configLoaded) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    
    if (configValidation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (!configLoaded) return "secondary";
    if (configValidation.isValid) return "default";
    return "destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Settings className="h-4 w-4" />
        <h3 className="text-lg font-medium">Embedding Configuration</h3>
        <Badge variant="outline" className="text-xs">From Configuration Management</Badge>
        {!configLoaded && <Badge variant="secondary" className="text-xs">Loading...</Badge>}
        <div className="flex items-center space-x-1">
          {getStatusIcon()}
          <Badge variant={getStatusColor()} className="text-xs">
            {!configLoaded ? "Loading" : configValidation.isValid ? "Valid" : "Invalid"}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-medium">{configLoaded ? (mappedConfig?.provider || "openai") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-medium">{configLoaded ? (mappedConfig?.model || "text-embedding-3-small") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key:</span>
            <span className={`font-medium ${mappedConfig?.apiKey ? 'text-green-600' : 'text-red-600'}`}>
              {configLoaded ? (mappedConfig?.apiKey ? `✓ Configured (${mappedConfig.apiKey.length} chars)` : "❌ Missing") : "Loading..."}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Batch Size:</span>
            <span className="font-medium">{configLoaded ? (mappedConfig?.batchSize || "10") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vector Storage:</span>
            <span className="font-medium">{configLoaded ? (mappedConfig?.vectorStorage || "supabase") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Similarity Threshold:</span>
            <span className="font-medium">{configLoaded ? (mappedConfig?.similarityThreshold || "0.7") : "Loading..."}</span>
          </div>
        </div>
      </div>

      {/* Configuration Status Alert */}
      {configLoaded && (
        <Alert variant={configValidation.isValid ? "default" : "destructive"}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <AlertDescription className="mb-0">
                {configValidation.isValid 
                  ? `Configuration is valid${configValidation.warnings.length > 0 ? ' with warnings' : ''}`
                  : `Configuration errors: ${configValidation.errors.join(', ')}`
                }
              </AlertDescription>
            </div>
            {!configValidation.isValid && (
              <Button variant="outline" size="sm" onClick={handleOpenConfiguration}>
                Fix in Configuration Management
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Warnings */}
      {configLoaded && configValidation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warnings:</strong>
            <ul className="list-disc list-inside mt-1">
              {configValidation.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {configLoaded && configValidation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuration Issues:</strong>
            <ul className="list-disc list-inside mt-1">
              {configValidation.errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
            <p className="text-sm mt-2">
              Please update your configuration in Configuration Management to fix these issues.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
