/**
 * Travel Time Service - Calculate travel time between locations
 * TODO: Implement using Google Directions API via edge function
 */

/**
 * Calculate travel time from origin to destination
 * TODO: Implement call to google-directions edge function
 */
export async function calculateTravelTime(
  origin: string,
  destination: string,
  _mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
): Promise<number | null> {
  if (!origin || !destination) return null;

  try {
    // TODO: Implement call to Google Directions API via edge function
    // const { data, error } = await supabase.functions.invoke('google-directions', {
    //   body: { origin, destination, mode },
    // });
    // if (error) throw error;
    // return data.durationMinutes;

    // Placeholder: Return null for now
    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
}
