import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { sharedStyles, spacing } from '../styles/sharedStyles';

export interface GlassButtonProps {
  size?: number;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  size = 48,
  onPress,
  style,
  intensity = 30,
  children,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={style}>
      <BlurView intensity={intensity} tint="light" style={[
        sharedStyles.glassCircleBase,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: 'transparent' },
      ]}>
        {children}
      </BlurView>
    </TouchableOpacity>
  );
};

export default GlassButton;


