
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DocumentEmptyStateProps {
  message?: string;
}

export function DocumentEmptyState({ 
  message = "No documents found. Click \"Refresh Documents\" to load files from the selected source."
}: DocumentEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="mt-4 text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
