import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ContextSource {
  title: string;
  content: string;
  viewUrl?: string;
  downloadUrl?: string;
  isGoogleDrive?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useChat = (initialSessionId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sources, setSources] = useState<ContextSource[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      console.error('Error fetching chat sessions:', err);
      toast({
        variant: 'destructive',
        title: 'Error loading sessions',
        description: err.message,
      });
    }
  }, [user, toast]);

  const fetchMessages = useCallback(async (chatSessionId: string) => {
    if (!chatSessionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', chatSessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Cast the role field to the proper type
      const typedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
      }));
      
      setMessages(typedMessages);
    } catch (err: any) {
      console.error('Error fetching chat messages:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error loading messages',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return null;

    setIsLoading(true);
    setError(null);
    
    try {
      // Add user message to local state immediately for UI responsiveness
      const userMessage: ChatMessage = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call the edge function for chat processing
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          sessionId,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          question: content
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Error processing chat request');
      }

      console.log('Chat response received:', data);

      // Update session ID if new session was created
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        fetchSessions(); // Refresh sessions list
      }

      // Enhanced context processing to include document URLs
      if (data.context) {
        console.log('Processing context sources:', data.context);
        const enhancedSources: ContextSource[] = data.context.map((contextItem: any) => ({
          title: contextItem.title,
          content: contextItem.content,
          // These will be populated by the backend when available
          viewUrl: contextItem.viewUrl,
          downloadUrl: contextItem.downloadUrl,
          isGoogleDrive: contextItem.isGoogleDrive || false
        }));
        console.log('Enhanced sources set:', enhancedSources);
        setSources(enhancedSources);
      } else {
        console.log('No context sources in response');
        setSources([]);
      }

      // Instead of adding to local state, reload messages from DB
      if (data.sessionId) {
        await fetchMessages(data.sessionId);
      } else {
        // Fallback if no session ID - add to local state only
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response 
        }]);
      }
      
      return data;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error sending message',
        description: err.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionId, messages, fetchMessages, fetchSessions, toast]);

  const createNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setSources([]);
  }, []);

  const selectSession = useCallback((id: string) => {
    setSessionId(id);
    setMessages([]);
    setSources([]);
    fetchMessages(id);
  }, [fetchMessages]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // If we're deleting the current session, create a new one
      if (id === sessionId) {
        createNewSession();
      }
      
      // Refresh sessions list
      fetchSessions();
      
      toast({
        title: 'Chat session deleted',
        description: 'The chat session has been deleted.'
      });
    } catch (err: any) {
      console.error('Error deleting session:', err);
      toast({
        variant: 'destructive',
        title: 'Error deleting session',
        description: err.message,
      });
    }
  }, [sessionId, createNewSession, fetchSessions, toast]);

  // Initial load of sessions
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  // Load messages when session ID is set/changed
  useEffect(() => {
    if (sessionId) {
      fetchMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, fetchMessages]);

  return {
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
  };
};
