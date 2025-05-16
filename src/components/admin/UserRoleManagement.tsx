
import { useState } from "react";
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// Mock user data
const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "User",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Admin",
    createdAt: "2023-02-20",
  },
  {
    id: "3",
    name: "Robert Johnson",
    email: "robert@example.com",
    role: "User",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    name: "Lisa Brown",
    email: "lisa@example.com",
    role: "User",
    createdAt: "2023-04-05",
  },
];

export function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handlePromoteToAdmin = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, role: "Admin" } : user
      )
    );
    toast({
      title: "User promoted",
      description: "User has been promoted to Admin",
    });
  };

  const handleDemoteToUser = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, role: "User" } : user
      )
    );
    toast({
      title: "User demoted",
      description: "Admin has been demoted to User",
    });
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

    // In a real app, this would make an API call to update the password
    toast({
      title: "Password reset",
      description: "Password has been reset successfully",
    });
    
    setIsResetPasswordOpen(false);
    setNewPassword("");
    setSelectedUserId(null);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
    toast({
      title: "User removed",
      description: "User has been removed successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.role === "User" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteToAdmin(user.id)}
                        >
                          Make Admin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDemoteToUser(user.id)}
                        >
                          Remove Admin
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user.id)}
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
