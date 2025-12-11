import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../constants/config';
import { imageUtils } from '../utils/imageUtils';

class R2Service {
    private s3Client: S3Client | null = null;
    private bucketName: string;
    private publicUrlBase: string;

    constructor() {
        this.bucketName = ENV.R2_BUCKET_NAME;
        this.publicUrlBase = `https://${ENV.R2_BUCKET_NAME}.${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`; // Fallback/Internal URL
        // Note: Usually R2 has a custom domain or a specific public URL format.
        // Ideally, the user provides a PUBLIC_URL_BASE env var. 
        // For now, we'll try to construct or rely on the user mapped domain if they have one.
        // Or we returns the key and let the app decide. 
        // Let's assume we return a URL that IS accessible if the bucket is public or we use presigned (but user wants storage).
        // R2 usually requires a custom domain for public access or a worker. 
        // We will assume a standard custom domain pattern or public R2 dev URL for now.
        // Actually, asking the user for a Public URL Base would be best, but let's stick to storing the KEY/Path mostly, 
        // or constructing a probable URL.
    }

    private getClient(): S3Client {
        if (this.s3Client) return this.s3Client;

        if (!ENV.R2_ACCESS_KEY_ID || !ENV.R2_SECRET_ACCESS_KEY || !ENV.R2_ACCOUNT_ID) {
            console.warn('R2 credentials missing');
            throw new Error('R2 credentials not configured');
        }

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: ENV.R2_ACCESS_KEY_ID,
                secretAccessKey: ENV.R2_SECRET_ACCESS_KEY,
            },
        });

        return this.s3Client;
    }

    async uploadImage(localUri: string, userId: string): Promise<string | null> {
        try {
            const client = this.getClient();
            // Use fetch to get blob directly, avoiding Buffer polyfill issues
            const response = await fetch(localUri);
            const blob = await response.blob();

            const fileName = `generated/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: blob,
                ContentType: 'image/jpeg',
            });

            await client.send(command);

            // Return the key or a constructed URL. 
            // If the user hasn't set up a custom domain, they might need to viewing it via signed URL or public bucket.
            // We'll return the Key prefixed with a marker so we know it's R2, or a public URL if configured.
            // Let's assume there is an EXPO_PUBLIC_R2_PUBLIC_DOMAIN if they have one, otherwise we might be stuck.
            // For now, let's return the key and we can construct a URL or use a presigned URL for viewing if private.
            // But typically for an app feature like this, a public bucket or value is expected.

            // Let's try to assume a standard R2 dev domain or let the user fix the domain later.
            // We will return the S3 Key and handle "viewing" logic?
            // Actually simpler: Return the full public URL if we can.

            const publicDomain = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;
            if (publicDomain) {
                return `${publicDomain}/${fileName}`;
            }

            return fileName; // Return key if no domain known
        } catch (error) {
            console.error('Error uploading to R2:', error);
            return null;
        }
    }
}

export const r2Service = new R2Service();
