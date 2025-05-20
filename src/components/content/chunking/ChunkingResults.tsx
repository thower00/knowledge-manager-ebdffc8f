
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface ChunkingResult {
  documentId: string;
  documentTitle: string;
  chunkCount: number;
  success: boolean;
  error?: string;
}

interface ChunkingResultsProps {
  results: ChunkingResult[];
}

export function ChunkingResults({ results }: ChunkingResultsProps) {
  const successful = results.filter(result => result.success).length;
  const failed = results.length - successful;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Check className="mr-2 h-5 w-5 text-green-500" />
          Chunking Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-md">
            <div>
              <p className="font-medium">{successful} document(s) successfully chunked</p>
              {failed > 0 && (
                <p className="text-sm text-destructive">{failed} document(s) failed</p>
              )}
            </div>
            <div className="text-sm font-mono">
              {results.reduce((acc, result) => acc + (result.success ? result.chunkCount : 0), 0)} total chunks generated
            </div>
          </div>
          
          <div className="space-y-2">
            {results.map((result) => (
              <div 
                key={result.documentId}
                className={`p-3 rounded-md border ${result.success ? 'border-green-200 bg-green-50' : 'border-destructive/30 bg-destructive/10'}`}
              >
                <div className="flex justify-between">
                  <p className="font-medium">{result.documentTitle}</p>
                  {result.success ? (
                    <span className="text-sm text-green-600">{result.chunkCount} chunks</span>
                  ) : (
                    <span className="text-sm text-destructive">Failed</span>
                  )}
                </div>
                {!result.success && result.error && (
                  <p className="text-sm text-destructive mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
