
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface SignUpFormProps {
  onSignIn: () => void;
}

export default function SignUpForm({ onSignIn }: SignUpFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="space-y-4 pt-2">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Självregistrering är för närvarande inaktiverad. Kontakta en administratör för att få ett konto.
        </AlertDescription>
      </Alert>

      <form className="space-y-4 opacity-50 pointer-events-none">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">Förnamn</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={true}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="lastName">Efternamn</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={true}
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
            disabled={true}
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
            disabled={true}
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
            disabled={true}
          />
        </div>
        
        <Button
          type="button"
          className="w-full bg-brand-600 hover:bg-brand-700"
          disabled={true}
        >
          Skapa konto (Inaktiverat)
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
