
import { Input } from "@/components/ui/input";

interface UserSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function UserSearch({ searchQuery, onSearchChange }: UserSearchProps) {
  return (
    <Input
      placeholder="Search by email..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className="max-w-sm"
    />
  );
}
