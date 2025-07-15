
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
import { fetchAllUsers, promoteUserToAdmin, removeUserAdmin, deleteUser } from "@/services/userService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRoleManagement } from "@/components/admin/UserRoleManagement";
import { ManualUserCreation } from "@/components/admin/ManualUserCreation";
import { RegistrationSettings } from "@/components/admin/RegistrationSettings";
import { PasswordChangeSettings } from "@/components/admin/PasswordChangeSettings";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("users");
  const { toast } = useToast();
  const { user: currentUser, isAdmin, isLoading } = useAuth();

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
    // Only fetch users if the user is an admin and we're on the users tab
    if (isAdmin && !isLoading && activeTab === "users") {
      fetchUsers();
    }
  }, [isAdmin, isLoading, activeTab]);

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

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);
      
      // Remove user from local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      toast({
        title: "Användare borttagen",
        description: "Användaren har tagits bort permanent.",
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Fel",
        description: error.message || "Kunde inte ta bort användaren. Försök igen.",
      });
    } finally {
      setDeletingUserId(undefined);
    }
  };

  const handleUserCreated = () => {
    // Refresh the user list when a new user is created
    if (activeTab === "users") {
      fetchUsers();
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

  // If user is not admin, redirect
  if (!isAdmin) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to access this page.",
    });
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>User Management | Knowledge Manager</title>
      </Helmet>
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Role Management</TabsTrigger>
            <TabsTrigger value="create">Create User</TabsTrigger>
            <TabsTrigger value="settings">Registration Settings</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <UserSearch 
                  searchQuery={searchQuery} 
                  onSearchChange={setSearchQuery} 
                />
                <Button onClick={() => fetchUsers()}>Refresh</Button>
              </div>
              
              <UserTable
                users={users}
                loading={loading}
                currentUserId={currentUser?.id}
                onPromoteToAdmin={promoteToAdmin}
                onRemoveAdmin={removeAdmin}
                onDeleteUser={handleDeleteUser}
                searchQuery={searchQuery}
                deletingUserId={deletingUserId}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Role Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserRoleManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <ManualUserCreation onUserCreated={handleUserCreated} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <RegistrationSettings />
          </TabsContent>

          <TabsContent value="password" className="mt-6">
            <div className="text-center text-muted-foreground">
              <p>Password change is available in the Profile section for all users.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
