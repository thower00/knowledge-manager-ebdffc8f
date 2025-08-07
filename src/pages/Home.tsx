import { Helmet } from "react-helmet-async";
import AIChat from "@/components/chat/AIChat";

export default function Home() {
  return (
    <div className="container pt-20 pb-8">
      <Helmet>
        <title>AI Chat | Knowledge Manager</title>
      </Helmet>
      
      <h1 className="text-3xl font-bold mb-6">AI Chat</h1>
      <AIChat />
    </div>
  );
}