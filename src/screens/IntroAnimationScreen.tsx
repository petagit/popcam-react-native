import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, StatusBar, Text, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
    withDelay,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { AppBackground } from '../components/AppBackground';
import AuthModal from '../components/AuthModal';
import tw from 'twrnc';

// Import local assets securely
// Using require for static assets in React Native
const images = [
    require('../../assets/preset-image/preset-model.png'),
    require('../../assets/preset-image/preset-model2.png'),
    require('../../assets/preset-image/preset-model3.png'),
    require('../../assets/preset-image/preset-model4.png'),
    require('../../assets/preset-image/preset-model5.png'),
    require('../../assets/preset-image/preset-model6.png'),
    require('../../assets/preset-image/preset-model7.png'),
    require('../../assets/preset-image/preset-model8.png'),
];

const { width, height } = Dimensions.get('window');
// Increase width to cover rotation
const CONTAINER_WIDTH = width * 1.8; // Slightly wider for 3 columns
const COLUMN_WIDTH = CONTAINER_WIDTH / 3;
const IMAGE_HEIGHT = width * 0.6; // Smaller images
const GAP = 15;

// Duplicate images to have enough content for 3 columns
const allImages = [...images, ...images];

type IntroAnimationNavigationProp = StackNavigationProp<RootStackParamList, 'IntroAnimation'>;

export default function IntroAnimationScreen(): React.JSX.Element {
    const navigation = useNavigation<IntroAnimationNavigationProp>();
    const [modalVisible, setModalVisible] = React.useState(false);

    // Initial positions: off-screen
    const translateYCol1 = useSharedValue(-height * 1.5);
    const translateYCol2 = useSharedValue(height * 1.5);
    const translateYCol3 = useSharedValue(-height * 1.5);

    useEffect(() => {
        const duration = 2500;
        const easing = Easing.out(Easing.exp);

        // Animate to center (0) with stagger
        translateYCol1.value = withDelay(0, withTiming(0, { duration, easing }));
        translateYCol2.value = withDelay(200, withTiming(0, { duration, easing }));
        translateYCol3.value = withDelay(400, withTiming(0, { duration, easing }));
    }, []);

    const handleStartPress = () => {
        setModalVisible(true);
    };

    const animatedStyleCol1 = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateYCol1.value }],
        };
    });

    const animatedStyleCol2 = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateYCol2.value }],
        };
    });

    const animatedStyleCol3 = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateYCol3.value }],
        };
    });

    const col1Images = allImages.filter((_, i) => i % 3 === 0);
    const col2Images = allImages.filter((_, i) => i % 3 === 1);
    const col3Images = allImages.filter((_, i) => i % 3 === 2);

    return (
        <AppBackground style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            {/* Rotated Container */}
            <View style={styles.contentContainer}>
                <View style={styles.columnsContainer}>
                    {/* Column 1 - Slide Down */}
                    <Animated.View style={[styles.column, animatedStyleCol1]}>
                        {col1Images.map((img, index) => (
                            <View key={`col1-${index}`} style={styles.imageContainer}>
                                <Image source={img} style={styles.image} resizeMode="cover" />
                            </View>
                        ))}
                    </Animated.View>

                    {/* Column 2 - Slide Up */}
                    <Animated.View style={[styles.column, animatedStyleCol2]}>
                        {col2Images.map((img, index) => (
                            <View key={`col2-${index}`} style={styles.imageContainer}>
                                <Image source={img} style={styles.image} resizeMode="cover" />
                            </View>
                        ))}
                    </Animated.View>

                    {/* Column 3 - Slide Down */}
                    <Animated.View style={[styles.column, animatedStyleCol3]}>
                        {col3Images.map((img, index) => (
                            <View key={`col3-${index}`} style={styles.imageContainer}>
                                <Image source={img} style={styles.image} resizeMode="cover" />
                            </View>
                        ))}
                    </Animated.View>
                </View>
            </View>

            {/* Title Overlay */}
            <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                <View style={styles.textContainer}>
                    <Image
                        source={require('../../assets/loading-animation.gif')}
                        style={styles.loadingLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>POPCAM</Text>
                    <Text style={styles.subtitle}>AI Photo for everyone.</Text>
                </View>

                {/* Start Button */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={handleStartPress} activeOpacity={0.8}>
                        <View style={styles.button}>
                            <Text style={styles.buttonText}>Start!</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <AuthModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        // Rotate the entire container of columns
        transform: [{ rotate: '-30deg' }, { scale: 1.2 }],
    },
    columnsContainer: {
        width: CONTAINER_WIDTH,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: GAP,
    },
    column: {
        width: COLUMN_WIDTH - GAP,
        flexDirection: 'column',
        gap: GAP,
    },
    imageContainer: {
        width: '100%',
        height: IMAGE_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.3)', // Slight overlay to make text pop
    },
    textContainer: {
        alignItems: 'center',
    },
    loadingLogo: {
        width: 120,
        height: 120,
        marginBottom: 10,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#1a1a1a',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 18,
        color: '#333',
        marginTop: 8,
        fontWeight: '500',
    },
    buttonContainer: {
        marginTop: 50,
        alignSelf: 'center',
    },
    button: {
        backgroundColor: '#000',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
