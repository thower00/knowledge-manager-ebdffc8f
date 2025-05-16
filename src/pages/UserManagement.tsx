
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

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
      // First, get all users from auth.users via profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      if (profilesError) throw profilesError;

      // Then get admin statuses
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Now get email addresses for each user
      const userPromises = profiles.map(async (profile) => {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);
          
          if (userError) {
            console.error("Error fetching user details:", userError);
            return {
              id: profile.id,
              email: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
              isAdmin: userRoles.some(role => role.user_id === profile.id)
            };
          }
          
          return {
            id: profile.id,
            email: userData?.user?.email || "No Email",
            isAdmin: userRoles.some(role => role.user_id === profile.id)
          };
        } catch (error) {
          console.error(`Error processing user ${profile.id}:`, error);
          return {
            id: profile.id,
            email: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User",
            isAdmin: userRoles.some(role => role.user_id === profile.id)
          };
        }
      });

      const resolvedUsers = await Promise.all(userPromises);
      setUsers(resolvedUsers);
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
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })
        .select()
        .maybeSingle();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Already an admin",
            description: "This user is already an admin.",
          });
        } else {
          throw error;
        }
      } else {
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
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to promote user. Please try again.",
      });
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');
      
      if (error) throw error;
      
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

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) => user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge>Admin</Badge>
                        ) : (
                          "User"
                        )}
                      </TableCell>
                      <TableCell>
                        {!user.isAdmin ? (
                          <Button 
                            variant="outline" 
                            onClick={() => promoteToAdmin(user.id)}
                            disabled={user.id === currentUser?.id} // Can't change own role
                          >
                            Make Admin
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            onClick={() => removeAdmin(user.id)}
                            disabled={user.id === currentUser?.id} // Can't change own role
                          >
                            Remove Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
