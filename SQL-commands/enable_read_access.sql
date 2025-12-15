-- Enable read access for users to their own generated images
-- Corrected to handle text-based User IDs (like Clerk IDs) by reading from the JWT directly

CREATE POLICY "Users can view their own generated images"
ON "public"."generated_images"
FOR SELECT
USING ( (select auth.jwt() ->> 'sub') = user_id );

-- Verify it was created
SELECT * FROM pg_policies WHERE tablename = 'generated_images';
