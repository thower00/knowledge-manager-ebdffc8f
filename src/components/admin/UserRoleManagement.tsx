
import { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { User } from "@/types/user";
import { fetchAllUsers, promoteUserToAdmin, removeUserAdmin } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";

export function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
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

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return user.email.toLowerCase().includes(query);
  });

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

  const handleResetPassword = (userId: string) => {
    setSelectedUserId(userId);
    setIsResetPasswordOpen(true);
  };

  const handleConfirmResetPassword = () => {
    if (!newPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a new password.",
      });
      return;
    }

    // Note: Password reset functionality would require admin privileges
    // This is a placeholder for now
    toast({
      title: "Password reset",
      description: "Password reset functionality is not implemented yet",
    });
    
    setIsResetPasswordOpen(false);
    setNewPassword("");
    setSelectedUserId(null);
  };

  const handleRemoveUser = (userId: string) => {
    // Note: User removal functionality would require admin privileges
    // This is a placeholder for now
    toast({
      title: "User removal",
      description: "User removal functionality is not implemented yet",
    });
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.isAdmin ? "Admin" : "User"}</TableCell>
                  <TableCell className="font-mono text-xs">{user.id}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!user.isAdmin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteToAdmin(user.id)}
                          disabled={user.id === currentUser?.id}
                        >
                          Make Admin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDemoteToUser(user.id)}
                          disabled={user.id === currentUser?.id}
                        >
                          Remove Admin
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user.id)}
                        disabled={true}
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={true}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetPasswordOpen(false);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmResetPassword}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
