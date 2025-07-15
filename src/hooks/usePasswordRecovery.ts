import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const usePasswordRecovery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const checkForPasswordRecovery = () => {
    // Check both URL search params and hash for recovery parameters
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    const type = urlParams.get('type') || hashParams.get('type');
    const token = urlParams.get('token') || hashParams.get('access_token');
    const code = urlParams.get('code');
    
    console.log("usePasswordRecovery: Checking recovery params - type:", type, "token:", !!token, "code:", code);
    console.log("usePasswordRecovery: Current path:", location.pathname);
    console.log("usePasswordRecovery: Hash:", location.hash);
    
    // If this is a recovery flow and we're NOT already on reset-password page
    if ((type === 'recovery' || token) && location.pathname !== '/reset-password') {
      console.log("usePasswordRecovery: Recovery detected, redirecting to reset-password");
      const resetUrl = `/reset-password${location.hash}`;
      window.location.replace(resetUrl);
      return true; // Indicates recovery was detected
    }
    
    return false;
  };

  const handleSignInWithRecovery = (user: any) => {
    // Check for recovery after successful sign in
    if (user) {
      const isRecovery = checkForPasswordRecovery();
      return isRecovery;
    }
    return false;
  };

  const isRecoveryFlow = () => {
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    const type = urlParams.get('type') || hashParams.get('type');
    const token = urlParams.get('token') || hashParams.get('access_token');
    const code = urlParams.get('code');
    
    return !!(type === 'recovery' || token);
  };

  return {
    checkForPasswordRecovery,
    handleSignInWithRecovery,
    isRecoveryFlow
  };
};