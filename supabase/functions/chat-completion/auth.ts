
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export async function authenticateUser(authHeader: string | null): Promise<any> {
  if (!authHeader) {
    console.error('Missing Authorization header')
    throw new Error('Missing Authorization header')
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get user from auth token
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  
  if (userError || !user) {
    console.error('Invalid user token:', userError)
    throw new Error('Invalid user token')
  }
  
  console.log('User authenticated:', user.id)
  return { user, supabase }
}
