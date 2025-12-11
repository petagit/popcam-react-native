-- Enable delete for anon users
CREATE POLICY "Enable delete for anon users"
ON "public"."custom_prompts"
FOR DELETE
TO anon
USING (true);

-- Ensure permission is granted
GRANT DELETE ON TABLE "public"."custom_prompts" TO anon;
