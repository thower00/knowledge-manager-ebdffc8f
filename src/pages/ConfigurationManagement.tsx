
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { ConfigurationManagement as ConfigurationManagementComponent } from "@/components/admin/ConfigurationManagement";

export default function ConfigurationManagement() {
  const { isAdmin, isLoading } = useAuth();
  const { toast } = useToast();

  // If user is not loading and not admin, redirect
  if (!isLoading && !isAdmin) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to access this page.",
    });
    return <Navigate to="/" replace />;
  }

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configuration Management | Knowledge Manager</title>
      </Helmet>
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold">Configuration Management</h1>
        
        <div className="space-y-4">
          <ConfigurationManagementComponent />
        </div>
      </div>
    </>
  );
}
