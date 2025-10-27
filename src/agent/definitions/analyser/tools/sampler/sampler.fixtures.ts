/**
 * Test fixtures for sampler pipeline integration tests
 *
 * Provides realistic test data in various formats (CSV, JSON, GeoJSON) for
 * comprehensive testing of the entire sampling pipeline.
 *
 * All fixtures use deterministic seeding (seed=42) for reproducible tests.
 */

import {generateCSV, generateGeoJSON, generateJSON} from '@sigil/src/testing';

/**
 * Seed for reproducible test data generation
 */
const TEST_SEED = 42;

/**
 * Number of rows for standard CSV test data
 */
const STANDARD_CSV_ROWS = 100;

/**
 * Number of rows for large CSV dataset
 */
const LARGE_CSV_ROWS = 500;

/**
 * JSON nesting depth
 */
const JSON_DEPTH = 4;

/**
 * JSON minimum breadth per level
 */
const JSON_MIN_BREADTH = 3;

/**
 * JSON maximum breadth per level
 */
const JSON_MAX_BREADTH = 5;

/**
 * Number of GeoJSON features
 */
const GEOJSON_FEATURES = 30;

/**
 * Realistic CSV data with 100 rows
 *
 * Includes employee data with diverse columns: id, name, email, age, department,
 * salary, active status, and join date. Suitable for testing diversity across
 * different data types and content.
 */
export const REALISTIC_CSV_DATA = generateCSV({
	rows: STANDARD_CSV_ROWS,
	seed: TEST_SEED,
});

/**
 * Large CSV dataset with 500 rows
 *
 * Used for performance testing and exhaustion scenarios. Should generate
 * approximately 10,000+ characters for chunk count and timing tests.
 */
export const LARGE_CSV_DATA = generateCSV({
	rows: LARGE_CSV_ROWS,
	seed: TEST_SEED,
});

/**
 * Deeply nested JSON data
 *
 * Creates complex nested structures with objects and arrays up to 4 levels deep.
 * Variable breadth (3-5 properties per level) ensures realistic variety.
 */
export const NESTED_JSON_DATA = generateJSON({
	depth: JSON_DEPTH,
	minBreadth: JSON_MIN_BREADTH,
	maxBreadth: JSON_MAX_BREADTH,
	includeArrays: true,
	seed: TEST_SEED,
});

/**
 * GeoJSON FeatureCollection with 30 features
 *
 * Contains Point features with realistic properties (name, type, population, rating).
 * Suitable for testing position tracking through nested GeoJSON structure.
 */
export const GEOJSON_DATA = generateGeoJSON({
	features: GEOJSON_FEATURES,
	geometryTypes: ['Point'],
	includeProperties: true,
	seed: TEST_SEED,
});

/**
 * Small dataset for exhaustion testing
 *
 * Contains only 3 rows, which should produce approximately 3 chunks.
 * Used to verify behaviour when more vignettes are requested than available.
 */
export const SMALL_CSV_DATA = generateCSV({
	rows: 3,
	seed: TEST_SEED,
});
