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
	 * @returns Result containing props or accumulated binding errors
	 */
	build: (
		config: Config,
		data: unknown,
		bindings: Record<string, FieldMetadata>,
		pathContext: string[]
	) => Result<Props, SpecError[]>;
}
