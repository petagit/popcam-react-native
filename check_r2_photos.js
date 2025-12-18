const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const r2Config = {
    accountId: 'd52d231773bc0502e01d01a7c879b349',
    accessKeyId: 'd49dda63dd6c39961dcf88435ad45afd',
    secretAccessKey: '6a26f98b9bc965a2da3bec752a484c2907dbcc6ed64c0dbe0c07f790e5bb59a5',
    bucket: 'pop-cam-output-images'
};

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
    },
});

async function listUserPhotos(userId) {
    const prefix = `generated/${userId}/`;
    console.log(`Listing objects in R2 bucket [${r2Config.bucket}] with prefix: ${prefix}`);

    try {
        const command = new ListObjectsV2Command({
            Bucket: r2Config.bucket,
            Prefix: prefix,
        });

        const data = await s3Client.send(command);
        const contents = data.Contents || [];

        console.log(`Found ${contents.length} objects for user ${userId}.`);
        contents.forEach((obj, i) => {
            console.log(`[${i + 1}] Key: ${obj.Key} | Size: ${obj.Size} | LastModified: ${obj.LastModified}`);
        });

        if (contents.length === 0) {
            console.log('No objects found with this prefix.');
        }
    } catch (err) {
        console.error('Error listing R2 objects:', err);
    }
}

const userId = 'user_36VcKjvfoOIInvQMUHHCuL7U1am';
listUserPhotos(userId);
