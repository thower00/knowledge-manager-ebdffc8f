
-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from their sessions" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view contexts from their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can create contexts for their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can update contexts for their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can delete contexts from their own messages" ON public.chat_contexts;

-- Ensure RLS is enabled
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_contexts ENABLE ROW LEVEL SECURITY;

-- Create clean, simple RLS policies for chat_sessions
CREATE POLICY "chat_sessions_select_policy" 
  ON public.chat_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert_policy" 
  ON public.chat_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_update_policy" 
  ON public.chat_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_delete_policy" 
  ON public.chat_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create clean, simple RLS policies for chat_messages
CREATE POLICY "chat_messages_select_policy" 
  ON public.chat_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_policy" 
  ON public.chat_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

-- Create clean, simple RLS policies for chat_contexts
CREATE POLICY "chat_contexts_select_policy" 
  ON public.chat_contexts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_contexts_insert_policy" 
  ON public.chat_contexts 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );
