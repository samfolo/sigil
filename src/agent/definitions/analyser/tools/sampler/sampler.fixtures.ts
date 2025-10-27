/**
 * Test fixtures for sampler pipeline integration tests
 *
 * Provides realistic test data in various formats (CSV, JSON, GeoJSON, XML, YAML) for
 * comprehensive testing of the entire sampling pipeline.
 *
 * All fixtures use deterministic seeding (seed=42) for reproducible tests.
 */

import {
	generateCSV,
	generateGeoJSON,
	generateJSON,
	generateXML,
	generateYAML,
} from '@sigil/src/testing';

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
 * XML minimum elements per level
 */
const XML_MIN_ELEMENTS = 3;

/**
 * XML maximum elements per level
 */
const XML_MAX_ELEMENTS = 6;

/**
 * XML nesting depth
 */
const XML_DEPTH = 3;

/**
 * YAML nesting depth
 */
const YAML_DEPTH = 3;

/**
 * YAML minimum keys per object
 */
const YAML_MIN_KEYS = 2;

/**
 * YAML maximum keys per object
 */
const YAML_MAX_KEYS = 5;

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

/**
 * XML data with nested structure
 *
 * Creates XML with 3 levels of nesting and variable elements (3-6 per level).
 * Includes attributes on elements for realistic structure.
 */
export const XML_DATA = generateXML({
	minElements: XML_MIN_ELEMENTS,
	maxElements: XML_MAX_ELEMENTS,
	depth: XML_DEPTH,
	includeAttributes: true,
	seed: TEST_SEED,
});

/**
 * YAML data with nested structure
 *
 * Creates YAML with objects and arrays up to 3 levels deep.
 * Variable keys (2-5 per object) ensure realistic variety.
 */
export const YAML_DATA = generateYAML({
	depth: YAML_DEPTH,
	minKeys: YAML_MIN_KEYS,
	maxKeys: YAML_MAX_KEYS,
	includeArrays: true,
	seed: TEST_SEED,
});
