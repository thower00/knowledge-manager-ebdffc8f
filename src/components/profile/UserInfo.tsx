
import { User } from "@supabase/supabase-js";

interface UserInfoProps {
  user: User | null;
  isAdmin: boolean;
}

export default function UserInfo({ user, isAdmin }: UserInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-500">Email</p>
        <p>{user?.email}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">Role</p>
        <p>{isAdmin ? "Admin" : "User"}</p>
      </div>
    </div>
  );
}
