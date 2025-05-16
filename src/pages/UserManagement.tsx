
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { User } from "@/types/user";
import { UserTable } from "@/components/user/UserTable";
import { UserSearch } from "@/components/user/UserSearch";
import { fetchAllUsers, promoteUserToAdmin, removeUserAdmin } from "@/services/userService";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user: currentUser, isAdmin, isLoading } = useAuth();

  // If user is not loading and not admin, redirect
  if (!isLoading && !isAdmin) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to access this page.",
    });
    return <Navigate to="/" replace />;
  }

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch users if the user is an admin
    if (isAdmin && !isLoading) {
      fetchUsers();
    }
  }, [isAdmin, isLoading]);

  const promoteToAdmin = async (userId: string) => {
    try {
      await promoteUserToAdmin(userId);
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, isAdmin: true } : u
        )
      );
      
      toast({
        title: "Success",
        description: "User has been promoted to admin.",
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        toast({
          title: "Already an admin",
          description: "This user is already an admin.",
        });
      } else {
        console.error("Error promoting user:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to promote user. Please try again.",
        });
      }
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      await removeUserAdmin(userId);
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, isAdmin: false } : u
        )
      );
      
      toast({
        title: "Success",
        description: "Admin privileges removed from user.",
      });
    } catch (error) {
      console.error("Error removing admin role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove admin role. Please try again.",
      });
    }
  };

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>User Management | Knowledge Manager</title>
      </Helmet>
      <div className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button onClick={() => fetchUsers()}>Refresh</Button>
        </div>
        
        <div className="space-y-4">
          <UserSearch 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery} 
          />
          
          <UserTable
            users={users}
            loading={loading}
            currentUserId={currentUser?.id}
            onPromoteToAdmin={promoteToAdmin}
            onRemoveAdmin={removeAdmin}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </>
  );
}
