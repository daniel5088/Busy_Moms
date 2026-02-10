import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
// @ts-ignore
import { Cloud, SunIcon as Sun, ZapIcon as Zap } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { useTheme } from '../../hooks/useTheme';
import { useWeather } from '../../hooks/useWeather';

export function WeatherWidget() {
  const { theme } = useTheme();
  const { data: weather, isLoading, error } = useWeather();

  const getWeatherIcon = (weatherCode: number) => {
    const iconColor = theme.colors.text.secondary;
    const iconSize = 32;

    // Clear
    if (weatherCode === 0) return <Sun color={iconColor} size={iconSize} />;

    // Thunderstorm
    if (weatherCode >= 95) return <Zap color={iconColor} size={iconSize} />;

    // Default: Cloud
    return <Cloud color={iconColor} size={iconSize} />;
  };

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary.main} />
      </Card>
    );
  }

  if (error || !weather?.current) {
    return (
      <Card style={styles.container}>
        <Text style={[styles.errorText, { color: theme.colors.text.secondary }]}>
          Weather unavailable
        </Text>
      </Card>
    );
  }

  const { current, location } = weather;

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getWeatherIcon(current.weather_code)}
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.temperature, { color: theme.colors.text.primary }]}>
            {Math.round(current.temperature)}°
          </Text>
          <Text style={[styles.condition, { color: theme.colors.text.secondary }]}>
            {current.condition}
          </Text>
          {location && (
            <Text style={[styles.location, { color: theme.colors.text.tertiary }]}>
              {location.name}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 28,
    fontWeight: '600',
  },
  condition: {
    fontSize: 14,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
