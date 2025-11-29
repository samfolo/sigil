import type {
	ComponentType,
	DataTableConfig,
	HierarchyConfig,
	CompositionConfig,
	TextInsightConfig,
	TextConfig,
} from '@sigil/src/lib/generated/types/specification';

import type {TableProps, TextProps} from '../types';

import {DataTableBuilder} from './dataTable';
import {TextBuilder} from './text';
import type {ComponentBuilder, PrimitiveBuilder} from './types';

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
 * Registry interface mapping primitive types to their builders
 */
interface PrimitiveBuilderRegistry {
	'text': PrimitiveBuilder<TextConfig, TextProps>;
}

/**
 * Registry of component builders
 *
 * Maps ComponentType discriminator to builder instance.
 * Add new entries as component builders are implemented.
 */
export const COMPONENT_BUILDERS: ComponentBuilderRegistry = {
	'data-table': new DataTableBuilder(),
	get 'hierarchy'(): never {
		throw new Error('HierarchyBuilder not yet implemented');
	},
	get 'composition'(): never {
		throw new Error('CompositionBuilder not yet implemented');
	},
	get 'text-insight'(): never {
		throw new Error('TextInsightBuilder not yet implemented');
	},
};

/**
 * Registry of primitive builders
 *
 * Maps primitive type discriminator to builder instance.
 */
export const PRIMITIVE_BUILDERS: PrimitiveBuilderRegistry = {
	'text': new TextBuilder(),
};

/**
 * Type-safe component builder lookup
 *
 * @param type - Component type discriminator (excludes primitives)
 * @returns ComponentBuilder with correct Config and Props types
 */
export const getComponentBuilder = <Type extends keyof ComponentBuilderRegistry>(
	type: Type
): ComponentBuilderRegistry[Type] => COMPONENT_BUILDERS[type];

/**
 * Type-safe primitive builder lookup
 *
 * @param type - Primitive type discriminator
 * @returns PrimitiveBuilder with correct Config and Props types
 */
export const getPrimitiveBuilder = <Type extends keyof PrimitiveBuilderRegistry>(
	type: Type
): PrimitiveBuilderRegistry[Type] => PRIMITIVE_BUILDERS[type];

/**
 * Check if a component type is a primitive
 */
export const isPrimitiveType = (type: ComponentType): type is keyof PrimitiveBuilderRegistry => type === 'text';
