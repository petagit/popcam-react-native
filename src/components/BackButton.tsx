import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import GlassButton from './GlassButton';

interface BackButtonProps {
    onPress?: () => void;
    style?: any;
    color?: string;
}

export default function BackButton({
    onPress,
    style,
    color = "#111827"
}: BackButtonProps): React.JSX.Element {
    const navigation = useNavigation();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <GlassButton size={40} onPress={handlePress} style={style}>
            <MaterialIcons name="arrow-back" size={20} color={color} />
        </GlassButton>
    );
}
