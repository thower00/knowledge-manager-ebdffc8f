
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

// Create context with undefined default value
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { handleSignInWithRecovery } = usePasswordRecovery();
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Check for user role
  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      console.log("Signing out...");
      setIsLoading(true);
      
      // Clean up auth state
      cleanupAuthState();
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
      // Force page reload to clear any cached state and redirect to main page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("AuthProvider mounted");
    setIsLoading(true);
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state change event:", event);
        console.log("Auth state change session:", currentSession?.user?.id || 'no user');
        
        // Check for password reset after login event
        if (event === 'SIGNED_IN' && currentSession?.user) {
          // Use the hook to handle password recovery flow
          handleSignInWithRecovery(currentSession.user);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Check admin status when session changes
        if (currentSession?.user) {
          // Defer Supabase calls to prevent deadlocks
          setTimeout(() => {
            checkUserRole(currentSession.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }

        // Mark loading as complete after a state change
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession ? `exists: ${currentSession.user.id}` : "none");
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        checkUserRole(currentSession.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
