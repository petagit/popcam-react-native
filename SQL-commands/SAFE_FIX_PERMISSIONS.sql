-- SAFE FIX for "Permission denied" (Error 42501)
-- This script only ADDS the permission. It does not delete anything.

CREATE POLICY "Users can view their own generated images"
ON "public"."generated_images"
FOR SELECT
USING ( (select auth.jwt() ->> 'sub') = user_id );

-- Verify the fix
SELECT * FROM pg_policies WHERE tablename = 'generated_images';
