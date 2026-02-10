/**
 * Skeleton component - animated placeholder for loading states
 */

import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle, type DimensionValue } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const skeletonStyle: ViewStyle = {
    height,
    width: width as DimensionValue,
    borderRadius,
    backgroundColor: theme.colors.gray[300],
  };

  return (
    <Animated.View
      style={[
        skeletonStyle,
        { opacity },
        style,
      ]}
    />
  );
}
