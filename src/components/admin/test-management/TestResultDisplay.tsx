
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestResultDisplayProps {
  result: any; // Changed from string to any to handle both strings and objects
}

export function TestResultDisplay({ result }: TestResultDisplayProps) {
  if (!result) return null;
  
  // Helper function to format the result for display
  const formatResult = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      // Handle the extraction result object specifically
      if (data.extractedText && data.filename) {
        return `Document: ${data.filename}\nSize: ${data.size} bytes\nStatus: ${data.status}\nSource: ${data.source}\n\nExtracted Text:\n${data.extractedText}`;
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
