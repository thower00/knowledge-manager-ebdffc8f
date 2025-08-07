
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
import { format } from "date-fns";

interface UserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  onPromoteToAdmin?: (userId: string) => Promise<void>;
  onRemoveAdmin?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onResetPassword?: (userId: string) => void;
  searchQuery: string;
  deletingUserId?: string;
  mode: 'users' | 'roles';
}

export function UserTable({
  users,
  loading,
  currentUserId,
  onPromoteToAdmin,
  onRemoveAdmin,
  onDeleteUser,
  onResetPassword,
  searchQuery,
  deletingUserId,
  mode,
}: UserTableProps) {
  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) => user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSignIn = (lastSignInAt: string | null | undefined) => {
    if (!lastSignInAt) return "Never";
    try {
      return format(new Date(lastSignInAt), "yyyy-MM-dd HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Login</TableHead>
            {mode === 'users' && <TableHead>Actions</TableHead>}
            {mode === 'roles' && <TableHead>Role Actions</TableHead>}
            {mode === 'users' && <TableHead className="w-20">Delete</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={mode === 'users' ? 5 : 4} className="text-center py-4">
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
                <TableCell className="text-muted-foreground">
                  {formatLastSignIn(user.lastSignInAt)}
                </TableCell>
                
                {/* Actions column for both modes */}
                <TableCell>
                  <div className="flex gap-2">
                    {mode === 'roles' && (
                      // Role management actions
                      <>
                        {!user.isAdmin ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onPromoteToAdmin?.(user.id)}
                            disabled={user.id === currentUserId}
                          >
                            Make Admin
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onRemoveAdmin?.(user.id)}
                            disabled={user.id === currentUserId}
                          >
                            Remove Admin
                          </Button>
                        )}
                      </>
                    )}
                    
                    {mode === 'users' && (
                      // User management actions
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onResetPassword?.(user.id)}
                        disabled={true} // Placeholder for now
                      >
                        Reset Password
                      </Button>
                    )}
                  </div>
                </TableCell>
                
                {/* Delete column only for users mode */}
                {mode === 'users' && (
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
                            onClick={() => onDeleteUser?.(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Ta bort användare
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={mode === 'users' ? 5 : 4} className="text-center py-4">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
