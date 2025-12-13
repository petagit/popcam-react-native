import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
    onDismiss?: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    visible,
    message,
    type = 'info',
    onDismiss,
    duration = 3000
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            hideToast();
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 20,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (visible && onDismiss) {
                onDismiss();
            }
        });
    };

    if (!visible && (fadeAnim as any)._value === 0) return null;

    const getIconName = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'error';
            default: return 'info';
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-800';
        }
    };

    return (
        <Animated.View
            style={[
                tw`absolute bottom-24 left-5 right-5 z-50 rounded-xl shadow-lg flex-row items-center px-4 py-3`,
                tw`${getBackgroundColor()}`,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <MaterialIcons name={getIconName()} size={24} color="white" style={tw`mr-3`} />
            <Text style={tw`text-white font-medium flex-1`} numberOfLines={2}>
                {message}
            </Text>
        </Animated.View>
    );
};
