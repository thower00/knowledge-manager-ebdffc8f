
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { useUserRole } from "@/hooks/useUserRole";
import { AuthContextProps, AuthProviderProps, AuthError, SignOutOptions } from "@/types/auth";

// Create context with undefined default value
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { handleSignInWithRecovery } = usePasswordRecovery();
  const { isAdmin } = useUserRole(user?.id);
  const { toast } = useToast();

  // Enhanced error logging
  const logAuthError = (error: unknown, context: string): AuthError => {
    const authError: AuthError = {
      message: error instanceof Error ? error.message : 'Unknown auth error',
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
      details: error
    };
    
    console.error(`Auth Error [${context}]:`, authError);
    return authError;
  };


  // Enhanced sign out function with better error handling
  const signOut = async (options: SignOutOptions = {}): Promise<void> => {
    const { showToast = true, redirectTo = '/' } = options;
    
    try {
      console.log("AuthContext: Initiating sign out...");
      setIsLoading(true);
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        throw error;
      }
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      if (showToast) {
        toast({
          title: "Signed out successfully",
          description: "You have been signed out of your account.",
        });
      }
      
      console.log("AuthContext: Sign out completed successfully");
      
      // Force page reload to ensure clean state
      window.location.href = redirectTo;
    } catch (error) {
      const authError = logAuthError(error, 'signOut');
      
      if (showToast) {
        toast({
          variant: "destructive",
          title: "Sign out failed",
          description: authError.message || "There was an error signing out. Please try again.",
        });
      }
      
      // Even if sign out fails, clear local state and redirect
      // This prevents users from being stuck in a limbo state
      setUser(null);
      setSession(null);
      cleanupAuthState();
      
      // Still redirect to ensure clean state
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("AuthContext: Provider mounted, setting up auth listeners");
    setIsLoading(true);
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`AuthContext: Auth state change event: ${event}`);
        console.log(`AuthContext: Session user: ${currentSession?.user?.id || 'no user'}`);
        
        try {
          // Handle password recovery flow
          if (event === 'SIGNED_IN' && currentSession?.user) {
            // Defer password recovery handling to prevent deadlocks
            setTimeout(() => {
              handleSignInWithRecovery(currentSession.user);
            }, 0);
          }
          
          // Update session and user state
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          console.log(`AuthContext: State updated for event: ${event}`);
        } catch (error) {
          logAuthError(error, `onAuthStateChange:${event}`);
        } finally {
          // Mark loading as complete after state change
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (error) {
          logAuthError(error, 'getSession');
          return;
        }
        
        console.log(`AuthContext: Initial session check: ${currentSession ? `exists: ${currentSession.user.id}` : "none"}`);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      })
      .catch((error) => {
        logAuthError(error, 'getSession');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      console.log("AuthContext: Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, [handleSignInWithRecovery]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: AuthContextProps = {
    session,
    user,
    isLoading,
    isAdmin,
    signOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook with enhanced error handling
export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
      "Make sure your component is wrapped with <AuthProvider>."
    );
  }
  
  return context;
}
