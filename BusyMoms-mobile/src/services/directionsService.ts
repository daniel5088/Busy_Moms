/**
 * Directions Service - Open native maps app with directions
 */

import { Linking, Platform } from 'react-native';

/**
 * Open native maps app with directions to a location
 */
export async function openDirections(
  destination: string,
  origin?: string
): Promise<void> {
  try {
    let url: string;

    if (Platform.OS === 'ios') {
      // Apple Maps URL scheme
      const encodedDestination = encodeURIComponent(destination);
      const encodedOrigin = origin ? encodeURIComponent(origin) : '';

      if (encodedOrigin) {
        url = `http://maps.apple.com/?saddr=${encodedOrigin}&daddr=${encodedDestination}`;
      } else {
        url = `http://maps.apple.com/?daddr=${encodedDestination}`;
      }
    } else {
      // Google Maps URL scheme for Android
      const encodedDestination = encodeURIComponent(destination);
      const encodedOrigin = origin ? encodeURIComponent(origin) : '';

      if (encodedOrigin) {
        url = `google.navigation:q=${encodedDestination}&saddr=${encodedOrigin}`;
      } else {
        url = `google.navigation:q=${encodedDestination}`;
      }
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error('Cannot open maps app');
    }
  } catch (error) {
    console.error('Error opening directions:', error);
  }
}
