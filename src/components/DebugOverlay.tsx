import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Switch,
    ScrollView,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import tw from 'twrnc';
import { BlurView } from 'expo-blur';

type DebugNavigationProp = StackNavigationProp<RootStackParamList>;

const DEBUG_EMAIL = 'Petazfeng@gmail.com';

const SCREENS: { name: keyof RootStackParamList; label: string }[] = [
    { name: 'Home', label: 'Home (User)' },
    { name: 'Camera', label: 'Camera' },
    { name: 'Gallery', label: 'Gallery' },
    { name: 'Settings', label: 'Settings' },
    { name: 'NanoBanana', label: 'Nano Banana' },
    { name: 'NanoBananaResult', label: 'NB Result' },
    { name: 'NanoBananaResult', label: 'PREVIEW LOADING' },
    { name: 'PurchaseCredits', label: 'Credits' },
    { name: 'Splash', label: 'Splash' },
    { name: 'Landing', label: 'Landing' },
];

export const DebugOverlay = () => {
    const { user } = useUser();
    const navigation = useNavigation<DebugNavigationProp>();
    const [isDebugOpen, setIsDebugOpen] = useState(false);

    // Check if user is the authorized debug user
    const isDebugUser = user?.emailAddresses.some(
        (email) => email.emailAddress.toLowerCase() === DEBUG_EMAIL.toLowerCase()
    );

    if (!isDebugUser) return null;

    return (
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
            <View style={styles.container} pointerEvents="box-none">
                {isDebugOpen && (
                    <View style={styles.menuContainer}>
                        <BlurView intensity={80} tint="dark" style={tw`rounded-2xl overflow-hidden p-4`}>
                            <Text style={tw`text-white font-bold mb-3 text-center`}>Debug Navigation</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`gap-2`}
                            >
                                {SCREENS.map((screen) => (
                                    <TouchableOpacity
                                        key={screen.name}
                                        style={tw`bg-white/20 px-4 py-2 rounded-full border border-white/30`}
                                        onPress={() => {
                                            if (screen.label === 'PREVIEW LOADING') {
                                                navigation.navigate('NanoBananaResult', {
                                                    presetTitle: 'Debug Promo',
                                                    presetId: 'debug',
                                                    debugLoading: true,
                                                    referenceImageUri: 'https://images.unsplash.com/photo-1550258114-b83030364969?auto=format&fit=crop&q=80&w=1000'
                                                });
                                            } else {
                                                // @ts-ignore - Some screens might require params but we're debugging
                                                navigation.navigate(screen.name);
                                            }
                                            setIsDebugOpen(false);
                                        }}
                                    >
                                        <Text style={tw`text-white text-xs font-medium`}>{screen.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </BlurView>
                    </View>
                )}

                <View style={styles.toggleRow}>
                    <BlurView intensity={60} tint="light" style={styles.togglePill}>
                        <Text style={tw`text-gray-800 text-xs font-bold mr-2`}>DEBUG MODE</Text>
                        <Switch
                            value={isDebugOpen}
                            onValueChange={setIsDebugOpen}
                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                            thumbColor={isDebugOpen ? '#f5dd4b' : '#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                        />
                    </BlurView>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'flex-end',
    },
    menuContainer: {
        marginBottom: 12,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    togglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
});
