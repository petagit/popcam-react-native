-- Command to view ALL policies on the generated_images table
-- Run this in the Supabase SQL Editor and copy the results

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'generated_images';
