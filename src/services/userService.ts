
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";

export async function fetchAllUsers(): Promise<User[]> {
  try {
    // First, get all users from auth.users via profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name');

    if (profilesError) throw profilesError;

    // Then get admin statuses
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    // Now get email addresses for each user
    const userPromises = profiles.map(async (profile) => {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);
        
        if (userError) {
          console.error("Error fetching user details:", userError);
          return {
            id: profile.id,
            email: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
            isAdmin: userRoles.some(role => role.user_id === profile.id)
          };
        }
        
        return {
          id: profile.id,
          email: userData?.user?.email || "No Email",
          isAdmin: userRoles.some(role => role.user_id === profile.id)
        };
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        return {
          id: profile.id,
          email: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
          isAdmin: userRoles.some(role => role.user_id === profile.id)
        };
      }
    });

    return await Promise.all(userPromises);
  } catch (error) {
    console.error("Error in fetchAllUsers:", error);
    throw error;
  }
}

export async function promoteUserToAdmin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' })
    .select()
    .maybeSingle();
  
  if (error && error.code !== '23505') { // Ignore unique violation
    throw error;
  }
}

export async function removeUserAdmin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'admin');
  
  if (error) throw error;
}
