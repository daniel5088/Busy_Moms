/**
 * Formats the when_bucket value for display to users.
 * Converts internal snake_case values to user-friendly labels.
 */
export function formatWhenBucketLabel(whenBucket: string | undefined | null): string {
  const bucket = (whenBucket || 'someday').toLowerCase().trim();

  const labelMap: Record<string, string> = {
    very_important: 'Very Important',
    now: 'Now',
    soon: 'Soon',
    someday: 'Someday',
  };

  return labelMap[bucket] || 'Someday';
}
