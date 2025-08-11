
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRegistrationSettings } from "@/hooks/useRegistrationSettings";

interface SignUpFormProps {
  onSignIn: () => void;
}

export default function SignUpForm({ onSignIn }: SignUpFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { allowPublicRegistration, loading: settingsLoading } = useRegistrationSettings();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allowPublicRegistration) {
      toast({
        variant: "destructive",
        title: "Registrering inaktiverad",
        description: "Självregistrering är för närvarande inaktiverad.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lösenorden matchar inte",
        description: "Kontrollera att lösenorden är identiska.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Lösenordet är för kort",
        description: "Lösenordet måste vara minst 6 tecken långt.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Konto skapat!",
        description: "Kontrollera din e-post för att verifiera ditt konto.",
      });

      // Clear form
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        variant: "destructive",
        title: "Registrering misslyckades",
        description: error.message || "Ett oväntat fel inträffade.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Laddar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {!allowPublicRegistration && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Självregistrering är för närvarande inaktiverad. Kontakta en administratör för att få ett konto.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSignUp} className={`space-y-4 ${!allowPublicRegistration ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">Förnamn</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!allowPublicRegistration}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="lastName">Efternamn</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!allowPublicRegistration}
              required
            />
          </div>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            type="email"
            placeholder="din@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!allowPublicRegistration}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="password">Lösenord</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!allowPublicRegistration}
            required
            minLength={6}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!allowPublicRegistration}
            required
            minLength={6}
          />
        </div>
        
        <Button
          type="submit"
          className="w-full bg-brand-600 hover:bg-brand-700"
          disabled={!allowPublicRegistration || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Skapar konto...
            </>
          ) : allowPublicRegistration ? (
            "Skapa konto"
          ) : (
            "Skapa konto (Inaktiverat)"
          )}
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Har du redan ett konto? </span>
        <button
          type="button"
          onClick={onSignIn}
          className="text-brand-600 hover:underline"
        >
          Logga in
        </button>
      </div>
    </div>
  );
}
