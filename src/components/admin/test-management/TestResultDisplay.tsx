
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestResultDisplayProps {
  result: any;
}

export function TestResultDisplay({ result }: TestResultDisplayProps) {
  if (!result) return null;
  
  // Helper function to format the result for display
  const formatResult = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      // Handle embedding results specifically
      if (data.status === 'success' && data.embeddings && data.totalEmbeddings) {
        return `Embedding Generation Results
Status: ${data.status}
Total Embeddings: ${data.totalEmbeddings}
Model: ${data.model}
Dimensions: ${data.dimensions}
Vector Storage: ${data.vectorStorage}
Batch Size: ${data.batchSize}

Configuration:
- Provider: ${data.config?.provider}
- Model: ${data.config?.model}
- Similarity Threshold: ${data.config?.similarityThreshold}

Embeddings Preview:
${data.embeddings.slice(0, 3).map((emb: any, idx: number) => 
  `Chunk ${emb.chunkIndex + 1}: ${emb.dimensions}D vector [${emb.embeddingPreview.join(', ')}...]`
).join('\n')}${data.embeddings.length > 3 ? `\n... and ${data.embeddings.length - 3} more embeddings` : ''}`;
      }
      
      // Handle chunking results
      if (data.status === 'success' && data.chunks) {
        return `Chunking Results
Status: ${data.status}
Total Chunks: ${data.totalChunks || data.chunks.length}
Strategy: ${data.strategy}
Chunk Size: ${data.chunkSize}
Overlap: ${data.overlap}

Chunks Preview:
${data.chunks.slice(0, 3).map((chunk: any, idx: number) => 
  `Chunk ${idx + 1}: ${chunk.size || chunk.content?.length || 0} characters`
).join('\n')}${data.chunks.length > 3 ? `\n... and ${data.chunks.length - 3} more chunks` : ''}`;
      }
      
      // Handle extraction results
      if (data.extractedText && data.filename) {
        return `Document: ${data.filename}
Size: ${data.size} bytes
Status: ${data.status}
Source: ${data.source}

Extracted Text:
${data.extractedText}`;
      }
      
      // Handle error results
      if (data.status === 'error') {
        return `Error: ${data.message}
${data.error ? `Details: ${data.error}` : ''}`;
      }
      
      // For other objects, format as JSON
      return JSON.stringify(data, null, 2);
    }
    
    return String(data);
  };
  
  const displayText = formatResult(result);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono text-sm">
          {displayText}
        </pre>
      </CardContent>
    </Card>
  );
}
