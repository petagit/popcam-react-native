import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const CONFETTI_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const CONFETTI_COUNT = 50;

interface ConfettiPieceProps {
    startX: number;
    delay: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ startX, delay }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = Math.random() * 8 + 6;

    // Random horizontal sway
    const sway = Math.random() * 40 - 20;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 2000 + Math.random() * 1000,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            })
        ]).start();
    }, [animatedValue, delay]);

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, height + 20],
    });

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, sway],
    });

    const rotate = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${Math.random() * 360 + 360}deg`],
    });

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    left: startX,
                    width: size,
                    height: size,
                    backgroundColor: color,
                    transform: [{ translateY }, { translateX }, { rotate }]
                },
            ]}
        />
    );
};

export const Confetti: React.FC = () => {
    const pieces = Array.from({ length: CONFETTI_COUNT }).map((_, i) => ({
        id: i,
        startX: Math.random() * width,
        delay: Math.random() * 2000,
    }));

    return (
        <View style={styles.container} pointerEvents="none">
            {pieces.map((p) => (
                <ConfettiPiece key={p.id} startX={p.startX} delay={p.delay} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: 10000,
    },
    confetti: {
        position: 'absolute',
        top: 0,
    }
});
