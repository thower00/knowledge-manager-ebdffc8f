export async function manageSession(
  supabase: any,
  userId: string,
  sessionId: string | null,
  question: string
): Promise<string> {
  let currentSessionId = sessionId
  
  // If no session exists yet, create one
  if (!currentSessionId) {
    console.log('Creating new chat session...')
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({ 
        user_id: userId,
        title: question.slice(0, 100) // Use first part of question as title
      })
      .select('id')
      .single()
    
    if (sessionError) {
      console.error('Error creating chat session:', sessionError)
      throw new Error('Failed to create chat session')
    } else {
      currentSessionId = sessionData.id
      console.log('New session created:', currentSessionId)
    }
  }
  
  return currentSessionId
}

export async function storeMessagesToDatabase(
  supabase: any,
  sessionId: string,
  question: string,
  assistantResponse: string
): Promise<void> {
  console.log('Storing messages to database...')
  
  // Store user message
  const { error: userMsgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: question
    })
  
  if (userMsgError) {
    console.error('Error saving user message:', userMsgError)
    throw new Error('Failed to save user message')
  }
  
  // Store assistant message
  const { error: assistantMsgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantResponse
    })
    
  if (assistantMsgError) {
    console.error('Error saving assistant message:', assistantMsgError)
    throw new Error('Failed to save assistant message')
  }
  
  console.log('Messages saved successfully')
}

export async function storeMessages(
  supabase: any,
  sessionId: string | null,
  question: string,
  assistantResponse: string,
  userId: string
): Promise<{ sessionId: string; messageId: string | null }> {
  let messageId: string | null = null
  let currentSessionId = sessionId
  
  // If no session exists yet, create one
  if (!currentSessionId) {
    console.log('Creating new chat session...')
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({ 
        user_id: userId,
        title: question.slice(0, 100) // Use first part of question as title
      })
      .select('id')
      .single()
    
    if (sessionError) {
      console.error('Error creating chat session:', sessionError)
    } else {
      currentSessionId = sessionData.id
      console.log('New session created:', currentSessionId)
    }
  }
  
  // Store user message and assistant response
  if (currentSessionId) {
    console.log('Storing messages to database...')
    
    // Store user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: question
      })
    
    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
    }
    
    // Store assistant message
    const { data: assistantMsgData, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse
      })
      .select('id')
      .single()
      
    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
    } else {
      messageId = assistantMsgData.id
      console.log('Messages saved successfully')
    }
  }
  
  return { sessionId: currentSessionId, messageId }
}
