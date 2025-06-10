
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmbeddingsTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function EmbeddingsTab({ isLoading, onRunTest }: EmbeddingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embeddings Test</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Embeddings functionality will be implemented here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
