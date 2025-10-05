'use client';

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapBounds } from '@/lib/useMapBounds';

// Fix for default marker icons in react-leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  data: unknown;
}

const isGeoJSON = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;

  // Check for GeoJSON FeatureCollection
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return true;
  }

  // Check for GeoJSON Feature
  if (data.type === 'Feature' && data.geometry) {
    return true;
  }

  // Check for GeoJSON Geometry
  if (data.type && data.coordinates &&
      ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(data.type)) {
    return true;
  }

  return false;
}

const extractLatLonPoints = (data: unknown): Array<{ lat: number; lng: number; label?: string }> => {
  const points: Array<{ lat: number; lng: number; label?: string }> = [];

  // Handle arrays
  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      const point = extractSinglePoint(item);
      if (point) {
        points.push({ ...point, label: `Point ${idx + 1}` });
      }
    });
  } else {
    const point = extractSinglePoint(data);
    if (point) {
      points.push(point);
    }
  }

  return points;
}

const extractSinglePoint = (item: unknown): { lat: number; lng: number } | null => {
  if (!item || typeof item !== 'object') return null;

  // Common field name variations
  const latFields = ['lat', 'latitude', 'Lat', 'Latitude'];
  const lngFields = ['lng', 'lon', 'long', 'longitude', 'Lng', 'Lon', 'Long', 'Longitude'];

  let lat: number | undefined;
  let lng: number | undefined;

  for (const field of latFields) {
    if (field in item && typeof item[field] === 'number') {
      lat = item[field];
      break;
    }
  }

  for (const field of lngFields) {
    if (field in item && typeof item[field] === 'number') {
      lng = item[field];
      break;
    }
  }

  if (lat !== undefined && lng !== undefined &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }

  return null;
}

const calculateCenter = (data: unknown): [number, number] => {
  // For GeoJSON, try to calculate bounds
  if (isGeoJSON(data)) {
    // Default to world center
    return [20, 0];
  }

  // For lat/lon data
  const points = extractLatLonPoints(data);
  if (points.length > 0) {
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return [avgLat, avgLng];
  }

  // Default center
  return [20, 0];
}

const MapContent = ({ data, isGeoJSONData, points }: {
  data: unknown;
  isGeoJSONData: boolean;
  points: Array<{ lat: number; lng: number; label?: string }>;
}) => {
  useMapBounds(data, points, isGeoJSONData);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {isGeoJSONData ? (
        <GeoJSON
          data={data}
          pointToLayer={(feature, latlng) => {
            return L.marker(latlng, { icon });
          }}
        />
      ) : (
        points.map((point, idx) => (
          <Marker key={idx} position={[point.lat, point.lng]} icon={icon}>
            <Popup>
              {point.label || `Location`}
              <br />
              Lat: {point.lat.toFixed(6)}, Lng: {point.lng.toFixed(6)}
            </Popup>
          </Marker>
        ))
      )}
    </>
  );
}

export const MapView = ({ data }: MapViewProps) => {
  const center = calculateCenter(data);
  const isGeoJSONData = isGeoJSON(data);
  const points = !isGeoJSONData ? extractLatLonPoints(data) : [];

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContent data={data} isGeoJSONData={isGeoJSONData} points={points} />
      </MapContainer>
    </div>
  );
};
