import { Session, User } from "@supabase/supabase-js";

export interface AuthContextProps {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export type AuthEvent = 
  | 'SIGNED_IN' 
  | 'SIGNED_OUT' 
  | 'TOKEN_REFRESHED' 
  | 'USER_UPDATED' 
  | 'PASSWORD_RECOVERY';

export interface AuthError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface SignOutOptions {
  showToast?: boolean;
  redirectTo?: string;
}