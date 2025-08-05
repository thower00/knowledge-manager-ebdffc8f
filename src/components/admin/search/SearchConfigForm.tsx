
import React from "react";
import { useSearchConfig } from "./SearchConfigContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchConfigFormProps {
  isLoading: boolean;
}

export function SearchConfigForm({ isLoading }: SearchConfigFormProps) {
  const { config, setConfig } = useSearchConfig();
  
  const handleArrayChange = (key: keyof typeof config, value: string) => {
    try {
      const arrayValue = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      setConfig(prev => ({ ...prev, [key]: arrayValue }));
    } catch (error) {
      console.error('Error parsing array value:', error);
    }
  };
  
  const handleNumberChange = (key: keyof typeof config, value: string) => {
    const numValue = parseInt(value) || 0;
    setConfig(prev => ({ ...prev, [key]: numValue }));
  };

  return (
    <div className="space-y-6">
      {/* Similarity Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Similarity Thresholds</CardTitle>
          <CardDescription>
            Lower values increase recall but may reduce precision. Values should be between 0.0 and 1.0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="factualQuestionThresholds">Factual Question Thresholds</Label>
            <Input
              id="factualQuestionThresholds"
              value={config.factualQuestionThresholds.join(', ')}
              onChange={(e) => handleArrayChange('factualQuestionThresholds', e.target.value)}
              placeholder="0.1, 0.2, 0.3, 0.4, 0.5"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="summaryRequestThresholds">Summary Request Thresholds</Label>
            <Input
              id="summaryRequestThresholds"
              value={config.summaryRequestThresholds.join(', ')}
              onChange={(e) => handleArrayChange('summaryRequestThresholds', e.target.value)}
              placeholder="0.1, 0.2, 0.3, 0.4, 0.5"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="standardThresholds">Standard Thresholds</Label>
            <Input
              id="standardThresholds"
              value={config.standardThresholds.join(', ')}
              onChange={(e) => handleArrayChange('standardThresholds', e.target.value)}
              placeholder="0.15, 0.25, 0.35, 0.45"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Match Count Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Match Count (Chunks Retrieved)</CardTitle>
          <CardDescription>
            Higher values provide more context but may introduce noise. Adjust based on document size and complexity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="factualQuestionMatchCount">Factual Questions</Label>
            <Input
              id="factualQuestionMatchCount"
              type="number"
              value={config.factualQuestionMatchCount}
              onChange={(e) => handleNumberChange('factualQuestionMatchCount', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="summaryMatchCount">Summary Requests</Label>
            <Input
              id="summaryMatchCount"
              type="number"
              value={config.summaryMatchCount}
              onChange={(e) => handleNumberChange('summaryMatchCount', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="extensiveSummaryMatchCount">Extensive Summaries</Label>
            <Input
              id="extensiveSummaryMatchCount"
              type="number"
              value={config.extensiveSummaryMatchCount}
              onChange={(e) => handleNumberChange('extensiveSummaryMatchCount', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="standardMatchCount">Standard Queries</Label>
            <Input
              id="standardMatchCount"
              type="number"
              value={config.standardMatchCount}
              onChange={(e) => handleNumberChange('standardMatchCount', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Length Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Content Length Limits (Characters)</CardTitle>
          <CardDescription>
            Maximum character count per chunk. Longer content provides more context but increases processing time.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="factualQuestionContentLength">Factual Questions</Label>
            <Input
              id="factualQuestionContentLength"
              type="number"
              value={config.factualQuestionContentLength}
              onChange={(e) => handleNumberChange('factualQuestionContentLength', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="summaryContentLength">Summary Requests</Label>
            <Input
              id="summaryContentLength"
              type="number"
              value={config.summaryContentLength}
              onChange={(e) => handleNumberChange('summaryContentLength', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="extensiveSummaryContentLength">Extensive Summaries</Label>
            <Input
              id="extensiveSummaryContentLength"
              type="number"
              value={config.extensiveSummaryContentLength}
              onChange={(e) => handleNumberChange('extensiveSummaryContentLength', e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="standardContentLength">Standard Queries</Label>
            <Input
              id="standardContentLength"
              type="number"
              value={config.standardContentLength}
              onChange={(e) => handleNumberChange('standardContentLength', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Processing Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Limits</CardTitle>
          <CardDescription>
            Fine-tune chunk processing and total limits for optimal performance and response quality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <Label>Chunks Per Document</Label>
               <div className="grid grid-cols-2 gap-2 mt-1">
                 <div>
                   <Label htmlFor="factualQuestionChunksPerDocument" className="text-xs">Factual</Label>
                   <Input
                     id="factualQuestionChunksPerDocument"
                     type="number"
                     value={config.factualQuestionChunksPerDocument}
                     onChange={(e) => handleNumberChange('factualQuestionChunksPerDocument', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
                 <div>
                   <Label htmlFor="summaryChunksPerDocument" className="text-xs">Summary</Label>
                   <Input
                     id="summaryChunksPerDocument"
                     type="number"
                     value={config.summaryChunksPerDocument}
                     onChange={(e) => handleNumberChange('summaryChunksPerDocument', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
                 <div>
                   <Label htmlFor="extensiveSummaryChunksPerDocument" className="text-xs">Extensive</Label>
                   <Input
                     id="extensiveSummaryChunksPerDocument"
                     type="number"
                     value={config.extensiveSummaryChunksPerDocument}
                     onChange={(e) => handleNumberChange('extensiveSummaryChunksPerDocument', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
                 <div>
                   <Label htmlFor="standardChunksPerDocument" className="text-xs">Standard</Label>
                   <Input
                     id="standardChunksPerDocument"
                     type="number"
                     value={config.standardChunksPerDocument}
                     onChange={(e) => handleNumberChange('standardChunksPerDocument', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
               </div>
             </div>
             
             <div>
               <Label>Total Chunks Limit</Label>
               <div className="grid grid-cols-2 gap-2 mt-1">
                 <div>
                   <Label htmlFor="factualQuestionTotalChunksLimit" className="text-xs">Factual</Label>
                   <Input
                     id="factualQuestionTotalChunksLimit"
                     type="number"
                     value={config.factualQuestionTotalChunksLimit}
                     onChange={(e) => handleNumberChange('factualQuestionTotalChunksLimit', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
                 <div>
                   <Label htmlFor="summaryTotalChunksLimit" className="text-xs">Summary</Label>
                   <Input
                     id="summaryTotalChunksLimit"
                     type="number"
                     value={config.summaryTotalChunksLimit}
                     onChange={(e) => handleNumberChange('summaryTotalChunksLimit', e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
                  <div>
                    <Label htmlFor="extensiveSummaryTotalChunksLimit" className="text-xs">Extensive</Label>
                    <Input
                      id="extensiveSummaryTotalChunksLimit"
                      type="number"
                      value={config.extensiveSummaryTotalChunksLimit}
                      onChange={(e) => handleNumberChange('extensiveSummaryTotalChunksLimit', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="standardTotalChunksLimit" className="text-xs">Standard</Label>
                    <Input
                      id="standardTotalChunksLimit"
                      type="number"
                      value={config.standardTotalChunksLimit}
                      onChange={(e) => handleNumberChange('standardTotalChunksLimit', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
               </div>
             </div>
           </div>
          
          <Separator />
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="enhancedContentSearchLimit">Content Search Limit</Label>
              <Input
                id="enhancedContentSearchLimit"
                type="number"
                value={config.enhancedContentSearchLimit}
                onChange={(e) => handleNumberChange('enhancedContentSearchLimit', e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="titleSearchMinWordLength">Title Search Min Word Length</Label>
              <Input
                id="titleSearchMinWordLength"
                type="number"
                value={config.titleSearchMinWordLength}
                onChange={(e) => handleNumberChange('titleSearchMinWordLength', e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="contentSearchBatchSize">Content Search Batch Size</Label>
              <Input
                id="contentSearchBatchSize"
                type="number"
                value={config.contentSearchBatchSize}
                onChange={(e) => handleNumberChange('contentSearchBatchSize', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
