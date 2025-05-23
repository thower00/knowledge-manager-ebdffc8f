
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface DocumentTableHeaderProps {
  toggleSelectAll: () => void;
  allSelected: boolean;
  documentsCount: number;
}

export function DocumentTableHeader({ toggleSelectAll, allSelected, documentsCount }: DocumentTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[50px]">
          <Checkbox 
            checked={allSelected && documentsCount > 0}
            onCheckedChange={() => {
              console.log("Toggle all checkbox clicked");
              toggleSelectAll();
            }}
          />
        </TableHead>
        <TableHead>Title</TableHead>
        <TableHead>Type</TableHead>
        <TableHead className="hidden md:table-cell">Source</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden md:table-cell">Processed</TableHead>
      </TableRow>
    </TableHeader>
  );
}
