import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import GlassButton from '../GlassButton';

interface SettingsButtonProps {
    onPress?: () => void;
    style?: any;
    color?: string;
    size?: number; // Keep size prop for flexibility, but default will match BackButton
}

export default function SettingsButton({
    onPress,
    style,
    color = "#111827",
    size = 40
}: SettingsButtonProps): React.JSX.Element {
    const navigation = useNavigation<any>();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.navigate('Settings');
        }
    };

    return (
        <GlassButton size={size} onPress={handlePress} style={style}>
            <MaterialIcons name="settings" size={size / 2} color={color} />
        </GlassButton>
    );
}
