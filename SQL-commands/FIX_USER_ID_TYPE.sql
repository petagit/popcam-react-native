-- FIX: Change user_id columns from UUID to TEXT
-- Clerk IDs (e.g., 'user_2wn...') are strings, not UUIDs.
-- This script alters the columns to accept text.

-- 1. Alter custom_prompts table
ALTER TABLE "public"."custom_prompts" 
  ALTER COLUMN "user_id" TYPE text USING "user_id"::text;

-- 2. Alter generated_images table
ALTER TABLE "public"."generated_images" 
  ALTER COLUMN "user_id" TYPE text USING "user_id"::text;

-- 3. Alter users table (if used for credits)
ALTER TABLE "public"."users" 
  ALTER COLUMN "id" TYPE text;

-- 4. Re-enable RLS (Good practice, just in case)
ALTER TABLE "public"."generated_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- 5. Final Policy Check (Ensuring policies use text comparison)
-- We drop and recreate just to be safe and clean.

DROP POLICY IF EXISTS "Users can view their own generated images" ON "generated_images";
CREATE POLICY "Users can view their own generated images"
ON "public"."generated_images"
FOR SELECT
USING ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "Users can insert their own generated images" ON "generated_images";
CREATE POLICY "Users can insert their own generated images"
ON "public"."generated_images"
FOR INSERT
WITH CHECK ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "Users can view their own custom prompts" ON "custom_prompts";
CREATE POLICY "Users can view their own custom prompts"
ON "public"."custom_prompts"
FOR SELECT
USING ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "Users can manage their own custom prompts" ON "custom_prompts";
CREATE POLICY "Users can manage their own custom prompts"
ON "public"."custom_prompts"
FOR ALL
USING ((select auth.jwt() ->> 'sub') = user_id);
