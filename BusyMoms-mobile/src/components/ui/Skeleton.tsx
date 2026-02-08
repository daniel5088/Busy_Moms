/**
 * Skeleton component - animated placeholder for loading states
 */

import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';
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
    borderRadius,
    backgroundColor: theme.colors.gray[300],
  };

  // Handle width separately to satisfy TypeScript
  if (typeof width === 'number') {
    skeletonStyle.width = width;
  } else {
    skeletonStyle.width = width as any;
  }

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
