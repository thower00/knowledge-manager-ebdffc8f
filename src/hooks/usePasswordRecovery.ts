import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const usePasswordRecovery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const checkForPasswordRecovery = () => {
    const urlParams = new URLSearchParams(location.search);
    const type = urlParams.get('type');
    const token = urlParams.get('token');
    const code = urlParams.get('code');
    
    console.log("usePasswordRecovery: Checking recovery params - type:", type, "token:", token, "code:", code);
    console.log("usePasswordRecovery: Current path:", location.pathname);
    
    // If this is a recovery flow and we're NOT already on reset-password page
    if ((type === 'recovery' || token || code) && location.pathname !== '/reset-password') {
      console.log("usePasswordRecovery: Recovery detected, redirecting to reset-password");
      const resetUrl = `/reset-password${location.search}`;
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
    const type = urlParams.get('type');
    const token = urlParams.get('token');
    const code = urlParams.get('code');
    
    return !!(type === 'recovery' || token || code);
  };

  return {
    checkForPasswordRecovery,
    handleSignInWithRecovery,
    isRecoveryFlow
  };
};