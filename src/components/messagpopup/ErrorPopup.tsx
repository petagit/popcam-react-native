import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface ErrorPopupProps {
    visible: boolean;
    message?: string;
    onRetry: () => void;
    onCancel: () => void;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
    visible,
    message = "Oops, I think the internet is broken. Please try again",
    onRetry,
    onCancel,
}) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={tw`w-4/5 overflow-hidden rounded-3xl`}>
                    <BlurView intensity={80} tint="dark" style={tw`p-6 items-center border border-white/20`}>
                        <View style={tw`bg-red-500/20 p-3 rounded-full mb-4`}>
                            <MaterialIcons name="cloud-off" size={32} color="#f87171" />
                        </View>

                        <Text style={tw`text-white text-lg font-bold text-center mb-2`}>
                            Connection Issue
                        </Text>

                        <Text style={tw`text-gray-300 text-sm text-center mb-6`}>
                            {message}
                        </Text>

                        <View style={tw`w-full gap-3`}>
                            <TouchableOpacity
                                onPress={onRetry}
                                style={tw`bg-white py-3 rounded-xl items-center shadow-lg`}
                            >
                                <Text style={tw`text-black font-bold`}>Try Again</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onCancel}
                                style={tw`bg-white/10 py-3 rounded-xl items-center border border-white/10`}
                            >
                                <Text style={tw`text-white font-medium`}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ErrorPopup;
