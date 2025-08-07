import { Helmet } from "react-helmet-async";
import AIChat from "@/components/chat/AIChat";

export default function Home() {
  return (
    <div className="container pt-20 pb-8">
      <Helmet>
        <title>AI Chat | Knowledge Manager</title>
      </Helmet>
      
      <AIChat />
    </div>
  );
}