import React, { useState, useCallback } from 'react';
import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '@clerk/clerk-expo';
import tw from 'twrnc';
import GlassButton from './GlassButton';
import { storageService } from '../../services/storageService';
import { ImageAnalysis } from '../../types';

interface GalleryThumbnailButtonProps {
    onPress: () => void;
    isDark?: boolean;
}

/**
 * A specialized GlassButton that displays the most recent gallery generation as a thumbnail.
 * It automatically refreshes when the screen comes into focus.
 */
export const GalleryThumbnailButton: React.FC<GalleryThumbnailButtonProps> = ({
    onPress,
    isDark
}) => {
    const { user } = useUser();
    const [imageUri, setImageUri] = useState<string | null>(null);

    const uiTint = isDark ? 'light' : 'dark';
    const iconColor = isDark ? '#111827' : '#FFFFFF';

    const loadLastGalleryImage = useCallback(async () => {
        try {
            const analyses: ImageAnalysis[] = await storageService.getResolvedAnalyses(user?.id);

            // Filter to only show analyses with AI generations
            const infographicAnalyses: ImageAnalysis[] = analyses.filter(
                (analysis: ImageAnalysis) => analysis.hasInfographic && analysis.infographicUri
            );

            if (infographicAnalyses.length > 0) {
                setImageUri(infographicAnalyses[0].infographicUri!);
            } else {
                setImageUri(null);
            }
        } catch (error) {
            console.error('[GalleryThumbnailButton] Error loading last gallery image:', error);
            setImageUri(null);
        }
    }, [user?.id]);

    // Refresh whenever the screen is focused
    useFocusEffect(
        useCallback(() => {
            loadLastGalleryImage();
        }, [loadLastGalleryImage])
    );

    return (
        <GlassButton size={64} onPress={onPress} tint={uiTint}>
            {imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={[tw`rounded-full`, { width: 52, height: 52 }]}
                    resizeMode="cover"
                />
            ) : (
                <MaterialIcons name="auto-awesome" size={28} color={iconColor} />
            )}
        </GlassButton>
    );
};

export default GalleryThumbnailButton;
