/**
 * Utility service for calculating and updating travel times for events
 */

import { supabase } from '../lib/supabase';
import type { Event } from '../lib/supabase';
import { getDistanceMatrix } from './googleDirections';

interface TravelTimeUpdateResult {
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * Calculate and update travel times for events with locations
 * Uses Distance Matrix API for batch processing
 */
export async function updateTravelTimesForEvents(
  userId: string,
  defaultAddress: {
    street_address: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
  },
  options: {
    onlyMissing?: boolean; // Only calculate for events without travel times
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    maxEvents?: number; // Limit number of events to process
  } = {}
): Promise<TravelTimeUpdateResult> {
  const result: TravelTimeUpdateResult = {
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Build the origin address string
    const origin = [
      defaultAddress.street_address,
      defaultAddress.city,
      defaultAddress.state_province,
      defaultAddress.postal_code,
      defaultAddress.country,
    ]
      .filter(Boolean)
      .join(', ');

    // Build query
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .not('location', 'is', null)
      .order('event_date', { ascending: true });

    // Apply filters
    if (options.onlyMissing) {
      query = query.is('travel_time_minutes', null);
    }

    if (options.startDate) {
      query = query.gte('event_date', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('event_date', options.endDate);
    }

    if (options.maxEvents) {
      query = query.limit(options.maxEvents);
    }

    const { data: events, error } = await query;

    if (error) {
      result.errors.push(`Failed to fetch events: ${error.message}`);
      return result;
    }

    if (!events || events.length === 0) {
      return result;
    }

    // Filter out events that don't need updating
    const eventsToUpdate = events.filter((event) => {
      if (!event.location) return false;
      if (options.onlyMissing && event.travel_time_minutes !== null) return false;
      return true;
    });

    if (eventsToUpdate.length === 0) {
      return result;
    }

    // Batch process using Distance Matrix API (max 25 destinations per request)
    const batchSize = 25;
    for (let i = 0; i < eventsToUpdate.length; i += batchSize) {
      const batch = eventsToUpdate.slice(i, i + batchSize);
      const destinations = batch
        .map((event) => event.location!)
        .filter((loc) => loc && loc.trim());

      if (destinations.length === 0) continue;

      try {
        // Calculate travel times for batch
        const matrixResult = await getDistanceMatrix({
          origins: [origin],
          destinations,
          mode: 'driving',
        });

        if (matrixResult.status !== 'OK' || !matrixResult.rows.length) {
          result.errors.push(`Distance Matrix API returned status: ${matrixResult.status}`);
          result.failed += batch.length;
          continue;
        }

        const elements = matrixResult.rows[0].elements;

        // Update each event with its travel time
        for (let j = 0; j < batch.length; j++) {
          const event = batch[j];
          const element = elements[j];

          if (element.status === 'OK') {
            const travelMinutes = Math.ceil(element.duration.value / 60);

            const { error: updateError } = await supabase
              .from('events')
              .update({
                travel_time_minutes: travelMinutes,
                travel_time_updated_at: new Date().toISOString(),
              })
              .eq('id', event.id);

            if (updateError) {
              result.errors.push(
                `Failed to update event ${event.id}: ${updateError.message}`
              );
              result.failed++;
            } else {
              result.updated++;
            }
          } else {
            result.failed++;
            result.errors.push(
              `Could not calculate travel time for event "${event.title}": ${element.status}`
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Batch processing failed: ${errorMessage}`);
        result.failed += batch.length;
      }

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < eventsToUpdate.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error: ${errorMessage}`);
    return result;
  }
}

/**
 * Update travel time for a single event
 */
export async function updateTravelTimeForEvent(
  eventId: string,
  origin: string
): Promise<boolean> {
  try {
    // Fetch the event
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !event || !event.location) {
      return false;
    }

    // Calculate travel time
    const matrixResult = await getDistanceMatrix({
      origins: [origin],
      destinations: [event.location],
      mode: 'driving',
    });

    if (
      matrixResult.status !== 'OK' ||
      !matrixResult.rows.length ||
      matrixResult.rows[0].elements[0].status !== 'OK'
    ) {
      return false;
    }

    const element = matrixResult.rows[0].elements[0];
    const travelMinutes = Math.ceil(element.duration.value / 60);

    // Update the event
    const { error: updateError } = await supabase
      .from('events')
      .update({
        travel_time_minutes: travelMinutes,
        travel_time_updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    return !updateError;
  } catch (error) {
    console.error('Error updating travel time for event:', error);
    return false;
  }
}

/**
 * Get events that need travel time updates
 * Useful for finding events with stale travel times
 */
export async function getEventsNeedingTravelTimeUpdate(
  userId: string,
  staleDays: number = 7
): Promise<Event[]> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .not('location', 'is', null)
    .gte('event_date', new Date().toISOString().split('T')[0])
    .or(
      `travel_time_minutes.is.null,travel_time_updated_at.lt.${staleDate.toISOString()}`
    )
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching events needing update:', error);
    return [];
  }

  return events || [];
}
