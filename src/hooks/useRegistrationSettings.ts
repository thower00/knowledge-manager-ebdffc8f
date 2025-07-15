import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRegistrationSettings = () => {
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrationSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('value')
        .eq('key', 'allow_public_registration')
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Default to false if no configuration is found
      setAllowPublicRegistration(data?.value as boolean ?? false);
    } catch (error) {
      console.error("Error fetching registration settings:", error);
      setError("Failed to load registration settings");
      setAllowPublicRegistration(false); // Default to disabled on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrationSettings();
  }, []);

  return {
    allowPublicRegistration,
    loading,
    error,
    refetch: fetchRegistrationSettings
  };
};