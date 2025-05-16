
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";

interface SignInFormProps {
  onSignUp: () => void;
}

export default function SignInForm({ onSignUp }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all fields.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Starting sign in process");

      // Clean up existing auth state
      cleanupAuthState();
      
      // Try to sign out first (in case there's a stale session)
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log("Pre-login cleanup complete");
      } catch (err) {
        console.log("Error during pre-login cleanup:", err);
        // Continue even if this fails
      }
      
      console.log("Signing in with:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log("Sign in successful:", data.user?.id);
      
      toast({
        title: "Success!",
        description: "You've been signed in.",
      });
      
      // Force page reload to ensure proper state update
      window.location.href = "/";
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </div>
      
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a href="#" className="text-xs text-brand-600 hover:underline">
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>
      
      <Button
        type="submit"
        className="w-full bg-brand-600 hover:bg-brand-700"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
      
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <button
          type="button"
          onClick={onSignUp}
          className="text-brand-600 hover:underline"
        >
          Sign up
        </button>
      </div>
    </form>
  );
}
