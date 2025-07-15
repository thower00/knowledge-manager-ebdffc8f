import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have a valid reset token (can be either 'code' or 'token')
    const token = searchParams.get('token') || searchParams.get('code');
    const type = searchParams.get('type') || 'recovery';
    const fullUrl = window.location.href;
    
    console.log("ResetPasswordForm: Full URL:", fullUrl);
    console.log("ResetPasswordForm: All searchParams:", Object.fromEntries(searchParams.entries()));
    console.log("ResetPasswordForm: Checking for token/code:", { token, type });
    
    if (token) {
      setIsValidToken(true);
      console.log("ResetPasswordForm: Valid token found, allowing password reset");
    } else {
      console.log("ResetPasswordForm: No valid token found");
      console.log("ResetPasswordForm: Available params:", {
        code: searchParams.get('code'),
        token: searchParams.get('token'),
        type: searchParams.get('type'),
        allParams: Array.from(searchParams.entries())
      });
      
      toast({
        variant: "destructive",
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired.",
      });
      
      // Don't navigate away immediately, let user see the error
      setTimeout(() => {
        window.location.href = '/forgot-password';
      }, 3000);
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get the current session first to ensure we have a valid session for password update
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Invalid or expired reset link. Please request a new password reset.");
      }

      if (!session) {
        throw new Error("Invalid or expired reset link. Please request a new password reset.");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Lösenord uppdaterat",
        description: "Ditt lösenord har uppdaterats framgångsrikt.",
      });

      // Redirect to homepage with a clean URL
      window.location.href = '/';

    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        variant: "destructive",
        title: "Fel",
        description: error.message || "Misslyckades med att uppdatera lösenord. Försök igen.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Set New Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}