-- Add secondary_image_url column to custom_prompts table
-- This is required for the "Custom Prompt with Reference Image" feature

ALTER TABLE "public"."custom_prompts"
ADD COLUMN IF NOT EXISTS "secondary_image_url" text;

-- Verify it was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'custom_prompts';
