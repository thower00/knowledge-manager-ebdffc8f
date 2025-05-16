
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Settings, Users, FileText, Home, User } from "lucide-react";

export default function AppSidebar() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col items-center justify-center p-4">
        <FileText className="h-8 w-8 text-brand-600 mb-2" />
        <h1 className="text-lg font-semibold">Knowledge Manager</h1>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={isActive("/")} 
                onClick={() => navigate("/")}
                tooltip="Home"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {user && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={isActive("/profile")} 
                  onClick={() => navigate("/profile")}
                  tooltip="Profile"
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
        
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={isActive("/admin")} 
                    onClick={() => navigate("/admin")}
                    tooltip="Admin Dashboard"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={isActive("/user-management")} 
                    onClick={() => navigate("/user-management")}
                    tooltip="User Management"
                  >
                    <Users className="h-5 w-5" />
                    <span>User Management</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          Knowledge Manager v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
