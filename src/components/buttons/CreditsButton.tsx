import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import tw from 'twrnc';
import { useCredits } from '../../hooks/useCredits';

interface CreditsButtonProps {
    variant?: 'glass' | 'minimal';
    style?: any;
    iconColor?: string;
    textColor?: string;
}

export default function CreditsButton({
    variant = 'glass',
    style,
    iconColor,
    textColor,
}: CreditsButtonProps): React.JSX.Element {
    const navigation = useNavigation<any>();
    const { credits, isLoading: creditsLoading } = useCredits();

    const handlePress = () => {
        navigation.navigate('PurchaseCredits');
    };

    if (variant === 'minimal') {
        return (
            <TouchableOpacity
                style={[tw`flex-row items-center`, style]}
                onPress={handlePress}
            >
                <MaterialIcons
                    name="bolt"
                    size={16}
                    color={iconColor || '#4b5563'} // Default gray-600
                    style={tw`mr-1`}
                />
                <Text style={[tw`text-sm font-semibold`, { color: textColor || '#1f2937' }]}>
                    {creditsLoading ? '...' : credits}
                </Text>
            </TouchableOpacity>
        );
    }

    // Default 'glass' variant
    const defaultIconColor = iconColor || '#111827'; // Default gray-900/black
    const defaultTextColor = textColor || '#111827';

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={style}>
            <BlurView
                intensity={25}
                tint="light"
                style={[
                    tw`px-4 py-2 rounded-full flex-row items-center`,
                    {
                        backgroundColor: 'transparent',
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.45)',
                    },
                ]}
            >
                <MaterialIcons
                    name="bolt"
                    size={18}
                    color={defaultIconColor}
                    style={tw`mr-1`}
                />
                {creditsLoading ? (
                    <ActivityIndicator size="small" color={defaultIconColor} />
                ) : (
                    <Text style={[tw`text-sm font-bold`, { color: defaultTextColor }]}>
                        {credits}
                    </Text>
                )}
            </BlurView>
        </TouchableOpacity>
    );
}
