
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Key, Settings, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-36 bg-brand-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Knowledge Management Intelligence
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                  Extract, convert, and process text from multiple document formats. Transform raw content into meaningful knowledge.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button 
                  className="bg-brand-600 hover:bg-brand-700"
                  size="lg"
                  onClick={() => user ? navigate('/dashboard') : navigate('/auth')}
                >
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Powerful Knowledge Processing
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform handles the complexity of document processing so you can focus on insights.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <FileText className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Document Extraction</h3>
                    <p className="text-sm text-gray-500">
                      Extract text from various document formats including PDF, DOC, and more.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <Settings className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Text Processing</h3>
                    <p className="text-sm text-gray-500">
                      Process and normalize text data with advanced NLP techniques.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <Key className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Vector Embeddings</h3>
                    <p className="text-sm text-gray-500">
                      Create semantic vector representations for advanced search and analysis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Admin Features Preview */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Powerful Administration
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Complete control over users, configuration, and system testing.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <UserPlus className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Role Management</h3>
                    <p className="text-sm text-gray-500">
                      Promote users to admin roles and manage access permissions.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <Settings className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Configuration</h3>
                    <p className="text-sm text-gray-500">
                      Customize system settings and store configuration in the database.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="feature-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <Key className="h-12 w-12 text-brand-600" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Test Management</h3>
                    <p className="text-sm text-gray-500">
                      Verify implementations with comprehensive testing tools.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
