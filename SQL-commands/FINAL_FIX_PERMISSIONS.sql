-- FINAL FIX for "Permission denied for table generated_images" (Error 42501)
-- Run this ENTIRE block in your Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE "public"."generated_images" ENABLE ROW LEVEL SECURITY;

-- 2. Drop the policy if it exists (to avoid conflicts/duplicates)
DROP POLICY IF EXISTS "Users can view their own generated images" ON "public"."generated_images";

-- 3. Create the correct policy using text-based ID comparison
CREATE POLICY "Users can view their own generated images"
ON "public"."generated_images"
FOR SELECT
USING ( (select auth.jwt() ->> 'sub') = user_id );

-- Verify it was created
SELECT * FROM pg_policies WHERE tablename = 'generated_images';
