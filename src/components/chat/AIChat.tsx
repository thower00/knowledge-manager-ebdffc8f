
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function AIChat() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageCircle className="h-8 w-8 text-brand-600" />
            <CardTitle className="text-2xl">AI Knowledge Assistant</CardTitle>
          </div>
          <p className="text-gray-600">
            Your intelligent assistant powered by your processed documents and embeddings
          </p>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <div className="text-4xl">🤖</div>
            <h3 className="text-xl font-semibold">AI Chat Coming Soon</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              The AI chat interface will be implemented in Phase 2. This will allow you to ask questions 
              and get intelligent responses based on your processed documents and vector embeddings.
            </p>
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Future features:</strong> Document-aware conversations, source citations, 
                semantic search, and intelligent knowledge retrieval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
