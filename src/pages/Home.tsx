import { Helmet } from "react-helmet-async";
import AIChat from "@/components/chat/AIChat";

export default function Home() {
  return (
    <div className="container py-8">
      <Helmet>
        <title>Home | Knowledge Manager</title>
      </Helmet>
      
      <AIChat />
    </div>
  );
}