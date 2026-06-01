'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { fetchIssPosition, IssPosition } from '@/lib/iss';

const POLL_INTERVAL_MS = 5000;
const ANIMATION_DURATION_MS = 1000;

/** Threshold (degrees) above which we skip animation and snap the marker */
const ANTIMERIDIAN_THRESHOLD = 180;

// ── Inner component: lives inside MapContainer so useMap() works ──────────────
function IssMarkerLayer() {
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
      } catch (err) {
        // Swallow fetch errors so the interval keeps running; #11 handles stale UI
        console.error('[IssMarkerLayer] fetch failed:', err);
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
  }, [map]);

  return null;
}

// ── Public component ──────────────────────────────────────────────────────────
export default function IssMap() {
  return (
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
      <IssMarkerLayer />
    </MapContainer>
  );
}
