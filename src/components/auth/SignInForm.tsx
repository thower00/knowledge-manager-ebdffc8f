
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface SignInFormProps {
  onSignUp: () => void;
  onSuccess: () => void;
}

export default function SignInForm({ onSignUp, onSuccess }: SignInFormProps) {
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
      
      // In a real app, this would make an API call to authenticate the user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes we'll simulate a successful login
      onSuccess();
      
      toast({
        title: "Success!",
        description: "You've been signed in.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid email or password.",
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
