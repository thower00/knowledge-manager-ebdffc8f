
-- Check if RLS is enabled on chat_sessions and ensure proper policies exist
-- First, let's see the current state and fix any missing policies

-- Ensure RLS is enabled on chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

-- Create comprehensive RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
  ON public.chat_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" 
  ON public.chat_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
  ON public.chat_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
  ON public.chat_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Also ensure chat_messages table has proper RLS policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate chat_messages policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from their sessions" ON public.chat_messages;

CREATE POLICY "Users can view messages from their sessions" 
  ON public.chat_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions" 
  ON public.chat_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their sessions" 
  ON public.chat_messages 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their sessions" 
  ON public.chat_messages 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

-- Ensure chat_contexts table has proper RLS policies (note: plural form)
ALTER TABLE public.chat_contexts ENABLE ROW LEVEL SECURITY;

-- Drop and recreate chat_contexts policies
DROP POLICY IF EXISTS "Users can view contexts from their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can create contexts for their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can update contexts for their own messages" ON public.chat_contexts;
DROP POLICY IF EXISTS "Users can delete contexts from their own messages" ON public.chat_contexts;

CREATE POLICY "Users can view contexts from their own messages" 
  ON public.chat_contexts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contexts for their own messages" 
  ON public.chat_contexts 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contexts for their own messages" 
  ON public.chat_contexts 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contexts from their own messages" 
  ON public.chat_contexts 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = chat_contexts.message_id AND cs.user_id = auth.uid()
    )
  );
