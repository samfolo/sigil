/**
 * GeoJSON test data generator
 *
 * Generates realistic GeoJSON Feature Collections using @turf/random and faker.js.
 * Supports mixed geometry types and realistic feature properties.
 */

import {Faker} from '@faker-js/faker/locale/en_GB';
import {randomLineString, randomPoint, randomPolygon} from '@turf/random';

import type {GeoJSONGeneratorConfig} from './types';

/**
 * Default minimum rating value
 */
const DEFAULT_MIN_RATING = 1;

/**
 * Default maximum rating value
 */
const DEFAULT_MAX_RATING = 5;

/**
 * Decimal precision for ratings
 */
const RATING_PRECISION = 1;

/**
 * Default minimum population
 */
const DEFAULT_MIN_POPULATION = 1000;

/**
 * Default maximum population
 */
const DEFAULT_MAX_POPULATION = 100000;

/**
 * Maximum radial distance for polygons (degrees)
 */
const MAX_POLYGON_RADIUS = 10;

/**
 * Maximum line length (degrees)
 */
const MAX_LINE_LENGTH = 5;

/**
 * Default number of vertices for polygons
 */
const DEFAULT_POLYGON_VERTICES = 10;

/**
 * Default number of vertices for line strings
 */
const DEFAULT_LINE_VERTICES = 10;

/**
 * Years in past for establishment date
 */
const ESTABLISHMENT_YEARS_PAST = 50;

/**
 * Feature types for realistic categorization
 */
const FEATURE_TYPES = [
	'restaurant',
	'park',
	'museum',
	'hotel',
	'school',
	'hospital',
	'library',
	'cinema',
	'stadium',
	'airport',
];

/**
 * Generates realistic properties for a feature
 */
const generateProperties = (faker: Faker): Record<string, unknown> => ({
	name: faker.location.city(),
	type: faker.helpers.arrayElement(FEATURE_TYPES),
	population: faker.number.int({
		min: DEFAULT_MIN_POPULATION,
		max: DEFAULT_MAX_POPULATION,
	}),
	rating: faker.number.float({
		min: DEFAULT_MIN_RATING,
		max: DEFAULT_MAX_RATING,
		fractionDigits: RATING_PRECISION,
	}),
	address: faker.location.streetAddress(),
	established: faker.date.past({years: ESTABLISHMENT_YEARS_PAST}).getFullYear(),
});

/**
 * Generates realistic GeoJSON FeatureCollection
 *
 * @param config - Generator configuration
 * @returns GeoJSON string with formatted output
 *
 * @example
 * ```typescript
 * // Generate points with default global distribution
 * const geojson = generateGeoJSON({
 *   features: 30,
 *   seed: 42,
 * });
 *
 * // Generate mixed geometry types within bounding box
 * const geojson = generateGeoJSON({
 *   features: 50,
 *   geometryTypes: ['Point', 'LineString', 'Polygon'],
 *   bbox: [-180, -90, 180, 90],
 *   seed: 123,
 * });
 * ```
 */
export const generateGeoJSON = (config: GeoJSONGeneratorConfig): string => {
	const faker = new Faker({randomizer: {seed: config.seed}});
	const geometryTypes = config.geometryTypes ?? ['Point'];
	const includeProperties = config.includeProperties ?? true;

	// Distribute features across geometry types
	const featuresPerType = Math.ceil(config.features / geometryTypes.length);
	const allFeatures: unknown[] = [];

	for (const geometryType of geometryTypes) {
		let featureCollection;

		switch (geometryType) {
			case 'Point':
				featureCollection = randomPoint(featuresPerType, {
					bbox: config.bbox,
				});
				break;

			case 'LineString':
				featureCollection = randomLineString(featuresPerType, {
					bbox: config.bbox,
					num_vertices: DEFAULT_LINE_VERTICES,
					max_length: MAX_LINE_LENGTH,
				});
				break;

			case 'Polygon':
				featureCollection = randomPolygon(featuresPerType, {
					bbox: config.bbox,
					num_vertices: DEFAULT_POLYGON_VERTICES,
					max_radial_length: MAX_POLYGON_RADIUS,
				});
				break;

			default:
				featureCollection = randomPoint(featuresPerType, {
					bbox: config.bbox,
				});
		}

		allFeatures.push(...featureCollection.features);
	}

	// Trim to exact feature count
	const features = allFeatures.slice(0, config.features);

	// Add realistic properties if requested
	if (includeProperties) {
		for (const feature of features) {
			if (typeof feature === 'object' && feature !== null && 'properties' in feature) {
				feature.properties = generateProperties(faker);
			}
		}
	}

	const featureCollection = {
		type: 'FeatureCollection',
		features,
	};

	return JSON.stringify(featureCollection, null, 2);
};
