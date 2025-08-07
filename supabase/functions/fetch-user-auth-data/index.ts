import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the request is from an authenticated admin user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    console.log(`User authenticated: ${user.id}`)

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (adminError || !adminCheck) {
      throw new Error('Admin access required')
    }

    console.log(`Admin verification successful for user: ${user.id}`)

    // Fetch auth data for all users
    const { data: authUsers, error: authError2 } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError2) {
      console.error('Error fetching auth users:', authError2)
      throw authError2
    }

    // Map to simple structure with user ID and last sign in
    const userAuthData = authUsers.users.map(authUser => ({
      id: authUser.id,
      lastSignInAt: authUser.last_sign_in_at || null
    }))

    console.log(`Successfully fetched auth data for ${userAuthData.length} users`)

    return new Response(
      JSON.stringify({ 
        users: userAuthData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in fetch-user-auth-data function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})