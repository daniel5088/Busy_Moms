/**
 * EventWeatherIcon - Display weather icon for events within 7 days
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
// @ts-ignore - Weather icons not in type definitions
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { useEventWeather } from '../../hooks/useEventWeather';

interface EventWeatherIconProps {
  event: Event;
  size?: number;
  showText?: boolean;
}

export function EventWeatherIcon({ event, size = 16, showText = false }: EventWeatherIconProps) {
  const { theme } = useTheme();
  const { data: weather, isLoading } = useEventWeather(event);

  if (isLoading) {
    return <ActivityIndicator size="small" color={theme.colors.text.tertiary} />;
  }

  if (!weather) {
    return null;
  }

  // Map weather code to icon
  const getWeatherIcon = () => {
    const code = weather.weatherCode;

    if (code >= 95) {
      return <CloudLightning size={size} color={theme.colors.text.secondary} />;
    }

    if (code >= 71 && code <= 77) {
      return <CloudSnow size={size} color={theme.colors.text.secondary} />;
    }

    if (code >= 51 && code <= 67) {
      return <CloudRain size={size} color={theme.colors.text.secondary} />;
    }

    if (code >= 2 && code <= 3) {
      return <Cloud size={size} color={theme.colors.text.secondary} />;
    }

    return <Sun size={size} color={theme.colors.text.secondary} />;
  };

  const getTemperatureDisplay = () => {
    if (weather.temperature) {
      return `${Math.round(weather.temperature)}°`;
    }
    if (weather.temperatureMax && weather.temperatureMin) {
      return `${Math.round(weather.temperatureMin)}-${Math.round(weather.temperatureMax)}°`;
    }
    return weather.condition;
  };

  return (
    <View style={styles.container}>
      {getWeatherIcon()}
      {showText && (
        <Text style={[styles.text, { color: theme.colors.text.secondary }]}>
          {getTemperatureDisplay()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 12,
  },
});
