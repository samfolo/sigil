/**
 * Testing infrastructure
 *
 * Provides reusable test data generators for comprehensive integration testing.
 * All generators support deterministic seeding for reproducible tests.
 *
 * Includes temporary filesystem builders for creating realistic test file structures.
 */

export {
	generateCSV,
	generateGeoJSON,
	generateJSON,
	generateXML,
	generateYAML,
} from './generators';
export type {
	BaseGeneratorConfig,
	CSVColumnDefinition,
	CSVColumnType,
	CSVGeneratorConfig,
	GeoJSONGeneratorConfig,
	JSONGeneratorConfig,
	XMLGeneratorConfig,
	YAMLGeneratorConfig,
} from './generators';

export {TempFSBuilder, TempFSDirBuilder, TempFSFileBuilder} from './fs';
export type {DirEntry, FileEntry, TempFSResult} from './fs';
