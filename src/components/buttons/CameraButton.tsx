import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { BlurView } from 'expo-blur';
import { sharedStyles } from '../../styles/sharedStyles';

interface CameraButtonProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function CameraButton({
  onPress,
  size = 'medium',
  style
}: CameraButtonProps): React.JSX.Element {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return tw`w-8 h-8`;
      case 'medium':
        return tw`w-10 h-10`;
      case 'large':
        return tw`w-14 h-14`;
      default:
        return tw`w-10 h-10`;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'medium':
        return 22;
      case 'large':
        return 28;
      default:
        return 22;
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <BlurView intensity={30} tint="light" style={[
        sharedStyles.glassCircleBase,
        tw`rounded-full`,
        getSizeStyles(),
        { backgroundColor: 'transparent' },
        style,
      ]}>
        <MaterialIcons name="photo-camera" size={getIconSize()} color="#111827" />
      </BlurView>
    </TouchableOpacity>
  );
} 