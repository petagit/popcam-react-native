-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Enable insert for anon users" ON "public"."custom_prompts";
DROP POLICY IF EXISTS "Enable select for anon users" ON "public"."custom_prompts";

-- Re-create policies
CREATE POLICY "Enable insert for anon users"
ON "public"."custom_prompts"
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Enable select for anon users"
ON "public"."custom_prompts"
FOR SELECT
TO anon
USING (true);

-- Ensure RLS is enabled
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;
