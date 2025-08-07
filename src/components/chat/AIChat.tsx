
import { useState, useRef, useEffect } from 'react';
import { processMessageContent } from '@/utils/markdownParser';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Loader2, Plus, Trash2, ChevronDown, BookOpen, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { DocumentSourcePanel } from './DocumentSourcePanel';

// Message component to display chat messages with markdown support
const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Fallback to original rendering if markdown processing fails
  const renderContent = () => {
    try {
      const parsedContent = processMessageContent(message.content);
      return (
        <div className="text-sm">
          {parsedContent}
        </div>
      );
    } catch (error) {
      console.warn('Failed to parse markdown, falling back to plain text:', error);
      // Fallback to original rendering
      return (
        <div className="text-sm">
          {message.content.split('\n').map((text, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {text}
            </p>
          ))}
        </div>
      );
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        } px-4 py-3 rounded-lg max-w-[80%] relative`}
      >
        {renderContent()}
        {message.created_at && (
          <div className="text-xs opacity-70 mt-2 text-right">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AIChat() {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { user } = useAuth();
  
  const {
    messages,
    isLoading,
    error,
    sessionId,
    sessions,
    sources,
    sendMessage,
    createNewSession,
    selectSession,
    deleteSession,
  } = useChat();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue;
    setInputValue('');
    
    // Adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    await sendMessage(message);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaInput = (e) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    
    // Auto-resize the textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="container py-6">
      <Card className="overflow-hidden flex flex-col max-w-4xl mx-auto">
        <CardHeader className="py-3 px-4 border-b bg-card flex-shrink-0 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {sessions.find(s => s.id === sessionId)?.title || "New Conversation"}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={createNewSession}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
            
            {sessions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    History
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                  <ScrollArea className="h-[400px]">
                    {sessions.map((session) => (
                      <DropdownMenuItem 
                        key={session.id}
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => selectSession(session.id)}
                      >
                        <span className="truncate flex-1 mr-2">{session.title}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {sources.length > 0 && (
              <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Sources
                    <Badge className="ml-1">{sources.length}</Badge>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Document Sources</SheetTitle>
                    <SheetDescription>
                      The AI used these documents to generate its response. You can view or download them below.
                    </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <ScrollArea className="h-[calc(100vh-180px)]">
                    <DocumentSourcePanel sources={sources} />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 h-96 overflow-y-auto">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-2xl font-semibold mb-2">How can I help you?</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me questions about the documents that have been uploaded and processed.
                I'll use document embeddings to provide contextually relevant answers with source references.
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted text-foreground px-4 py-3 rounded-lg flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>
        
        <CardFooter className="p-4 border-t">
          <form onSubmit={handleSubmit} className="w-full flex items-end gap-2">
            <div className="relative w-full">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="min-h-[40px] max-h-[180px] pr-10 resize-none"
                disabled={isLoading || !user}
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!inputValue.trim() || isLoading || !user}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
