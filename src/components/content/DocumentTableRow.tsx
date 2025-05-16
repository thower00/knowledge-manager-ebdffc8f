
import { FileText } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDocType, formatFileSize } from "./documentFormats";
import { DocumentFile } from "@/types/document";

interface DocumentTableRowProps {
  document: DocumentFile;
  isSelected: boolean;
  onToggleSelection: () => void;
}

export function DocumentTableRow({
  document,
  isSelected,
  onToggleSelection
}: DocumentTableRowProps) {
  return (
    <TableRow key={document.id}>
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onToggleSelection}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[200px] md:max-w-[300px] lg:max-w-full">
            {document.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {formatDocType(document.mimeType)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {document.size ? formatFileSize(document.size) : "N/A"}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {document.createdTime ? new Date(document.createdTime).toLocaleDateString() : "N/A"}
      </TableCell>
    </TableRow>
  );
}
