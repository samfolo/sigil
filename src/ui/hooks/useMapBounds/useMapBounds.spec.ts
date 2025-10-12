import {renderHook} from '@testing-library/react';
import L from 'leaflet';
import {useMap} from 'react-leaflet';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import {useMapBounds} from './useMapBounds';

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  useMap: vi.fn()
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    geoJSON: vi.fn(),
    latLngBounds: vi.fn()
  }
}));

describe('useMapBounds', () => {
  const mockFitBounds = vi.fn();
  const mockMap = {
    fitBounds: mockFitBounds
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMap).mockReturnValue(mockMap);
  });

  it('should fit bounds for GeoJSON data', () => {
    const mockBounds = {
      isValid: vi.fn().mockReturnValue(true)
    };
    const mockGeoJSONLayer = {
      getBounds: vi.fn().mockReturnValue(mockBounds)
    };

    vi.mocked(L.geoJSON).mockReturnValue(mockGeoJSONLayer as L.GeoJSON);

    const geojsonData = {
      type: 'FeatureCollection',
      features: []
    };

    renderHook(() => useMapBounds(geojsonData, [], true));

    expect(L.geoJSON).toHaveBeenCalledWith(geojsonData);
    expect(mockGeoJSONLayer.getBounds).toHaveBeenCalled();
    expect(mockBounds.isValid).toHaveBeenCalled();
    expect(mockFitBounds).toHaveBeenCalledWith(mockBounds, {padding: [50, 50]});
  });

  it('should not fit bounds for invalid GeoJSON bounds', () => {
    const mockBounds = {
      isValid: vi.fn().mockReturnValue(false)
    };
    const mockGeoJSONLayer = {
      getBounds: vi.fn().mockReturnValue(mockBounds)
    };

    vi.mocked(L.geoJSON).mockReturnValue(mockGeoJSONLayer as L.GeoJSON);

    const geojsonData = {
      type: 'FeatureCollection',
      features: []
    };

    renderHook(() => useMapBounds(geojsonData, [], true));

    expect(mockFitBounds).not.toHaveBeenCalled();
  });

  it('should fit bounds for lat/lon points', () => {
    const mockBounds = {};
    vi.mocked(L.latLngBounds).mockReturnValue(mockBounds as L.LatLngBounds);

    const points = [
      {lat: 51.505, lng: -0.09},
      {lat: 52.505, lng: -1.09}
    ];

    renderHook(() => useMapBounds(null, points, false));

    expect(L.latLngBounds).toHaveBeenCalledWith([
      [51.505, -0.09],
      [52.505, -1.09]
    ]);
    expect(mockFitBounds).toHaveBeenCalledWith(mockBounds, {padding: [50, 50]});
  });

  it('should not fit bounds for empty points array', () => {
    renderHook(() => useMapBounds(null, [], false));

    expect(mockFitBounds).not.toHaveBeenCalled();
  });
});
