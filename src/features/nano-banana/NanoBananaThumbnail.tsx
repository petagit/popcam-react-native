import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, ImageSourcePropType } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { r2Service } from '../../services/r2Service';

interface NanoBananaThumbnailProps {
    thumbnailUrl?: string; // This could be a full URL, a file path, or an R2 key
    imageSource?: ImageSourcePropType; // For standard presets that use local assets (require(...))
    promptText: string;
}

/**
 * Extracts filename from URL for logging
 */
const getFilename = (url?: string | null) => url ? url.split('/').pop()?.split('?')[0] : 'null';

export const NanoBananaThumbnail: React.FC<NanoBananaThumbnailProps> = ({ thumbnailUrl, imageSource, promptText }) => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<boolean>(false);
    
    // Track the last thumbnailUrl we processed to detect changes
    const lastProcessedUrlRef = useRef<string | undefined>(undefined);

    // #region agent log
    console.log('[DEBUG-Thumb] Render:', getFilename(thumbnailUrl), 'uri:', getFilename(imageUri), 'loading:', isLoading, 'error:', loadError);
    // #endregion

    useEffect(() => {
        // If we have a static image source, skip URL resolution
        if (imageSource) {
            setIsLoading(false);
            return;
        }

        // Skip if no thumbnailUrl
        if (!thumbnailUrl) {
            setImageUri(null);
            setIsLoading(false);
            return;
        }

        // Check if thumbnailUrl actually changed (not just a re-render)
        const urlChanged = thumbnailUrl !== lastProcessedUrlRef.current;
        
        // #region agent log
        console.log('[DEBUG-Thumb] Effect - url:', getFilename(thumbnailUrl), 'changed:', urlChanged, 'prev:', getFilename(lastProcessedUrlRef.current));
        // #endregion

        // If URL changed, reset state and process new URL
        if (urlChanged) {
            lastProcessedUrlRef.current = thumbnailUrl;
            setLoadError(false);
            setIsLoading(true);
        }

        let cancelled = false;

        const resolveAndSetUrl = async () => {
            try {
                // If it's already a usable http/https URL, use directly
                // If it's a file:// URL, use directly
                // Otherwise, resolve via r2Service
                let finalUrl: string | null = null;

                if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
                    finalUrl = thumbnailUrl;
                } else if (thumbnailUrl.startsWith('file://')) {
                    finalUrl = thumbnailUrl;
                } else {
                    // It's probably an R2 key, resolve it
                    finalUrl = await r2Service.resolveUrl(thumbnailUrl);
                }

                // #region agent log
                console.log('[DEBUG-Thumb] Resolved:', getFilename(thumbnailUrl), '->', getFilename(finalUrl));
                // #endregion

                if (!cancelled && finalUrl) {
                    setImageUri(finalUrl);
                } else if (!cancelled) {
                    setLoadError(true);
                }
            } catch (error) {
                console.error('[NanoBananaThumbnail] Failed to resolve URL:', error);
                if (!cancelled) {
                    setLoadError(true);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        resolveAndSetUrl();

        return () => {
            cancelled = true;
        };
    }, [thumbnailUrl, imageSource]);

    // Render static image source (for built-in presets)
    if (imageSource) {
        return (
            <Image
                source={imageSource}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
            />
        );
    }

    // Render loading state
    if (isLoading) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-100`}>
                <ActivityIndicator size="small" color="#9ca3af" />
            </View>
        );
    }

    // Render image if we have a valid URI and no error
    if (imageUri && !loadError) {
        // #region agent log
        console.log('[DEBUG-Thumb] Rendering Image:', getFilename(imageUri), 'fullUri:', imageUri.substring(0, 100));
        // #endregion

        return (
            <Image
                key={imageUri}
                source={{ 
                    uri: imageUri,
                    // Note: removed cache:'reload' and query param as they may cause issues with R2
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoad={() => {
                    // #region agent log
                    console.log('[DEBUG-Thumb] Image LOADED OK:', getFilename(imageUri));
                    // #endregion
                }}
                onError={(e) => {
                    // #region agent log
                    console.log('[DEBUG-Thumb] Image load ERROR:', getFilename(imageUri), 'uri:', imageUri, 'error:', e.nativeEvent?.error);
                    // #endregion
                    setLoadError(true);
                }}
            />
        );
    }

    // Fallback view when no image or error occurred
    return (
        <View style={tw`flex-1 items-center justify-center p-2 bg-gray-50`}>
            <MaterialIcons name="auto-fix-high" size={24} color="#9ca3af" />
            <Text numberOfLines={2} style={tw`text-xs text-center text-gray-500 mt-1`}>
                {promptText}
            </Text>
        </View>
    );
};
