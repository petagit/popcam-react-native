-- Grant table permissions
GRANT ALL ON TABLE "public"."custom_prompts" TO anon;
GRANT ALL ON TABLE "public"."custom_prompts" TO service_role;
GRANT ALL ON TABLE "public"."custom_prompts" TO authenticated;

-- Just in case
ALTER TABLE "public"."custom_prompts" ENABLE ROW LEVEL SECURITY;
