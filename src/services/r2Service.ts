import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../constants/config';

class R2Service {
    private s3Client: S3Client | null = null;
    private bucketName: string;
    private publicUrlBase: string;
    // Simple cache to avoid re-signing constantly: Key -> { url, expiry }
    private urlCache: Map<string, { url: string; expiresAt: number }> = new Map();

    constructor() {
        this.bucketName = ENV.R2_BUCKET_NAME;
        this.publicUrlBase = `https://${ENV.R2_BUCKET_NAME}.${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
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
            const response = await fetch(localUri);
            const arrayBuffer = await response.arrayBuffer();

            const fileName = `generated/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: new Uint8Array(arrayBuffer),
                ContentType: 'image/jpeg',
            });

            await client.send(command);

            // Return the key. We don't return full URL here anymore because it might need signing.
            // The caller should ideally just store the key, OR we return a signed URL for immediate use?
            // Existing logic expected a "viewable" string. 
            // If we return just the key, `NanoBananaResult` might fail if it expects a URL. 
            // But `NanoBananaResult` uses localResultUri for display mostly.
            // The return value was used for `custom_prompts.thumbnail_url`.
            // Storing the KEY in DB is best practice.
            return fileName;
        } catch (error) {
            console.error('Error uploading to R2:', error);
            return null;
        }
    }

    /**
     * Resolves a path (key) to a usable URL. 
     * If public domain is set, returns public URL (synchronous).
     * If not, returns a Presigned URL (async).
     */
    async resolveUrl(path: string | undefined): Promise<string | null> {
        if (!path) return null;
        const isSignedUrl = path.includes('X-Amz-Signature') || path.includes('Expires=');

        // If it's a signed URL, it might be expired. Try to extract the key to re-sign.
        if (path.startsWith('http')) {
            if (isSignedUrl) {
                try {
                    // Start after the domain (roughly). R2/S3 URLs are usually /BUCKET/KEY or HOST/KEY.
                    // Our R2 URL: https://BUCKET.ACCOUNT.r2..../KEY
                    const urlObj = new URL(path);
                    const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
                    // Proceed to re-sign this key
                    path = decodeURIComponent(key);
                } catch (e) {
                    console.warn('Failed to extract key from signed URL, returning as is', e);
                    return path;
                }
            } else {
                return path; // Static/Public URL, return as is
            }
        }

        if (path.startsWith('file://')) return path;

        const publicDomain = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;
        if (publicDomain) {
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            const cleanDomain = publicDomain.endsWith('/') ? publicDomain.substring(0, publicDomain.length - 1) : publicDomain;
            return `${cleanDomain}/${cleanPath}`;
        }

        // Generate Presigned URL
        try {
            // Check cache first
            const cached = this.urlCache.get(path);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.url;
            }

            // Generate new
            const client = this.getClient();
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: path,
            });

            // Expires in 1 hour (3600s)
            const url = await getSignedUrl(client, command, { expiresIn: 3600 });

            // Cache it (expires in 55 mins to be safe)
            this.urlCache.set(path, { url, expiresAt: Date.now() + 55 * 60 * 1000 });

            return url;
        } catch (error) {
            console.error('Error signing URL:', error);
            return null;
        }
    }

    // Deprecated synchronous helper - will only work if public domain is set
    getPublicUrlSync(path: string | undefined): string | undefined {
        if (!path) return undefined;
        if (path.startsWith('http') || path.startsWith('file://')) return path;

        const publicDomain = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;
        if (publicDomain) {
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            const cleanDomain = publicDomain.endsWith('/') ? publicDomain.substring(0, publicDomain.length - 1) : publicDomain;
            return `${cleanDomain}/${cleanPath}`;
        }
        // If no public domain, return undefined or key? Return undefined to signal "need async resolution"
        return undefined;
    }
}

export const r2Service = new R2Service();
