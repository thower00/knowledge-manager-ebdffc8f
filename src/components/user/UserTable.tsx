
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { User } from "@/types/user";

interface UserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  onPromoteToAdmin: (userId: string) => Promise<void>;
  onRemoveAdmin: (userId: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  searchQuery: string;
  deletingUserId?: string;
}

export function UserTable({
  users,
  loading,
  currentUserId,
  onPromoteToAdmin,
  onRemoveAdmin,
  onDeleteUser,
  searchQuery,
  deletingUserId,
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
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
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
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={user.id === currentUserId || deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ta bort användare</AlertDialogTitle>
                        <AlertDialogDescription>
                          Är du säker på att du vill ta bort användaren <strong>{user.email}</strong>? 
                          Denna åtgärd kan inte ångras och kommer att ta bort all användardata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDeleteUser(user.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Ta bort användare
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
