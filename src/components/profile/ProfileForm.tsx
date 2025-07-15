
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChangeSettings } from "@/components/admin/PasswordChangeSettings";
import { Separator } from "@/components/ui/separator";

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileFormProps {
  profileData: ProfileData | null;
  userId: string;
  onProfileUpdate: (updatedData: ProfileData) => void;
}

export default function ProfileForm({ profileData, userId, onProfileUpdate }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(profileData?.first_name || "");
  const [lastName, setLastName] = useState(profileData?.last_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const hasChanges = firstName !== (profileData?.first_name || "") || 
                    lastName !== (profileData?.last_name || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>
        
        <Button type="submit" disabled={isLoading || !hasChanges} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Update Profile
            </>
          )}
        </Button>
      </form>

      <Separator />
      
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password Settings
        </h3>
        <PasswordChangeSettings />
      </div>
    </div>
  );
}
