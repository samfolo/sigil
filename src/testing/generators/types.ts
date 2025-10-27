/**
 * Generator configuration types for test data generation
 *
 * All generators support deterministic seeding for reproducible tests.
 */

/**
 * Base configuration for all generators
 */
export interface BaseGeneratorConfig {
	/**
	 * Random seed for deterministic generation
	 *
	 * Same seed produces same output across runs, enabling reproducible tests.
	 */
	seed?: number;
}

/**
 * CSV column data types
 *
 * Maps to faker.js generators for realistic data generation.
 */
export type CSVColumnType =
	| 'id'
	| 'name'
	| 'email'
	| 'age'
	| 'date'
	| 'boolean'
	| 'number'
	| 'currency'
	| 'text'
	| 'department'
	| 'city'
	| 'country'
	| 'phone'
	| 'url'
	| 'uuid';

/**
 * CSV column definition
 */
export interface CSVColumnDefinition {
	/**
	 * Column name (will appear in header)
	 */
	name: string;

	/**
	 * Data type for this column
	 *
	 * Determines which faker generator to use for values.
	 */
	type: CSVColumnType;

	/**
	 * Additional options for number/currency types
	 */
	options?: {
		/**
		 * Minimum value (for number/currency types)
		 */
		min?: number;

		/**
		 * Maximum value (for number/currency types)
		 */
		max?: number;
	};
}

/**
 * Configuration for CSV data generation
 */
export interface CSVGeneratorConfig extends BaseGeneratorConfig {
	/**
	 * Number of data rows to generate (excludes header)
	 */
	rows: number;

	/**
	 * Column definitions
	 *
	 * If not provided, defaults to a realistic employee dataset with:
	 * id, name, email, age, department, salary, active, joinDate
	 */
	columns?: CSVColumnDefinition[];

	/**
	 * Whether to include header row
	 *
	 * @default true
	 */
	includeHeader?: boolean;
}

/**
 * Configuration for nested JSON generation
 */
export interface JSONGeneratorConfig extends BaseGeneratorConfig {
	/**
	 * Maximum nesting depth of objects
	 *
	 * Depth of 1 creates flat objects, 2 creates one level of nesting, etc.
	 */
	depth: number;

	/**
	 * Minimum number of properties at each object level
	 */
	minBreadth: number;

	/**
	 * Maximum number of properties at each object level
	 */
	maxBreadth: number;

	/**
	 * Number of root-level objects to generate
	 *
	 * @default 1
	 */
	count?: number;

	/**
	 * Whether to include arrays in the structure
	 *
	 * When true, some properties may be arrays of primitives or objects.
	 *
	 * @default true
	 */
	includeArrays?: boolean;

	/**
	 * Minimum array length when arrays are generated
	 *
	 * @default 2
	 */
	minArrayLength?: number;

	/**
	 * Maximum array length when arrays are generated
	 *
	 * @default 5
	 */
	maxArrayLength?: number;
}

/**
 * Configuration for GeoJSON generation
 */
export interface GeoJSONGeneratorConfig extends BaseGeneratorConfig {
	/**
	 * Number of features to generate
	 */
	features: number;

	/**
	 * Bounding box for feature coordinates [west, south, east, north]
	 *
	 * If not provided, features will be distributed globally.
	 */
	bbox?: [number, number, number, number];

	/**
	 * Feature geometry types to include
	 *
	 * Can specify single type or multiple types for mixed collections.
	 * When multiple types provided, features will be randomly distributed among types.
	 *
	 * @default ['Point']
	 */
	geometryTypes?: Array<'Point' | 'LineString' | 'Polygon'>;

	/**
	 * Whether to include realistic properties on each feature
	 *
	 * When true, adds properties like name, type, population, rating.
	 *
	 * @default true
	 */
	includeProperties?: boolean;
}

/**
 * Configuration for XML generation
 */
export interface XMLGeneratorConfig extends BaseGeneratorConfig {
	/**
	 * Root element name
	 *
	 * @default 'root'
	 */
	rootElement?: string;

	/**
	 * Minimum number of child elements per parent
	 */
	minElements: number;

	/**
	 * Maximum number of child elements per parent
	 */
	maxElements: number;

	/**
	 * Maximum nesting depth
	 *
	 * @default 2
	 */
	depth?: number;

	/**
	 * Whether to include attributes on elements
	 *
	 * @default true
	 */
	includeAttributes?: boolean;
}

/**
 * Configuration for YAML generation
 */
export interface YAMLGeneratorConfig extends BaseGeneratorConfig {
	/**
	 * Maximum nesting depth of objects/arrays
	 *
	 * @default 3
	 */
	depth?: number;

	/**
	 * Minimum number of keys at each object level
	 *
	 * @default 2
	 */
	minKeys?: number;

	/**
	 * Maximum number of keys at each object level
	 *
	 * @default 5
	 */
	maxKeys?: number;

	/**
	 * Whether to include arrays in the structure
	 *
	 * @default true
	 */
	includeArrays?: boolean;

	/**
	 * Minimum array length when arrays are generated
	 *
	 * @default 2
	 */
	minArrayLength?: number;

	/**
	 * Maximum array length when arrays are generated
	 *
	 * @default 5
	 */
	maxArrayLength?: number;
}
