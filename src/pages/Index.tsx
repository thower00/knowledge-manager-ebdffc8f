
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import AIChat from "@/components/chat/AIChat";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { debugAuthState, supabase } from "@/integrations/supabase/client";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";

export default function Index() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const { checkForPasswordRecovery } = usePasswordRecovery();
  
  // Debug function to help diagnose auth issues
  
  // Check for password recovery first, before anything else
  useEffect(() => {
    // Check for recovery parameters immediately when the page loads
    const isRecoveryDetected = checkForPasswordRecovery();
    if (isRecoveryDetected) {
      console.log("Index page - Recovery flow detected, redirecting...");
      return; // Early return if recovery is detected
    }
    
    const checkAuth = async () => {
      console.log("Index page mounted, checking auth state");
      const session = await debugAuthState();
      console.log("Index page debug - Current user state:", user);
      console.log("Index page debug - Current session state:", session);
    };
    
    checkAuth();
  }, [checkForPasswordRecovery, user]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    console.log("Index page - Loading state...");
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show AI Chat for authenticated users
  if (user) {
    console.log("Index page - User authenticated, showing AI chat", user);
    return <AIChat />;
  }

  // Show login/signup for non-authenticated users
  console.log("Index page - No user, showing auth forms");
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-36 bg-brand-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Knowledge Management Intelligence
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                Extract, convert, and process text from multiple document formats. Transform raw content into meaningful knowledge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="w-full py-12 bg-white">
        <div className="container flex items-center justify-center px-4 md:px-6">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {isSignUp ? "Skapa konto" : "Logga in"}
              </CardTitle>
              <CardDescription>
                {isSignUp 
                  ? "Registrering är för närvarande inaktiverad" 
                  : "Ange dina uppgifter för att komma åt ditt konto"}
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
      </section>
    </div>
  );
}
