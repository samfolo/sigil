import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

export const useMapBounds = (
  data: unknown,
  points: Array<{ lat: number; lng: number }>,
  isGeoJSONData: boolean
) => {
  const map = useMap();

  useEffect(() => {
    if (isGeoJSONData) {
      // Calculate bounds from GeoJSON features
      const geojsonLayer = L.geoJSON(data);
      const bounds = geojsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (points.length > 0) {
      // Calculate bounds from lat/lon points
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, data, points, isGeoJSONData]);
}
