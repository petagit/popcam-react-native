const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

const r2Config = {
    accountId: 'd52d231773bc0502e01d01a7c879b349',
    accessKeyId: 'd49dda63dd6c39961dcf88435ad45afd',
    secretAccessKey: '6a26f98b9bc965a2da3bec752a484c2907dbcc6ed64c0dbe0c07f790e5bb59a5',
    bucket: 'infographic-images'
};

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
    },
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPhotos(userId) {
    const prefix = `generated/${userId}/`;
    console.log(`Starting corrected sync for user ${userId}...`);

    try {
        const r2command = new ListObjectsV2Command({
            Bucket: r2Config.bucket,
            Prefix: prefix,
        });
        const r2data = await s3Client.send(r2command);
        const r2objects = r2data.Contents || [];
        console.log(`Found ${r2objects.length} photos in R2.`);

        if (r2objects.length === 0) return;

        const { data: existingImages } = await supabase
            .from('generated_images')
            .select('image_url')
            .eq('user_id', userId);

        const indexedUrls = new Set(existingImages?.map(img => img.image_url) || []);
        console.log(`User already has ${indexedUrls.size} indexed images in Supabase.`);

        let addedCount = 0;
        for (const obj of r2objects) {
            const key = obj.Key;
            if (!indexedUrls.has(key)) {
                // Insert into Supabase (OMITTING 'prompt' column as it doesn't exist in DB)
                const { error } = await supabase
                    .from('generated_images')
                    .insert({
                        user_id: userId,
                        image_url: key,
                        created_at: obj.LastModified.toISOString()
                    });

                if (error) {
                    console.error(`Failed to index ${key}:`, error.message);
                } else {
                    addedCount++;
                }
            }
        }

        console.log(`Sync complete! Added ${addedCount} new records to Supabase.`);
    } catch (err) {
        console.error('Sync failed:', err);
    }
}

const userId = 'user_36VcKjvfoOIInvQMUHHCuL7U1am';
syncPhotos(userId);
