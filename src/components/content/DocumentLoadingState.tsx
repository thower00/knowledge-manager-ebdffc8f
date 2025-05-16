
import { Card, CardContent } from "@/components/ui/card";

export function DocumentLoadingState() {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </CardContent>
    </Card>
  );
}
