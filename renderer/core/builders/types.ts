import type {SpecError} from '@sigil/src/common/errors';
import type {Result} from '@sigil/src/common/errors/result';
import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

/**
 * Generic interface for component builders
 *
 * Builders transform component configuration and data into React component props.
 * They handle data binding, type coercion, and error accumulation.
 *
 * @typeParam Config - Component-specific configuration type (e.g., DataTableConfig)
 * @typeParam Props - Component-specific props type (e.g., TableProps)
 */
export interface ComponentBuilder<Config, Props> {
	/**
	 * Builds component props from configuration and data
	 *
	 * @param config - Component configuration from validated spec
	 * @param data - Raw data to bind to component
	 * @param bindings - Field metadata for accessor binding
	 * @param pathContext - JSONPath segments for error context
	 * @param dataSource - JSONPath to the data this component binds to (defaults to '$')
	 * @returns Result containing props or accumulated binding errors
	 */
	build: (
		config: Config,
		data: unknown,
		bindings: Record<string, FieldMetadata>,
		pathContext: string[],
		dataSource?: string
	) => Result<Props, SpecError[]>;
}

/**
 * Simplified interface for primitive builders
 *
 * Primitives like text only need config and data to resolve accessors.
 * No bindings metadata or path context required.
 *
 * @typeParam Config - Primitive-specific configuration type (e.g., TextConfig)
 * @typeParam Props - Primitive-specific props type (e.g., TextProps)
 */
export interface PrimitiveBuilder<Config, Props> {
	/**
	 * Builds primitive props from configuration and data
	 *
	 * @param config - Primitive configuration from validated spec
	 * @param data - Raw data for accessor resolution
	 * @returns Result containing props or accessor resolution errors
	 */
	build: (config: Config, data: unknown) => Result<Props, SpecError[]>;
}
