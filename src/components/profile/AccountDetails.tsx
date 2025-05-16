
import { User } from "@supabase/supabase-js";

interface AccountDetailsProps {
  user: User | null;
  profileData: {
    updated_at: string;
  } | null;
}

export default function AccountDetails({ user, profileData }: AccountDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500">Account Created</p>
        <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500">Last Updated</p>
        <p>{profileData?.updated_at ? new Date(profileData.updated_at).toLocaleDateString() : "Never"}</p>
      </div>
    </div>
  );
}
