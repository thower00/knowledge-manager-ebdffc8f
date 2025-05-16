
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface DocumentTableHeaderProps {
  allSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
}

export function DocumentTableHeader({
  allSelected,
  onToggleSelectAll
}: DocumentTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox 
            checked={allSelected}
            onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
          />
        </TableHead>
        <TableHead>Document Name</TableHead>
        <TableHead className="hidden md:table-cell">Type</TableHead>
        <TableHead className="hidden md:table-cell">Size</TableHead>
        <TableHead className="hidden lg:table-cell">Created</TableHead>
      </TableRow>
    </TableHeader>
  );
}
