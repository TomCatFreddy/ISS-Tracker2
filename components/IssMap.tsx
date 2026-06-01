'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { fetchIssPosition, IssPosition } from '@/lib/iss';

const POLL_INTERVAL_MS = 5000;
const ANIMATION_DURATION_MS = 1000;

/** Threshold (degrees) above which we skip animation and snap the marker */
const ANTIMERIDIAN_THRESHOLD = 180;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLat(lat: number): string {
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(3)}° ${dir}`;
}

function formatLon(lon: number): string {
  const dir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(3)}° ${dir}`;
}

// ── Inner component: lives inside MapContainer so useMap() works ──────────────

interface IssMarkerLayerProps {
  onPosition: (pos: IssPosition) => void;
  onError: () => void;
}

function IssMarkerLayer({ onPosition, onError }: IssMarkerLayerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const positionRef = useRef<IssPosition | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    // Create the emoji divIcon
    const issIcon = L.divIcon({
      html: '🛰️',
      className: 'iss-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    /**
     * Animate the marker from its current lat/lng to the new one.
     * If the longitude jump exceeds the antimeridian threshold, snap instead.
     */
    function animateTo(newPos: IssPosition) {
      const marker = markerRef.current;
      if (!marker) return;

      const oldLatLng = marker.getLatLng();
      const newLat = newPos.latitude;
      const newLon = newPos.longitude;

      // Antimeridian guard: snap instead of animate
      if (Math.abs(newLon - oldLatLng.lng) > ANTIMERIDIAN_THRESHOLD) {
        marker.setLatLng([newLat, newLon]);
        return;
      }

      // Cancel any in-progress animation
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const startLat = oldLatLng.lat;
      const startLon = oldLatLng.lng;
      const deltaLat = newLat - startLat;
      const deltaLon = newLon - startLon;
      const startTime = performance.now();

      function step(now: number) {
        if (!mounted) return;
        const elapsed = now - startTime;
        const t = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
        // Ease in-out cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const lat = startLat + deltaLat * ease;
        const lon = startLon + deltaLon * ease;
        markerRef.current?.setLatLng([lat, lon]);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    }

    async function poll() {
      if (!mounted) return;
      try {
        const pos = await fetchIssPosition();
        if (!mounted) return;

        if (!markerRef.current) {
          // First fetch: create the marker
          const marker = L.marker([pos.latitude, pos.longitude], {
            icon: issIcon,
          }).addTo(map);
          markerRef.current = marker;
        } else {
          animateTo(pos);
        }

        positionRef.current = pos;
        onPosition(pos);
      } catch (err) {
        console.error('[IssMarkerLayer] fetch failed:', err);
        onError();
      }
    }

    // Fetch immediately on mount, then every POLL_INTERVAL_MS
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, onPosition, onError]);

  return null;
}

// ── Readout overlay ───────────────────────────────────────────────────────────

interface ReadoutOverlayProps {
  position: IssPosition | null;
  isStale: boolean;
}

function ReadoutOverlay({ position, isStale }: ReadoutOverlayProps) {
  return (
    <div
      className="absolute top-3 left-3 z-[1000] pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-lg px-4 py-3 min-w-[180px]">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-slate-400 text-xs font-medium tracking-widest uppercase">
            ISS
          </span>
          {isStale && (
            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Reconnecting
            </span>
          )}
        </div>

        {position === null ? (
          <p className="text-slate-400 text-sm tabular-nums">
            Acquiring ISS position…
          </p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-400 text-sm">Lat</dt>
            <dd className="text-slate-100 text-sm tabular-nums font-mono">
              {formatLat(position.latitude)}
            </dd>

            <dt className="text-slate-400 text-sm">Lon</dt>
            <dd className="text-slate-100 text-sm tabular-nums font-mono">
              {formatLon(position.longitude)}
            </dd>

            <dt className="text-slate-400 text-sm">Alt</dt>
            <dd className="text-slate-100 text-sm tabular-nums font-mono">
              {position.altitude.toFixed(1)} km
            </dd>

            <dt className="text-slate-400 text-sm">Vel</dt>
            <dd className="text-slate-100 text-sm tabular-nums font-mono">
              {position.velocity.toFixed(0)} km/h
            </dd>
          </dl>
        )}
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function IssMap() {
  const [position, setPosition] = useState<IssPosition | null>(null);
  const [isStale, setIsStale] = useState(false);

  function handlePosition(pos: IssPosition) {
    setPosition(pos);
    setIsStale(false);
  }

  function handleError() {
    setIsStale(true);
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        worldCopyJump={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <IssMarkerLayer onPosition={handlePosition} onError={handleError} />
      </MapContainer>

      <ReadoutOverlay position={position} isStale={isStale} />
    </div>
  );
}
