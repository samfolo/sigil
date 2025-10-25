/**
 * Generic structured error system
 *
 * This module provides a reusable foundation for structured error handling
 * across different domains. Domains specialise these types and utilities
 * by providing domain-specific error codes, categories, and context types.
 */

// Core types
export type {StructuredError, Severity, ErrorCode} from './types';

// Formatting utilities
export {
  formatList,
  safeStringify,
  formatUnknownError,
  appendMetadata,
  formatErrorsBySeverity,
} from './formatter';

// Exception base class
export {StructuredErrorException} from './exception';

// Type guards
export {isStructuredErrorArray} from './predicates';
