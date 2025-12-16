import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ViewStyle, TextStyle } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { colors, spacing } from '../../styles/sharedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import GlassButton from './GlassButton';


type SignOutButtonNavigationProp = StackNavigationProp<RootStackParamList>;

interface SignOutButtonProps {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  iconOnly?: boolean;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  iconOnly = false,
}): React.JSX.Element => {
  const { signOut } = useClerk();
  const navigation = useNavigation<SignOutButtonNavigationProp>();

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      // Navigation will be handled automatically by the auth state change
    } catch (err: any) {
      console.error('Sign out error:', JSON.stringify(err, null, 2));
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const getButtonStyle = (): ViewStyle[] => {
    const variantStyles: ViewStyle = variant === 'primary'
      ? styles.primaryButton
      : variant === 'secondary'
        ? styles.secondaryButton
        : styles.textButton;

    const sizeStyles: ViewStyle = size === 'small'
      ? styles.smallButton
      : size === 'large'
        ? styles.largeButton
        : styles.mediumButton;

    return [styles.button, variantStyles, sizeStyles];
  };

  const getTextStyle = (): TextStyle[] => {
    const variantStyles: TextStyle = variant === 'primary'
      ? styles.primaryButtonText
      : variant === 'secondary'
        ? styles.secondaryButtonText
        : styles.textButtonText;

    const sizeStyles: TextStyle = size === 'small'
      ? styles.smallButtonText
      : size === 'large'
        ? styles.largeButtonText
        : styles.mediumButtonText;

    return [styles.buttonText, variantStyles, sizeStyles];
  };

  if (iconOnly) {
    // Match BackButton style: size 40 default, using GlassButton
    const buttonSize = size === 'small' ? 36 : size === 'large' ? 48 : 40;

    return (
      <GlassButton size={buttonSize} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={20} color={colors.danger} />
      </GlassButton>
    );
  }

  return (
    <TouchableOpacity style={getButtonStyle()} onPress={handleSignOut}>
      <Text style={getTextStyle()}>Sign Out</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  primaryButton: {
    backgroundColor: colors.danger,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  textButton: {
    backgroundColor: 'transparent',
  },
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mediumButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  largeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.surface,
  },
  secondaryButtonText: {
    color: colors.danger,
  },
  textButtonText: {
    color: colors.danger,
  },
  smallButtonText: {
    fontSize: 14,
  },
  mediumButtonText: {
    fontSize: 16,
  },
  largeButtonText: {
    fontSize: 18,
  },
});

export default SignOutButton; 