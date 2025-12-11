-- Enable update for users based on user_id
create policy "Enable update for users based on user_id"
on "public"."custom_prompts"
as permissive
for update
to public
using ((auth.uid()::text = user_id))
with check ((auth.uid()::text = user_id));

-- Fallback for anon if using client-side generated IDs without auth.uid() matching exactly, 
-- or if the user is not authenticated in the way RLS expects but we want to allow it for this app's logic.
-- Given the app uses 'anon' key often:
CREATE POLICY "Enable update for anon users"
ON "public"."custom_prompts"
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Ensure permission is granted
GRANT UPDATE ON TABLE "public"."custom_prompts" TO anon;
GRANT UPDATE ON TABLE "public"."custom_prompts" TO authenticated;
