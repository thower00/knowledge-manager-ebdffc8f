import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = (userId: string | undefined) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUserRole = async (userIdToCheck: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("useUserRole: Checking admin status for user:", userIdToCheck);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userIdToCheck)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;

      const adminStatus = !!data;
      console.log("useUserRole: Admin status:", adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("useUserRole: Error checking user role:", error);
      setError("Failed to check user role");
      setIsAdmin(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshRole = () => {
    if (userId) {
      checkUserRole(userId);
    }
  };

  const hasRole = (role: string) => {
    // For now we only support admin role checking
    // This can be extended later for more roles
    return role === 'admin' ? isAdmin : false;
  };

  useEffect(() => {
    if (userId) {
      checkUserRole(userId);
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [userId]);

  return {
    isAdmin,
    loading,
    error,
    checkUserRole,
    refreshRole,
    hasRole
  };
};