import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import tw from 'twrnc';
import { RootStackParamList } from '../types';

type SplashNavigation = StackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashSwatchScreen(): React.JSX.Element {
  const navigation = useNavigation<SplashNavigation>();

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('Landing');
    }, 850);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={tw`flex-1 items-center justify-center`}>
      <StatusBar style="dark" backgroundColor="#F5E3CE" />
      <View style={[tw`absolute inset-0`, { backgroundColor: '#F5E3CE' }]} />
      <Text style={tw`text-4xl font-extrabold text-gray-900`}>POPCAM</Text>
    </View>
  );
}

