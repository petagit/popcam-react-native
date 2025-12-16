import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableWithoutFeedback, Text } from 'react-native';
import Svg, { Defs, Rect, Mask } from 'react-native-svg';
import { useOnboarding } from './OnboardingContext';

const { width, height } = Dimensions.get('window');

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const OnboardingOverlay: React.FC = () => {
    const { isActive, currentStep, targets, nextStep, stopOnboarding } = useOnboarding();
    const fadeAnim = useRef(new Animated.Value(0)).current; // Global overlay fade
    const pulseAnim = useRef(new Animated.Value(0)).current;

    // Per-step animations
    const stepSvgAnim = useRef(new Animated.Value(0)).current; // For SVG (useNativeDriver: false)
    const stepViewAnim = useRef(new Animated.Value(0)).current; // For Views (useNativeDriver: true)

    useEffect(() => {
        if (isActive && currentStep !== 'IDLE' && currentStep !== 'COMPLETED') {
            // Global Overlay Fade In (only once usually, but ensures it's visible)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Reset per-step animations
            stepSvgAnim.setValue(0);
            stepViewAnim.setValue(0);

            // Animate Step Fade In
            Animated.parallel([
                Animated.timing(stepSvgAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: false, // SVG limitation
                }),
                Animated.timing(stepViewAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start();

            // Pulse Animation Loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            // Fade out everything
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
            pulseAnim.setValue(0);
        }
    }, [isActive, currentStep, fadeAnim, pulseAnim, stepSvgAnim, stepViewAnim]);

    if (!isActive || currentStep === 'IDLE' || currentStep === 'COMPLETED') return null;

    // Don't show overlay for final confetti step
    if (currentStep === 'CONFETTI') return null;

    const target = targets[currentStep];

    const targetX = target ? target.x : 0;
    const targetY = target ? target.y : 0;
    const targetW = target ? target.width : 0;
    const targetH = target ? target.height : 0;

    // Instructions based on step
    let instruction = '';
    switch (currentStep) {
        case 'NANO_BANANA_BUTTON':
            instruction = 'Tap here to get started with Nano Banana!';
            break;
        case 'PICK_FILTER':
            instruction = 'Choose a filter style you like.';
            break;
        case 'TAKE_PICTURE':
            instruction = 'Take a selfie or upload a photo to see the magic!';
            break;
    }

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
            {/* SVG Mask */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg height="100%" width="100%">
                    <Defs>
                        <Mask id="mask" x="0" y="0" height="100%" width="100%">
                            <Rect height="100%" width="100%" fill="#fff" />
                            {target && (
                                <AnimatedRect
                                    x={targetX - 5}
                                    y={targetY - 5}
                                    width={targetW + 10}
                                    height={targetH + 10}
                                    rx={10}
                                    ry={10}
                                    fill="#000"
                                    opacity={stepSvgAnim}
                                />
                            )}
                        </Mask>
                    </Defs>
                    <Rect
                        height="100%"
                        width="100%"
                        fill="rgba(0,0,0,0.7)"
                        mask="url(#mask)"
                    />
                </Svg>
            </View>

            {/* Pulsing Glowing Circle */}
            {target && (
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            top: targetY - 10,
                            left: targetX - 10,
                            width: targetW + 20,
                            height: targetH + 20,
                            // Adjust shape based on step
                            borderRadius: currentStep === 'PICK_FILTER' ? 24 : Math.min(targetW, targetH) / 2 + 10,
                            opacity: Animated.multiply(
                                stepViewAnim,
                                pulseAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.6, 1],
                                })
                            ),
                            transform: [{
                                scale: pulseAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.1],
                                })
                            }, {
                                perspective: 1000
                            }]
                        }
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* Instruction Text */}
            {target && (
                <Animated.View style={[
                    styles.tooltip,
                    {
                        top: height / 2 - 60, // approximate center
                        alignSelf: 'center',
                        opacity: stepViewAnim
                    }
                ]}>
                    <Text style={styles.text}>{instruction}</Text>
                    {/* Debug/Skip button */}
                    <TouchableWithoutFeedback onPress={stopOnboarding}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableWithoutFeedback>
                </Animated.View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999, // very high
        elevation: 9999,
    },
    tooltip: {
        position: 'absolute',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        width: width * 0.8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    skipText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    pulseRing: {
        position: 'absolute',
        borderWidth: 4,
        borderColor: 'white',
        shadowColor: "white",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 10000,
    }
});
