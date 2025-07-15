import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const type = urlParams.get('type');
    
    console.log('AuthRedirectHandler: Checking URL:', location.pathname + location.search);
    console.log('AuthRedirectHandler: Code found:', code, 'Type:', type);
    
    // If we're on the root path with a code parameter, redirect to reset password
    if (location.pathname === '/' && code) {
      console.log('AuthRedirectHandler: Redirecting to reset password with code:', code);
      
      // Use replace to avoid back button issues
      navigate(`/reset-password?code=${code}${type ? `&type=${type}` : ''}`, { replace: true });
      return;
    }
  }, [location, navigate]);

  return <>{children}</>;
}