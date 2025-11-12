import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="add-property" />
      <Stack.Screen name="add-cleaner" />
    </Stack>
  );
}
