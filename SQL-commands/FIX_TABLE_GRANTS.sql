-- FIX: Grant Table Permissions
-- Error 42501 "permission denied" often means the role (authenticated)
-- hasn't been granted basic SELECT/INSERT rights on the table.
-- RLS filters rows, but GRANTs allow access to the table itself.

-- 1. Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant access to 'generated_images'
GRANT ALL ON TABLE "public"."generated_images" TO postgres;
GRANT ALL ON TABLE "public"."generated_images" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."generated_images" TO authenticated;
GRANT SELECT ON TABLE "public"."generated_images" TO anon; -- Optional, if you want public read

-- 3. Grant access to 'custom_prompts'
GRANT ALL ON TABLE "public"."custom_prompts" TO postgres;
GRANT ALL ON TABLE "public"."custom_prompts" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."custom_prompts" TO authenticated;

-- 4. Grant access to 'users' (Credits works, but good to be sure)
GRANT ALL ON TABLE "public"."users" TO postgres;
GRANT ALL ON TABLE "public"."users" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."users" TO authenticated;

-- 5. Ensure Sequences are accessible (if you use auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
