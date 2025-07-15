-- Create a specific policy for public registration setting that allows unauthenticated access
CREATE POLICY "Anyone can view public registration setting" 
ON public.configurations 
FOR SELECT 
USING (key = 'allow_public_registration');

-- Drop the existing broad policy if it conflicts
DROP POLICY IF EXISTS "Anyone can view configurations" ON public.configurations;