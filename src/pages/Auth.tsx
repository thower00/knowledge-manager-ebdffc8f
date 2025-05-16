
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Only redirect if user is definitely authenticated and not null
  if (user !== null && user !== undefined) {
    console.log("User is authenticated, redirecting to home", user);
    return <Navigate to="/" replace />;
  }

  console.log("Rendering Auth page, user:", user);
  
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
