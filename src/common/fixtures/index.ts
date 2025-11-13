// DEPRECATED: Replaced by src/common/run. Remove after Ticket 3 verification.
// This fixture system scans date-based logs/ and fixtures/ directories.
// The new run system uses flat runs/ directory with run artifacts.

export {extractSpec} from './extractSpec';
export {loadFixture} from './loadFixture';
export {parseLogFile} from './parseLogFile';
export {scanFixtureDirectories} from './scanFixtures';
export type {Fixture, FixtureMetadata} from './schemas';
export {DATE_DIRECTORY_PATTERN, FixtureMetadataSchema, FixtureSchema} from './schemas';
export type {ProcessedFixtureData} from './utils';
export {processFixtureFile} from './utils';
