
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
