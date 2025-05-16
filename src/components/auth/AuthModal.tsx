
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </DialogTitle>
        </DialogHeader>
        
        {isSignUp ? (
          <SignUpForm 
            onSignIn={() => setIsSignUp(false)} 
            onSuccess={onSuccess} 
          />
        ) : (
          <SignInForm 
            onSignUp={() => setIsSignUp(true)} 
            onSuccess={onSuccess} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
