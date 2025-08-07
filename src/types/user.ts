
export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  lastSignInAt?: string | null;
}
