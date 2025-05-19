
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/content/DocumentsTab";

export default function ContentManagement() {
  return (
    <>
      <Helmet>
        <title>Content Management | Knowledge Manager</title>
      </Helmet>
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Manage your content assets and knowledge base resources.
          </p>
        </div>
        
        <Tabs defaultValue="documents">
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>
                  Follow these steps to manage documents:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Select a document source from the dropdown (currently Google Drive)</li>
                  <li>Click "Refresh Documents" to retrieve files from the selected source</li>
                  <li>If you've configured a specific Google Drive folder ID in settings, only files from that folder will be retrieved</li>
                  <li>Select files you want to process by checking the boxes</li>
                  <li>Click "Process Selected" to upload the documents to the database</li>
                  <li>Use the Database Documents section below to view and manage processed documents</li>
                </ol>
              </CardContent>
            </Card>
            
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
