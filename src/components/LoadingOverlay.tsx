import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, Animated, Modal, StyleSheet } from 'react-native';
import tw from 'twrnc';
import { BlurView } from 'expo-blur';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
    useModal?: boolean;
}

export default function LoadingOverlay({ visible, message = 'Creating Magic...', useModal = true }: LoadingOverlayProps): React.JSX.Element | null {
    const [progress, setProgress] = useState(0);
    const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (visible) {
            // Reset progress
            setProgress(0);

            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Simulate progress
            interval = setInterval(() => {
                setProgress((prev) => {
                    // Fast at first, then slower as it reaches 90%
                    if (prev < 30) return prev + 2;
                    if (prev < 60) return prev + 1;
                    if (prev < 90) return prev + 0.5;
                    return prev;
                });
            }, 100);
        } else {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [visible]);

    if (!visible && progress === 0) return null;

    const content = (
        <Animated.View style={[tw`absolute inset-0 items-center justify-center bg-black/60 z-50`, { opacity: fadeAnim }, !useModal && StyleSheet.absoluteFill]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

            <View style={tw`items-center justify-center w-64`}>
                {/* Custom Loading Animation */}
                <Image
                    source={require('../../assets/loading-animation.gif')}
                    style={{ width: 120, height: 120, marginBottom: 20 }}
                    resizeMode="contain"
                />

                {/* Progress Bar Container */}
                <View style={tw`w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4`}>
                    {/* Animated Progress Fill */}
                    <View
                        style={[
                            tw`h-full bg-purple-500 rounded-full`,
                            { width: `${progress}%` }
                        ]}
                    />
                </View>

                {/* Status Message */}
                <Text style={tw`text-white font-bold text-lg text-center tracking-wide shadow-lg`}>
                    {message}
                </Text>
                <Text style={tw`text-gray-300 text-xs mt-1 font-medium`}>
                    {Math.round(progress)}%
                </Text>
            </View>
        </Animated.View>
    );

    if (useModal) {
        return (
            <Modal transparent visible={visible} animationType="none">
                {content}
            </Modal>
        );
    }

    return content;
}
