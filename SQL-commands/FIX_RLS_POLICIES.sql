-- FIX RLS: Re-Apply Policies
-- The migration to TEXT worked (invalid syntax error is gone).
-- But now "Permission Denied" means the policies are missing or blocking.
-- This script explicitly re-creates the policies.

-- 1. Generated Images
ALTER TABLE "public"."generated_images" ENABLE ROW LEVEL SECURITY;

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


-- 2. Custom Prompts
ALTER TABLE "public"."custom_prompts" ENABLE ROW LEVEL SECURITY;

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
