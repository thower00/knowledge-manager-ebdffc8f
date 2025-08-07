
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";

async function fetchUserAuthData(): Promise<{ id: string; lastSignInAt: string | null }[]> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-user-auth-data');
    
    if (error) {
      console.error('Error fetching user auth data:', error);
      return [];
    }
    
    return data?.users || [];
  } catch (error) {
    console.error('Error in fetchUserAuthData:', error);
    return [];
  }
}

export async function fetchAllUsers(): Promise<User[]> {
  try {
    // First, get all users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email');

    if (profilesError) throw profilesError;

    // Then get admin statuses
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    // Fetch auth data for last sign in timestamps
    const authData = await fetchUserAuthData();

    // Map profiles, roles, and auth data to user objects
    const users: User[] = profiles.map(profile => {
      const authUser = authData.find(auth => auth.id === profile.id);
      return {
        id: profile.id,
        email: profile.email || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
        isAdmin: userRoles.some(role => role.user_id === profile.id),
        lastSignInAt: authUser?.lastSignInAt || null
      };
    });

    return users;
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

export async function deleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId }
  });

  if (error) {
    console.error('Error calling delete-user function:', error);
    throw new Error(error.message || 'Failed to delete user');
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}
