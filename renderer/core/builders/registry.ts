import type {
	ComponentType,
	DataTableConfig,
	HierarchyConfig,
	CompositionConfig,
	TextInsightConfig,
} from '@sigil/src/lib/generated/types/specification';

import type {TableProps} from '../types';
import type {ComponentBuilder} from './types';
import {DataTableBuilder} from './DataTableBuilder/DataTableBuilder';

/**
 * Maps ComponentType to its configuration and props types
 */
interface ComponentTypeMap {
	'data-table': {
		config: DataTableConfig;
		props: TableProps;
	};
	'hierarchy': {
		config: HierarchyConfig;
		props: Record<string, never>;
	};
	'composition': {
		config: CompositionConfig;
		props: Record<string, never>;
	};
	'text-insight': {
		config: TextInsightConfig;
		props: Record<string, never>;
	};
}

/**
 * Registry interface mapping each ComponentType to its specific builder
 */
interface ComponentBuilderRegistry {
	'data-table': ComponentBuilder<DataTableConfig, TableProps>;
	'hierarchy': ComponentBuilder<HierarchyConfig, Record<string, never>>;
	'composition': ComponentBuilder<CompositionConfig, Record<string, never>>;
	'text-insight': ComponentBuilder<TextInsightConfig, Record<string, never>>;
}

/**
 * Registry of component builders
 *
 * Maps ComponentType discriminator to builder instance.
 * Add new entries as component builders are implemented.
 */
export const componentBuilders: ComponentBuilderRegistry = {
	'data-table': new DataTableBuilder(),
	'hierarchy': null as never, // TODO: Implement HierarchyBuilder
	'composition': null as never, // TODO: Implement CompositionBuilder
	'text-insight': null as never, // TODO: Implement TextInsightBuilder
};

/**
 * Type-safe builder lookup
 *
 * Returns correctly typed builder for the given component type.
 *
 * @param type - ComponentType discriminator
 * @returns ComponentBuilder with correct Config and Props types
 *
 * @example
 * ```typescript
 * const builder = getBuilder('data-table');
 * // builder: ComponentBuilder<DataTableConfig, TableProps>
 * ```
 */
export const getBuilder = <Type extends ComponentType>(
	type: Type
): ComponentBuilderRegistry[Type] => {
	return componentBuilders[type];
};
