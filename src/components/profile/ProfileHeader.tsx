
import { Badge } from "@/components/ui/badge";

interface ProfileHeaderProps {
  isAdmin: boolean;
}

export default function ProfileHeader({ isAdmin }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">User Profile</h2>
      {isAdmin && (
        <Badge variant="outline" className="bg-brand-100 text-brand-800">
          Admin
        </Badge>
      )}
    </div>
  );
}
