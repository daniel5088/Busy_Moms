import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../src/hooks/useTheme';

/**
 * Index route - serves as a loading screen
 * AuthGuard in _layout.tsx handles all routing logic
 */
export default function Index() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ActivityIndicator size="large" color={theme.colors.primary.main} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
