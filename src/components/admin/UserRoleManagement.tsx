
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { User } from "@/types/user";
import { UserTable } from "@/components/user/UserTable";
import { fetchAllUsers, promoteUserToAdmin, removeUserAdmin } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";

export function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Fetch users from database
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
    fetchUsers();
  }, []);


  const handlePromoteToAdmin = async (userId: string) => {
    try {
      await promoteUserToAdmin(userId);
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, isAdmin: true } : u
        )
      );
      
      toast({
        title: "User promoted",
        description: "User has been promoted to Admin",
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

  const handleDemoteToUser = async (userId: string) => {
    try {
      await removeUserAdmin(userId);
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, isAdmin: false } : u
        )
      );
      
      toast({
        title: "User demoted",
        description: "Admin has been demoted to User",
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


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={fetchUsers}>Refresh</Button>
      </div>

      <UserTable
        users={users}
        loading={loading}
        currentUserId={currentUser?.id}
        onPromoteToAdmin={handlePromoteToAdmin}
        onRemoveAdmin={handleDemoteToUser}
        searchQuery={searchQuery}
        mode="roles"
      />
    </div>
  );
}
