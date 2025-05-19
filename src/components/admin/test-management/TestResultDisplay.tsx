
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestResultDisplayProps {
  result: string;
}

export function TestResultDisplay({ result }: TestResultDisplayProps) {
  if (!result) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono text-sm">
          {result}
        </pre>
      </CardContent>
    </Card>
  );
}
