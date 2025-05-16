
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface ProfileFormProps {
  profileData: ProfileData | null;
  userId: string;
  onProfileUpdate: (updatedData: ProfileData) => void;
}

export default function ProfileForm({ profileData, userId, onProfileUpdate }: ProfileFormProps) {
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(profileData?.first_name || "");
  const [lastName, setLastName] = useState(profileData?.last_name || "");
  const { toast } = useToast();

  const handleUpdateProfile = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      // Update local state via callback
      onProfileUpdate({
        ...profileData!,
        first_name: firstName,
        last_name: lastName,
      });

      setEditMode(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    }
  };

  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setEditMode(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateProfile}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">First Name</p>
          <p>{profileData?.first_name || "Not set"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Last Name</p>
          <p>{profileData?.last_name || "Not set"}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
      </div>
    </div>
  );
}
