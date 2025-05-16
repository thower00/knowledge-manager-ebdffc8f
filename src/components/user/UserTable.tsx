
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { User } from "@/types/user";

interface UserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  onPromoteToAdmin: (userId: string) => Promise<void>;
  onRemoveAdmin: (userId: string) => Promise<void>;
  searchQuery: string;
}

export function UserTable({
  users,
  loading,
  currentUserId,
  onPromoteToAdmin,
  onRemoveAdmin,
  searchQuery,
}: UserTableProps) {
  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) => user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
                      onClick={() => onPromoteToAdmin(user.id)}
                      disabled={user.id === currentUserId} // Can't change own role
                    >
                      Make Admin
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => onRemoveAdmin(user.id)}
                      disabled={user.id === currentUserId} // Can't change own role
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
  );
}
