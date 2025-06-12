
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export async function authenticateUser(req: Request, supabase: any): Promise<any> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    console.error('Missing Authorization header')
    throw new Error('Missing Authorization header')
  }
  
  console.log('Authorization header found, extracting token...')
  
  // Get user from auth token
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  
  if (userError || !user) {
    console.error('Invalid user token:', userError)
    throw new Error('Invalid user token')
  }
  
  console.log('User authenticated successfully:', user.id)
  return user
}
