export type {ComponentBuilder, PrimitiveBuilder} from './types';
export {DataTableBuilder} from './dataTable';
export {TextBuilder} from './text';
export {
	COMPONENT_BUILDERS,
	PRIMITIVE_BUILDERS,
	getComponentBuilder,
	getPrimitiveBuilder,
	isPrimitiveType,
} from './registry';
