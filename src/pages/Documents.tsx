
import { Helmet } from "react-helmet-async";
import { ViewDocuments } from "@/components/content/ViewDocuments";

export default function Documents() {
  return (
    <>
      <Helmet>
        <title>Documents | Knowledge Manager</title>
      </Helmet>
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Browse and view available knowledge base documents.
          </p>
        </div>
        
        <ViewDocuments />
      </div>
    </>
  );
}
