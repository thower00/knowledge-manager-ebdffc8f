
import { Helmet } from "react-helmet-async";
import { TestManagement } from "@/components/admin/test-management/TestManagementContainer";

export default function TestManagementPage() {
  return (
    <>
      <Helmet>
        <title>Test Management | Knowledge Manager</title>
      </Helmet>
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Test Management</h1>
          <p className="text-muted-foreground">
            Test and verify various system functionalities.
          </p>
        </div>
        
        <TestManagement />
      </div>
    </>
  );
}
