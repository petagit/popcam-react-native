import React from 'react';
import { TouchableOpacity, Text, StyleProp, ViewStyle } from 'react-native';
import tw from 'twrnc';

interface MakeAnotherButtonProps {
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}

const MakeAnotherButton: React.FC<MakeAnotherButtonProps> = ({ onPress, style, disabled }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                tw`w-full bg-black py-4 rounded-xl shadow-md active:bg-gray-900`,
                disabled && tw`opacity-50`,
                style,
            ]}
        >
            <Text style={tw`text-white text-center font-bold text-lg`}>Make Another</Text>
        </TouchableOpacity>
    );
};

export default MakeAnotherButton;
