import { APP_CONFIG } from '../constants/config';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface ImageProcessingResult {
  base64: string;
  uri: string;
  width: number;
  height: number;
  size: number;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const imageUtils = {
  /**
   * Convert image URI to base64 string for OpenAI API
   */
  async convertToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data:image/...;base64, prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Download and save an image locally to device storage
   */
  async saveImageLocally(imageUrl: string, fileName?: string): Promise<string> {
    const primaryDir: string | null = FileSystem.documentDirectory ?? null;
    const fallbackDir: string | null = FileSystem.cacheDirectory && FileSystem.cacheDirectory !== primaryDir
      ? FileSystem.cacheDirectory
      : null;

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);

    const parseDataUrl = (dataUrl: string): { base64: string; mimeType?: string } => {
      const parts = dataUrl.split(',', 2);
      if (parts.length < 2) {
        throw new Error('Invalid data URL format');
      }
      const meta = parts[0];
      const base64 = parts[1].replace(/\s/g, '');
      const mimeMatch = meta.match(/^data:(.*?)(;|")/);
      const mimeType = mimeMatch?.[1];
      return { base64, mimeType };
    };

    const getExtensionFromMime = (mimeType?: string): string | null => {
      if (!mimeType) return null;
      if (mimeType.includes('png')) return 'png';
      if (mimeType.includes('webp')) return 'webp';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
      if (mimeType.includes('gif')) return 'gif';
      return null;
    };

    const dataUrlPayload = imageUrl.startsWith('data:') ? parseDataUrl(imageUrl) : null;
    const derivedExtension = dataUrlPayload ? getExtensionFromMime(dataUrlPayload.mimeType) : null;
    const fallbackExtension = imageUrl.startsWith('http') ? imageUrl.split('?')[0].split('.').pop() : null;
    const finalExtension = (fileName?.split('.').pop() || derivedExtension || fallbackExtension || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';

    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : `infographic_${timestamp}_${randomId}`;
    const buildFileName = (dir: string): { fileNameWithExt: string; uri: string } => {
      const resolvedFileName = `${baseName}.${finalExtension}`;
      return { fileNameWithExt: resolvedFileName, uri: `${dir}${resolvedFileName}` };
    };

    const base64Encoding = ((FileSystem as unknown as { EncodingType?: { Base64?: string } })?.EncodingType?.Base64 ?? 'base64') as FileSystem.EncodingType;

    const directoriesToTry: string[] = [primaryDir, fallbackDir].filter(Boolean) as string[];

    if (directoriesToTry.length === 0) {
      if (Platform.OS === 'web') {
        // Expo web cannot write to the file system; return the original data URL or remote URL.
        return imageUrl;
      }
      throw new Error('Failed to save image locally: no writable directory available');
    }
    const attemptErrors: string[] = [];

    for (const directory of directoriesToTry) {
      try {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
      } catch (_) {
        // ignore directory creation failures; it may already exist or be read-only
      }

      const { uri } = buildFileName(directory);

      try {
        if (dataUrlPayload) {
          await FileSystem.writeAsStringAsync(uri, dataUrlPayload.base64, {
            encoding: base64Encoding,
          });
        } else {
          const downloadResult = await FileSystem.downloadAsync(imageUrl, uri);
          if (downloadResult.status !== 200) {
            throw new Error(`Failed to download image: HTTP ${downloadResult.status}`);
          }
        }

        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          attemptErrors.push(`File not found after save at ${uri}`);
          continue;
        }

        console.log('Image saved locally:', uri);
        return uri;
      } catch (innerError) {
        const message = innerError instanceof Error ? innerError.message : 'Unknown error';
        attemptErrors.push(`${directory}: ${message}`);
      }
    }

    const combinedMessage = attemptErrors.length > 0 ? attemptErrors.join(' | ') : 'Unknown error';
    throw new Error(`Failed to save image locally: ${combinedMessage}`);
  },

  /**
   * Copy an existing local image to the app's permanent storage
   */
  async copyImageToAppStorage(sourceUri: string, fileName?: string): Promise<string> {
    try {
      // Generate unique filename if not provided
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const finalFileName = fileName || `photo_${timestamp}_${randomId}.jpg`;
      
      // Use document directory for permanent storage
      const destinationUri = `${FileSystem.documentDirectory}${finalFileName}`;
      
      // Copy the file
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri
      });
      
      // Verify the file was copied successfully
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to copy image - file does not exist after copy');
      }
      
      console.log('Image copied to app storage:', destinationUri);
      return destinationUri;
    } catch (error) {
      console.error('Error copying image to app storage:', error);
      throw new Error(`Failed to copy image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Validate image file size and format
   */
  validateImage(imageUri: string, fileSize?: number): ValidationResult {
    // Check file extension
    const fileExtension = imageUri.split('.').pop()?.toLowerCase();
    const supportedFormats = APP_CONFIG.SUPPORTED_FORMATS as readonly string[];
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Unsupported file format. Supported formats: ${APP_CONFIG.SUPPORTED_FORMATS.join(', ')}`
      };
    }

    // Check file size if provided
    if (fileSize && fileSize > APP_CONFIG.MAX_IMAGE_SIZE) {
      return {
        isValid: false,
        error: `File size too large. Maximum size: ${Math.round(APP_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024)}MB`
      };
    }

    return { isValid: true };
  },

  /**
   * Generate a unique ID for image analysis
   */
  generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Get image dimensions from URI
   */
  async getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      image.src = imageUri;
    });
  },

  /**
   * Create a thumbnail URI for display
   */
  createThumbnail(imageUri: string, size: number = 150): string {
    // In a real app, you might want to implement actual image resizing
    // For now, we'll return the original URI
    // You could use expo-image-manipulator for actual resizing
    return imageUri;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Extract filename from URI
   */
  getFilenameFromUri(uri: string): string {
    const segments = uri.split('/');
    return segments[segments.length - 1] || 'unknown';
  },

  /**
   * Check if URI is a valid image
   */
  isValidImageUri(uri: string): boolean {
    if (!uri) return false;
    
    // Check if it starts with file://, http://, https://, or data:
    const validProtocols = /^(file:\/\/|https?:\/\/|data:image\/)/;
    return validProtocols.test(uri);
  },

  /**
   * Delete a local image file
   */
  async deleteLocalImage(imageUri: string): Promise<void> {
    try {
      // Only delete files in our app's document directory
      if (!imageUri.includes(FileSystem.documentDirectory || '')) {
        console.log('Skipping deletion of non-app file:', imageUri);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(imageUri);
        console.log('Deleted local image:', imageUri);
      }
    } catch (error) {
      console.error('Error deleting local image:', error);
      // Don't throw error for cleanup operations
    }
  },

  /**
   * Get information about app's local storage usage
   */
  async getStorageInfo(): Promise<{totalFiles: number; totalSize: number}> {
    try {
      const appDir = FileSystem.documentDirectory;
      if (!appDir) {
        return { totalFiles: 0, totalSize: 0 };
      }

      const files = await FileSystem.readDirectoryAsync(appDir);
      let totalSize = 0;
      let totalFiles = 0;

      for (const file of files) {
        try {
          const filePath = `${appDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && !fileInfo.isDirectory) {
            totalSize += fileInfo.size || 0;
            totalFiles++;
          }
        } catch (fileError) {
          console.warn('Error reading file info:', fileError);
        }
      }

      return { totalFiles, totalSize };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  },

  /**
   * Clean up orphaned image files (files not referenced by any analysis)
   */
  async cleanupOrphanedFiles(referencedFiles: string[]): Promise<void> {
    try {
      const appDir = FileSystem.documentDirectory;
      if (!appDir) return;

      const files = await FileSystem.readDirectoryAsync(appDir);
      
      for (const file of files) {
        const filePath = `${appDir}${file}`;
        
        // Skip if this file is referenced by an analysis
        const isReferenced = referencedFiles.some(ref => ref.includes(file));
        if (isReferenced) continue;

        // Only delete image files (not other app files)
        const isImageFile = /\.(jpg|jpeg|png|gif)$/i.test(file);
        if (!isImageFile) continue;

        try {
          await FileSystem.deleteAsync(filePath);
          console.log('Cleaned up orphaned file:', filePath);
        } catch (deleteError) {
          console.warn('Failed to delete orphaned file:', deleteError);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  },

  /**
   * Check if a local image file exists and is accessible
   */
  async verifyLocalImage(imageUri: string): Promise<{exists: boolean; isAccessible: boolean}> {
    try {
      if (!imageUri) {
        return { exists: false, isAccessible: false };
      }

      // For remote URLs, assume they're accessible (we'll handle errors in UI)
      if (imageUri.startsWith('http') || imageUri.startsWith('data:')) {
        return { exists: true, isAccessible: true };
      }

      // For local files, check if they exist
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { exists: false, isAccessible: false };
      }

      // Additional check: try to read a small portion to verify file isn't corrupted
      try {
        // Just check if we can get file info without errors
        const size = fileInfo.size || 0;
        const isAccessible = size > 0; // File exists and has content
        return { exists: true, isAccessible };
      } catch (accessError) {
        return { exists: true, isAccessible: false };
      }
    } catch (error) {
      console.error('Error verifying local image:', error);
      return { exists: false, isAccessible: false };
    }
  },

  /**
   * Get a safe image URI with fallback for missing files
   */
  async getSafeImageUri(imageUri: string, fallbackUri?: string): Promise<string | null> {
    try {
      const verification = await this.verifyLocalImage(imageUri);
      
      if (verification.exists && verification.isAccessible) {
        return imageUri;
      }
      
      // If main image is not accessible, try fallback
      if (fallbackUri) {
        const fallbackVerification = await this.verifyLocalImage(fallbackUri);
        if (fallbackVerification.exists && fallbackVerification.isAccessible) {
          return fallbackUri;
        }
      }
      
      // No accessible image found
      console.warn('No accessible image found:', { imageUri, fallbackUri });
      return null;
    } catch (error) {
      console.error('Error getting safe image URI:', error);
      return null;
    }
  },
}; 
