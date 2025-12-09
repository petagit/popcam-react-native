import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { colors, spacing, shadows } from '../styles/sharedStyles';

interface UserProfileSectionProps {
  style?: any;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ style }): React.JSX.Element | null => {
  const { user } = useUser();

  if (!user) return null;

  const getUserDisplayName = (): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.fullName) {
      return user.fullName;
    }
    return user.emailAddresses[0]?.emailAddress || 'User';
  };

  const getUserEmail = (): string => {
    return user.emailAddresses[0]?.emailAddress || '';
  };

  const getProfileImage = (): string | undefined => {
    return user.imageUrl;
  };

  const getAuthProvider = (): string => {
    // Check if user signed in with Google
    const externalAccounts = user.externalAccounts || [];
    const googleAccount = externalAccounts.find(account => account.provider === 'google');
    
    if (googleAccount) {
      return 'Google';
    }
    
    // Check for other OAuth providers
    if (externalAccounts.length > 0) {
      return externalAccounts[0].provider || 'OAuth';
    }
    
    return 'Email';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.profileInfo}>
        {getProfileImage() && (
          <Image source={{ uri: getProfileImage() }} style={styles.profileImage} />
        )}
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{getUserDisplayName()}</Text>
          <Text style={styles.profileEmail}>{getUserEmail()}</Text>
          <Text style={styles.authProvider}>Signed in with {getAuthProvider()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    ...shadows.small,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.md,
    backgroundColor: colors.placeholder,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  authProvider: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
}); 