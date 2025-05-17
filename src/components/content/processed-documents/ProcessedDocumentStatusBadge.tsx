
import { Badge } from "@/components/ui/badge";

interface ProcessedDocumentStatusBadgeProps {
  status: string;
}

export function ProcessedDocumentStatusBadge({ status }: ProcessedDocumentStatusBadgeProps) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-blue-500">Processing</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-500">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
