
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { FileText, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  
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
          
          {user && (
            <Link to="/dashboard" className="text-sm font-medium transition-colors hover:text-brand-700">
              Dashboard
            </Link>
          )}
          
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium transition-colors hover:text-brand-700">
              Admin
            </Link>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="default"
              className="bg-brand-600 hover:bg-brand-700"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
