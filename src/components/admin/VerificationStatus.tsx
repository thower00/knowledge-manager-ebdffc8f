
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export interface VerificationStatusProps {
  isVerifying: boolean;
  isValid?: boolean;
  message?: string;
}

export function VerificationStatusAlert({ 
  isVerifying, 
  isValid, 
  message 
}: VerificationStatusProps) {
  if (!message) return null;
  
  return (
    <Alert variant={isValid ? "default" : "destructive"} className="mt-2">
      {isValid ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>{isValid ? "Verification Successful" : "Verification Failed"}</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
}

export function VerificationButton({ 
  onClick, 
  isVerifying, 
  disabled = false 
}: { 
  onClick: () => void; 
  isVerifying: boolean; 
  disabled?: boolean 
}) {
  return (
    <button 
      onClick={onClick} 
      disabled={isVerifying || disabled}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    >
      {isVerifying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying
        </>
      ) : "Verify"}
    </button>
  );
}
