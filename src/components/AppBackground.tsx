import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AppBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ children, style }) => {
    return (
        <LinearGradient
            colors={['#F5E3CE', '#FFFFFF']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.container, style]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default AppBackground;
