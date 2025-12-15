-- FIX V2: Drop Policies FIRST, then Alter Column
-- Postgres prevents altering columns used in policies.
-- We must strip the policies, change the type, and re-apply them.

-- 1. DROP ALL EXISTING POLICIES (Crucial Step)
DROP POLICY IF EXISTS "Users can view their own generated images" ON "generated_images";
DROP POLICY IF EXISTS "Users can insert their own generated images" ON "generated_images";
DROP POLICY IF EXISTS "Users can view their own custom prompts" ON "custom_prompts";
DROP POLICY IF EXISTS "Users can manage their own custom prompts" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable read access for all users" ON "custom_prompts";

-- Variations found in user logs:
DROP POLICY IF EXISTS "Enable insert for authenticated users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable update for authenticated users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable delete for authenticated users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable read access for authenticated users based on user_id" ON "custom_prompts";
DROP POLICY IF EXISTS "Enable select for authenticated users based on user_id" ON "custom_prompts";

-- 2. NOW we can safely alter the columns
ALTER TABLE "public"."custom_prompts" 
  ALTER COLUMN "user_id" TYPE text USING "user_id"::text;

ALTER TABLE "public"."generated_images" 
  ALTER COLUMN "user_id" TYPE text USING "user_id"::text;

-- 3. Re-Create Policies (aligned with TEXT type)

-- Custom Prompts Policies
CREATE POLICY "Users can view their own custom prompts"
ON "public"."custom_prompts"
FOR SELECT
USING ((select auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can manage their own custom prompts"
ON "public"."custom_prompts"
FOR ALL
USING ((select auth.jwt() ->> 'sub') = user_id);

-- Generated Images Policies
CREATE POLICY "Users can view their own generated images"
ON "public"."generated_images"
FOR SELECT
USING ((select auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can insert their own generated images"
ON "public"."generated_images"
FOR INSERT
WITH CHECK ((select auth.jwt() ->> 'sub') = user_id);

-- 4. Ensure RLS is enabled
ALTER TABLE "public"."generated_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_prompts" ENABLE ROW LEVEL SECURITY;
