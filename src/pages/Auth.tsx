
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import { useAuth } from "@/context/AuthContext";
import { debugAuthState } from "@/integrations/supabase/client";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { user, isLoading } = useAuth();
  
  // Debug function to help diagnose auth issues
  useEffect(() => {
    const checkAuth = async () => {
      console.log("Auth page mounted, checking auth state");
      const session = await debugAuthState();
      console.log("Auth page debug - Current user state:", user);
      console.log("Auth page debug - Current session state:", session);
    };
    
    checkAuth();
  }, [user]);
  
  // Only redirect if explicitly authenticated and not in loading state
  if (user && !isLoading) {
    console.log("Auth page - User authenticated, redirecting to home", user);
    return <Navigate to="/" replace />;
  }
  
  // Show loading state while checking authentication
  if (isLoading) {
    console.log("Auth page - Loading state...");
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  console.log("Auth page - Rendering login/signup form. User:", user);
  
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-16rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create an account" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Enter your details to create a new account" 
              : "Enter your credentials to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <SignUpForm 
              onSignIn={() => setIsSignUp(false)} 
            />
          ) : (
            <SignInForm 
              onSignUp={() => setIsSignUp(true)} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
