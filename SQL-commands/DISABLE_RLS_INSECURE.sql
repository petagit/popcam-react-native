-- INSECURE "DEV MODE" FIX
-- This disables security checks entirely.
-- ADVANTAGE: No JWT setup required. The app will work immediately.
-- DISADVANTAGE: Anyone with your public key can read/write ALL data.

-- 1. Disable security on the tables
ALTER TABLE "public"."generated_images" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_prompts" DISABLE ROW LEVEL SECURITY;

-- 2. (Optional) If you want to keep security ON but allow all access:
-- CREATE POLICY "Allow All" ON "public"."generated_images" FOR ALL USING (true);
