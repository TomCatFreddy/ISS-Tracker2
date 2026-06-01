export interface IssPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

export async function fetchIssPosition(): Promise<IssPosition> {
  const response = await fetch('/api/iss', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ISS position: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (
    data === null ||
    typeof data !== 'object' ||
    typeof (data as Record<string, unknown>).latitude !== 'number' ||
    typeof (data as Record<string, unknown>).longitude !== 'number' ||
    typeof (data as Record<string, unknown>).altitude !== 'number' ||
    typeof (data as Record<string, unknown>).velocity !== 'number' ||
    typeof (data as Record<string, unknown>).timestamp !== 'number'
  ) {
    throw new Error('ISS API response has unexpected shape');
  }

  const position = data as Record<string, unknown>;

  return {
    latitude: position.latitude as number,
    longitude: position.longitude as number,
    altitude: position.altitude as number,
    velocity: position.velocity as number,
    timestamp: position.timestamp as number,
  };
}
