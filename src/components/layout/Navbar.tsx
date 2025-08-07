
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { FileText, LogOut, User, UserCircle, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-brand-600" />
          <Link to="/" className="logo-text">
            Knowledge Manager
          </Link>
        </div>
        
        <nav className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Signed in as: <span className="font-medium">{user.email}</span>
                  </span>
                  {isAdmin && (
                    <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>My Account</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => navigate('/admin')}
                    >
                      <span className="mr-2 h-4 w-4 flex items-center justify-center font-semibold text-xs">A</span>
                      <span>Admin</span>
                    </DropdownMenuItem>
                  )}
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
            </div>
          ) : (
            <Button 
              variant="default"
              className="bg-brand-600 hover:bg-brand-700"
              onClick={() => navigate('/')}
            >
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
