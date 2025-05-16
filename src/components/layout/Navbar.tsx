
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, User } from "lucide-react";
import AuthModal from "../auth/AuthModal";

export default function Navbar() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // In a real application, this would be determined by authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-brand-600" />
          <Link to="/" className="logo-text">
            Knowledge Manager
          </Link>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-brand-700">
            Home
          </Link>
          <Link to="/features" className="text-sm font-medium transition-colors hover:text-brand-700">
            Features
          </Link>
          <Link to="/docs" className="text-sm font-medium transition-colors hover:text-brand-700">
            Documentation
          </Link>
          
          {isLoggedIn && (
            <Link to="/dashboard" className="text-sm font-medium transition-colors hover:text-brand-700">
              Dashboard
            </Link>
          )}
          
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium transition-colors hover:text-brand-700">
              Admin
            </Link>
          )}
          
          {isLoggedIn ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                // For demo purposes, just toggle login state
                setIsLoggedIn(false);
                setIsAdmin(false);
              }}
            >
              <User className="h-5 w-5" />
            </Button>
          ) : (
            <Button 
              variant="default"
              className="bg-brand-600 hover:bg-brand-700"
              onClick={() => setAuthModalOpen(true)}
            >
              Sign In
            </Button>
          )}
        </nav>
      </div>
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => {
          setIsLoggedIn(true);
          // For demo purposes, 50% chance of being admin
          setIsAdmin(Math.random() > 0.5);
          setAuthModalOpen(false);
        }}
      />
    </header>
  );
}
