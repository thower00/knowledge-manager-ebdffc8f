
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
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
          />
        ) : (
          <SignInForm 
            onSignUp={() => setIsSignUp(true)} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
