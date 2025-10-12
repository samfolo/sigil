/**
 * Generated Zod schemas from JSON Schema specification
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run `npm run spec:codegen` to regenerate
 *
 * Note: TypeScript types are generated separately in lib/generated/types/
 * Import types from @sigil/lib/generated/types, not from z.infer<>
 */

import {z} from 'zod';

/**
 * Enables efficient rendering of large datasets by only rendering visible items.
 * 
 * Virtualisation is critical for performance when displaying thousands of rows. The rendering engine only creates DOM nodes for items in/near the viewport, dramatically reducing memory usage and initial render time.
 * 
 * Use this for: large tables, long lists, infinite scrolling
 */
export const VirtualisationAffordanceSchema = z.object({
  "buffer_size": z.number().optional().describe("Maximum number of items to keep in rendered memory. Items beyond this are unmounted to prevent memory leaks. Default: 50"),
  "item_height": z.number().optional().describe("Fixed height for each item in pixels. Required for optimal performance with fixed-height rows. Omit this for dynamic-height items (slower but more flexible)"),
  "overscan_count": z.number().optional().describe("Number of items to render outside the visible viewport. Higher values provide smoother scrolling but use more memory. Default: 3"),
  "type": z.literal("virtualisation")
}).strict();
/**
 * Reference to a field in the provided data using an accessor path.
 * 
 * Accessor syntax:
 * - Simple field: 'name', 'age', 'status'
 * - Nested field: 'user.profile.email', 'metadata.created_at'
 * - Array index: 'items[0]', 'users[5].name'
 * - Mixed: 'data.users[0].contacts[1].email'
 * 
 * The accessor is resolved at inference time against the provided data.
 */
export const AffordedFieldSchema = z.object({
  "accessor": z.string().describe("Dot-notation path to the field in the data. Supports nested objects and array indexing")
}).strict();
/** Enables sorting data by one or more fields. Allows sorting data ascending/descending by field values. Sorting can be restricted to specific fields or allowed on all fields */
export const SortingAffordanceSchema = z.object({
  "allowed_fields": z.array(AffordedFieldSchema).optional().describe("Fields that can be sorted. Omit to allow sorting on all fields in the component"),
  "default_direction": z.enum(["asc", "desc"]).optional().describe("Initial sort direction. Default: 'asc'"),
  "default_field": AffordedFieldSchema.optional(),
  "type": z.literal("sorting")
}).strict();
/**
 * Logical operators for combining multiple filter conditions.
 * 
 * Available operators:
 * - and: All conditions must be true (intersection)
 * - or: At least one condition must be true (union)
 * - not: Negates the child condition(s)
 */
export const FilterConditionLogicalOperatorSchema = z.enum(["and", "or", "not"]);
/**
 * Combines multiple filter conditions using logical operators.
 * 
 * Enables complex queries like:
 * - (age > 18 AND country = 'UK') OR (status = 'verified')
 * - NOT (deleted = true)
 * 
 * Conditions can be nested arbitrarily deep for sophisticated filtering
 */
export const LogicalFilterConditionSchema: any = z.lazy(() => z.object({
  "conditions": z.array(FilterConditionSchema).describe("Child conditions to combine. Can include both relational and other logical conditions (recursive)"),
  "operator": FilterConditionLogicalOperatorSchema,
  "type": z.literal("logical")
}).strict());
/**
 * Comparison operators for relational filter conditions.
 * 
 * Available operators:
 * - equals: Exact equality (field === value)
 * - not_equals: Inequality (field !== value)
 * - contains: String contains substring (case-insensitive recommended)
 * - not_contains: String does not contain substring
 * - starts_with: String starts with prefix
 * - ends_with: String ends with suffix
 * - greater_than: Numeric/date comparison (field > value)
 * - less_than: Numeric/date comparison (field < value)
 * - greater_than_or_equal: Numeric/date comparison (field >= value)
 * - less_than_or_equal: Numeric/date comparison (field <= value)
 * - between: Value is within a range (inclusive) - use with RangeFilterConditionValue
 * - in: Value is in a list of options - use with ListFilterConditionValue
 * - not_in: Value is not in a list of options - use with ListFilterConditionValue
 */
export const FilterConditionRelationalOperatorSchema = z.enum(["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between", "in", "not_in"]);
/** A literal value to compare against */
export const ValueFilterConditionValueSchema = z.object({
  "type": z.literal("value"),
  "value": z.union([z.string(), z.number(), z.boolean(), z.null()]).describe("The literal value to compare")
}).strict();
/**
 * Reference to another field's value for field-to-field comparison.
 * 
 * Example: Filter rows where 'end_date' > 'start_date'
 */
export const FieldFilterConditionValueSchema = z.object({
  "field": AffordedFieldSchema,
  "type": z.literal("field")
}).strict();
/** A list of values for 'in' or 'not_in' operators */
export const ListFilterConditionValueSchema = z.object({
  "type": z.literal("list"),
  "values": z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).describe("The list of acceptable values")
}).strict();
/** A numeric or date range for 'between' operator. Both start and end are inclusive */
export const RangeFilterConditionValueSchema = z.object({
  "end": z.union([z.string(), z.number()]).describe("Range end (inclusive)"),
  "start": z.union([z.string(), z.number()]).describe("Range start (inclusive)"),
  "type": z.literal("range")
}).strict();
/** The value side of a filter comparison. Can be a literal value, reference to another field, list, or range */
export const FilterConditionValueSchema = z.discriminatedUnion("type", [
  ValueFilterConditionValueSchema,
  FieldFilterConditionValueSchema,
  ListFilterConditionValueSchema,
  RangeFilterConditionValueSchema
]);
/**
 * A single field-value comparison.
 * 
 * Example: {type: 'relational', field: {accessor: 'age'}, operator: 'greater_than', value: {type: 'value', value: 18}}
 */
export const RelationalFilterConditionSchema = z.object({
  "field": AffordedFieldSchema,
  "operator": FilterConditionRelationalOperatorSchema,
  "type": z.literal("relational"),
  "value": FilterConditionValueSchema.describe("What to compare the field against")
}).strict();
/** A filter condition can be either a relational comparison or a logical combination. This recursive structure enables arbitrarily complex filter expressions */
export const FilterConditionSchema: any = z.lazy(() => z.discriminatedUnion("type", [
  LogicalFilterConditionSchema,
  RelationalFilterConditionSchema
]));
/**
 * Filter interaction types that determine appropriate interaction patterns.
 * 
 * Available types:
 * - text: Text-based filtering with string matching (contains, starts with, equals, etc.)
 * - number_range: Numeric range filtering with min/max bounds
 * - date_range: Date range filtering with start/end dates
 * - select: Selection from predefined options (derived from unique field values)
 * - boolean: Boolean filtering
 */
export const FilterTypeSchema = z.enum(["text", "number_range", "date_range", "select", "boolean"]);
/**
 * Enables filtering data based on field values.
 * 
 * Supports both simple single-field filters and complex multi-condition queries using logical operators.
 * 
 * Filter behaviour:
 * - Multiple default_filters are combined with AND logic
 * - User can add/remove filters interactively
 * - Filter types determine appropriate interaction patterns
 */
export const FilteringAffordanceSchema = z.object({
  "allowed_fields": z.array(AffordedFieldSchema).optional().describe("Fields that can be filtered. Omit to allow filtering on all fields in the component"),
  "default_filters": z.array(FilterConditionSchema).optional().describe("Filters applied by default when component first renders. Useful for pre-filtering data to a relevant subset. User can modify/remove these filters interactively"),
  "filter_types": z.record(z.string(), FilterTypeSchema).optional().describe("Specifies the filter interaction type for each field. Maps field accessor to FilterType (e.g., {'age': 'number_range', 'name': 'text'}). Omit to auto-detect based on data types from FieldMetadata"),
  "type": z.literal("filtering")
}).strict();
/**
 * Enables paginated display of data with configurable page sizes.
 * 
 * Pagination improves performance and usability for large datasets by displaying data in manageable chunks. Users can navigate between pages and optionally adjust the page size.
 * 
 * Note: Pagination and virtualisation serve different purposes:
 * - Use pagination for traditional page-based navigation
 * - Use virtualisation for continuous scrolling or very large datasets
 * - They can be combined (paginated + virtualised pages)
 */
export const PaginationAffordanceSchema = z.object({
  "page_size": z.number().describe("Default number of items displayed per page"),
  "show_size_options": z.boolean().optional().describe("Whether to allow users to change page size. Default: true"),
  "size_options": z.array(z.number()).optional().describe("Available page size options. Default: [10, 25, 50, 100]"),
  "type": z.literal("pagination")
}).strict();
/**
 * Supported export file formats.
 * 
 * Available formats:
 * - csv: Comma-separated values (tabular data)
 * - json: JSON array of objects
 */
export const ExportAffordanceFormatSchema = z.enum(["csv", "json"]);
/**
 * Enables exporting data to various file formats.
 * 
 * Provides ability to export visible or filtered data. Export respects current filters and sorting but typically exports ALL matching data (not just the current page)
 */
export const ExportAffordanceSchema = z.object({
  "filename_template": z.string().optional().describe("Template for generated filename. Supports placeholders: {title}, {timestamp}, {date}. Default: '{title}_{timestamp}'"),
  "formats": z.array(ExportAffordanceFormatSchema).describe("Available export formats (e.g., ['csv', 'json'])"),
  "include_headers": z.boolean().optional().describe("Whether to include column headers in exported files. Default: true"),
  "type": z.literal("export")
}).strict();
/** Enables interactive selection of rows/items. Allows selecting data rows, useful for bulk actions, detail views, or highlighting items of interest */
export const SelectionAffordanceSchema = z.object({
  "mode": z.enum(["single", "multiple"]).describe("Selection mode: 'single' (only one item can be selected at a time) or 'multiple' (multiple items can be selected simultaneously)"),
  "preserve_across_pages": z.boolean().optional().describe("Whether selections persist when navigating between pages. Default: false (selections reset on page change)"),
  "show_selection_indicators": z.boolean().optional().describe("Whether to provide explicit selection indicators. Default: true for multiple mode, false for single mode"),
  "type": z.literal("selection")
}).strict();
/**
 * Enables full-text search across data fields.
 * 
 * Filters data to matching rows based on text queries. Search is typically less structured than filtering but more convenient for quick queries.
 * 
 * Search vs Filter:
 * - Search: Quick, text-based, searches across multiple fields
 * - Filter: Structured, field-specific, supports complex conditions
 */
export const SearchAffordanceSchema = z.object({
  "case_sensitive": z.boolean().optional().describe("Whether search is case-sensitive. Default: false (case-insensitive)"),
  "min_characters": z.number().optional().describe("Minimum number of characters before search activates. Prevents expensive searches on very short inputs. Default: 1"),
  "searchable_fields": z.array(AffordedFieldSchema).optional().describe("Fields to search within. Omit to search all text fields in the component"),
  "type": z.literal("search")
}).strict();
/** Union type of all available affordance types */
export const AffordanceSchema = z.discriminatedUnion("type", [
  VirtualisationAffordanceSchema,
  SortingAffordanceSchema,
  FilteringAffordanceSchema,
  PaginationAffordanceSchema,
  ExportAffordanceSchema,
  SelectionAffordanceSchema,
  SearchAffordanceSchema
]);
/** Fixed size in pixels. The element will be exactly this size regardless of content or container */
export const FixedSizeConstraintSchema = z.object({
  "type": z.literal("fixed"),
  "value": z.number().describe("Size in pixels")
}).strict();
/** Flex sizing with a flex factor. Element shares available space proportionally with other flex elements. E.g., flex: 1 and flex: 2 would give 33% and 67% of space respectively */
export const FlexSizeConstraintSchema = z.object({
  "type": z.literal("flex"),
  "value": z.number().describe("Flex factor for proportional sizing")
}).strict();
/** Percentage of parent container size. Value should be between 0 and 100 */
export const PercentageSizeConstraintSchema = z.object({
  "type": z.literal("percentage"),
  "value": z.number().describe("Percentage value (0-100)")
}).strict();
/** Size to fit content. Element sizes based on its children's dimensions */
export const ContentSizeConstraintSchema = z.object({
  "type": z.literal("content")
}).strict();
/**
 * Defines how an element's size is calculated. Different constraint types enable different layout behaviours:
 * - Use 'fixed' for exact pixel dimensions (e.g., icons, buttons)
 * - Use 'flex' for proportional sizing (e.g., sidebar vs main content)
 * - Use 'percentage' for responsive layouts (e.g., 50% width)
 * - Use 'content' to size based on children (e.g., auto-sizing containers)
 */
export const SizeConstraintSchema = z.discriminatedUnion("type", [
  FixedSizeConstraintSchema,
  FlexSizeConstraintSchema,
  PercentageSizeConstraintSchema,
  ContentSizeConstraintSchema
]);
/**
 * Column configuration for data table components.
 * 
 * Defines display properties for a single column. The accessor references a field in accessor_bindings, linking display config to data semantics.
 * 
 * Column order in the array determines display order (left-to-right).
 * 
 * Sortability and filterability are derived from affordances, not defined per-column.
 */
export const DataTableColumnSchema = z.object({
  "accessor": z.string().describe("JSONPath accessor referencing a field in accessor_bindings. Examples: 'name', 'user.email', 'metadata.created_at'"),
  "label": z.string().describe("Human-readable column header text"),
  "width": SizeConstraintSchema.optional(),
  "alignment": z.enum(["left", "center", "right"]).optional().describe("Horizontal alignment of cell content. Default: 'left' for text, 'right' for numbers"),
  "visible": z.boolean().optional().describe("Whether the column is visible. Hidden columns remain in the spec but are not rendered. Default: true"),
  "description": z.string().optional().describe("Optional description for tooltip or help text")
}).strict();
/**
 * Configuration for data table components.
 * 
 * Data tables display tabular data with rows and columns, supporting common tabular operations like sorting, filtering, and pagination.
 * 
 * Best used with: data_shape = 'tabular'
 */
export const DataTableConfigSchema = z.object({
  "affordances": z.array(AffordanceSchema).describe("Interactive capabilities enabled for this table. Common affordances: sorting, filtering, pagination, virtualisation, search, export"),
  "columns": z.array(DataTableColumnSchema).describe("Column definitions specifying which fields to display and how to render them. Column order determines display order (left-to-right). Each column's accessor must reference a field in accessor_bindings"),
  "description": z.string().optional().describe("Optional description explaining the component's purpose"),
  "title": z.string().optional().describe("Optional title for the component"),
  "type": z.literal("data-table")
}).strict();
/**
 * Configuration for hierarchy/tree components.
 * 
 * Hierarchy components display nested or tree-structured data with expand/collapse functionality and hierarchical navigation.
 * 
 * Best used with: data_shape = 'hierarchical'
 */
export const HierarchyConfigSchema = z.object({
  "affordances": z.array(AffordanceSchema).describe("Interactive capabilities enabled for this hierarchy. Common affordances: search, selection, export"),
  "description": z.string().optional().describe("Optional description explaining the component's purpose"),
  "title": z.string().optional().describe("Optional title for the component"),
  "type": z.literal("hierarchy")
}).strict();
/**
 * Configuration for composition components.
 * 
 * Compositions are meta-components that combine multiple sub-components into a unified visualisation (e.g., a dashboard with multiple charts).
 * 
 * Best used with: any data_shape, depending on sub-components
 */
export const CompositionConfigSchema = z.object({
  "affordances": z.array(AffordanceSchema).describe("Interactive capabilities for the composition as a whole. Note: sub-components have their own affordances"),
  "description": z.string().optional().describe("Optional description explaining the component's purpose"),
  "title": z.string().optional().describe("Optional title for the component"),
  "type": z.literal("composition")
}).strict();
/**
 * Configuration for text insight components.
 * 
 * Text insights display textual information, summaries, or key-value metadata in a readable format.
 * 
 * Best used with: data_shape = 'key_value'
 */
export const TextInsightConfigSchema = z.object({
  "affordances": z.array(AffordanceSchema).describe("Interactive capabilities for text insights. Common affordances: search, export"),
  "description": z.string().optional().describe("Optional description explaining the component's purpose"),
  "title": z.string().optional().describe("Optional title for the component"),
  "type": z.literal("text-insight")
}).strict();
/** Discriminated union of all component configuration types */
export const ComponentConfigSchema = z.discriminatedUnion("type", [
  DataTableConfigSchema,
  HierarchyConfigSchema,
  CompositionConfigSchema,
  TextInsightConfigSchema
]);
/**
 * Describes the structural pattern of the source data being visualised. This is NOT about how data is displayed, but about the inherent structure of the input data. Helps validate data compatibility with the spec and informs appropriate component selection.
 * 
 * Available shapes:
 * - tabular: Tabular data with rows and columns (e.g., CSV, database tables, spreadsheets)
 * - hierarchical: Nested or tree-like structures (e.g., JSON with nested objects, file systems, organisational charts)
 * - key_value: Flat key-value pairs (e.g., configuration files, environment variables, metadata)
 * - graph: Network structures with nodes and edges (e.g., social networks, dependency graphs, knowledge graphs)
 * - geospatial: Location-based data with coordinates (e.g., GeoJSON, GPS data, spatial datasets)
 */
export const DataShapeSchema = z.enum(["tabular", "hierarchical", "key_value", "graph", "geospatial"]);
/**
 * Supported data types for field values. These types are used for type validation, coercion, and determining appropriate display components (e.g., date pickers for dates).
 * 
 * Available types:
 * - number: Numeric values (integers and floats)
 * - string: Text values
 * - date: Temporal values (dates, timestamps)
 * - boolean: Boolean true/false
 * - null: Explicit null values
 * - array: Array/list structures
 * - object: Nested object structures
 * - undefined: Undefined/missing values
 * - unknown: Unknown or mixed types
 */
export const DataTypeSchema = z.enum(["number", "string", "date", "boolean", "null", "array", "object", "undefined", "unknown"]);
/** Display configuration for chip-style rendering. Chips are compact UI elements with optional icons, typically used for tags, statuses, or categories */
export const ChipValueMappingDisplayConfigSchema = z.object({
  "details": z.object({
  "color": z.string().optional().describe("Chip colour (CSS colour string). Examples: 'red', '#ff0000', 'rgb(255, 0, 0)'"),
  "icon": z.string().optional().describe("Icon identifier to display in the chip. Examples: 'check', 'alert', 'info'. The specific icon set is determined by the rendering engine")
}).strict().optional().describe("Optional chip-specific styling"),
  "type": z.literal("chip")
}).strict();
/** Display configuration for label-style rendering. Labels are simple text with optional colouring, used for inline annotations */
export const LabelValueMappingDisplayConfigSchema = z.object({
  "details": z.object({
  "color": z.string().optional().describe("Label text colour (CSS colour string). Examples: 'blue', '#0000ff'")
}).strict().optional().describe("Optional label-specific styling"),
  "type": z.literal("label")
}).strict();
/** Display configuration for badge-style rendering. Badges are prominent indicators, typically used for counts or status indicators */
export const BadgeValueMappingDisplayConfigSchema = z.object({
  "details": z.object({
  "color": z.string().optional().describe("Badge colour (CSS colour string). Examples: 'green', '#00ff00'")
}).strict().optional().describe("Optional badge-specific styling"),
  "type": z.literal("badge")
}).strict();
/**
 * Discriminated union of all display configuration types.
 * 
 * Available display styles:
 * - chip: Compact pill-shaped element with optional icon
 * - label: Simple coloured text
 * - badge: Prominent indicator, often circular or rectangular
 */
export const ValueMappingDisplayConfigSchema = z.discriminatedUnion("type", [
  ChipValueMappingDisplayConfigSchema,
  LabelValueMappingDisplayConfigSchema,
  BadgeValueMappingDisplayConfigSchema
]);
/**
 * Defines how a raw data value should be displayed.
 * 
 * Value mappings transform source values into human-readable display values with optional visual styling. Common use cases:
 * - Status codes: 0 → 'Pending' (yellow chip), 1 → 'Complete' (green chip)
 * - Boolean flags: true → 'Yes' (green label), false → 'No' (red label)
 * - Categories: 'cat_a' → 'Category A' (blue badge)
 * 
 * The source value is the key in FieldMetadata.value_mappings, and this ValueMapping is the corresponding value
 */
export const ValueMappingSchema = z.object({
  "display_config": ValueMappingDisplayConfigSchema.optional().describe("Optional visual styling for the display value. If omitted, the value is displayed as plain text"),
  "display_value": z.string().describe("The human-readable text to display instead of the raw value")
}).strict();
/**
 * Metadata describing how a data field should be interpreted and displayed.
 * 
 * FieldMetadata provides the semantic layer between raw data and visualisation. It tells the rendering engine:
 * - What role(s) the field plays (e.g., label, value, time axis)
 * - What data type(s) it contains (with fallbacks for type coercion)
 * - How to transform values for display (mappings)
 * - How to format values (date/number formatting)
 */
export const FieldMetadataSchema = z.object({
  "data_types": z.array(DataTypeSchema).describe("Data types for this field, in order of preference. First element is the primary type, subsequent elements are fallbacks for type coercion if the primary type fails. Example: ['number', 'string'] means 'try to parse as number, fall back to string'"),
  "format": z.string().optional().describe(`Format string for displaying values. Uses format strings appropriate to the data type:
- Dates: 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'MMM D, YYYY'
- Numbers: '0,0.00', '£0,0', '\$0.00a', '0%'
- Strings: typically omitted (displayed as-is)

The rendering engine determines how to interpret format strings`),
  "roles": z.array(z.string()).describe(`Semantic roles this field plays in the visualisation. Always an array to support fields with multiple roles.

Common roles:
- 'label': Human-readable identifier (e.g., name, title)
- 'value': Numeric or quantitative data
- 'time': Temporal data for time-series
- 'x', 'y': Positional data for charts
- 'category': Categorical grouping
- 'id': Unique identifier

Example: ['x', 'time'] for a time-series x-axis`),
  "value_mappings": z.record(z.string(), ValueMappingSchema).optional().describe(`Mappings from source values to display values. Maps raw data values to ValueMapping objects that define how to display them. Keys are the source values (as strings), values are the display transformations.

Example:
{
  '0': { display_value: 'Inactive', display_config: { type: 'chip', details: { color: 'grey' } } },
  '1': { display_value: 'Active', display_config: { type: 'chip', details: { color: 'green' } } }
}`)
}).strict();
/** Nested layout node for hierarchical composition */
export const LayoutLayoutChildSchema: any = z.lazy(() => z.object({
  "node": LayoutNodeSchema.describe("The nested layout node"),
  "type": z.literal("layout")
}).strict());
/** Reference to a component by its ID. The component must exist in ComponentSpec.components */
export const ComponentLayoutChildSchema = z.object({
  "component_id": z.string().describe("ID of the component to render"),
  "type": z.literal("component")
}).strict();
/**
 * A child element within a layout.
 * 
 * Can be either:
 * - Another layout node (enabling nested/composable layouts)
 * - A component (leaf node referenced by ID from ComponentSpec.components)
 * 
 * This discriminated union enables type-safe handling of the two cases
 */
export const LayoutChildSchema: any = z.lazy(() => z.discriminatedUnion("type", [
  LayoutLayoutChildSchema,
  ComponentLayoutChildSchema
]));
/**
 * Flexible padding definition supporting shorthand and explicit sides. Follows CSS-like conventions for ease of use.
 * 
 * Can be either:
 * - A number: Same padding on all four sides (top, right, bottom, left)
 * - An object: Specify each side independently (omitted sides default to 0)
 */
export const PaddingSchema = z.union([z.number(), z.object({
  "bottom": z.number().optional(),
  "left": z.number().optional(),
  "right": z.number().optional(),
  "top": z.number().optional()
}).strict()]);
/**
 * Predefined spacing scales for consistent visual rhythm.
 * 
 * Available spacings:
 * - tight: Minimal spacing for dense layouts
 * - normal: Default spacing for balanced layouts
 * - relaxed: Generous spacing for spacious layouts
 */
export const LayoutNodeSpacingSchema = z.enum(["tight", "normal", "relaxed"]);
/**
 * Alignment options for stack layout children along the cross axis.
 * 
 * Available alignments:
 * - start: Align to the start (left/top)
 * - center: Align to the center
 * - end: Align to the end (right/bottom)
 * - stretch: Stretch to fill the cross axis
 */
export const StackLayoutNodeAlignmentSchema = z.enum(["start", "center", "end", "stretch"]);
/**
 * Horizontal stack layout - arranges children left-to-right.
 * 
 * Common properties:
 * - Size constraints work together: if only width is set, it defines the exact or preferred width. If min_width and max_width are set, they bound the width range. The final size is calculated by the rendering engine based on constraints and content
 */
export const HorizontalStackLayoutNodeSchema: any = z.lazy(() => z.object({
  "children": z.array(LayoutChildSchema).describe("Ordered list of children to render in sequence"),
  "direction": z.literal("horizontal").describe("Flow direction of children - fixed to 'horizontal' for this layout type"),
  "height": SizeConstraintSchema.optional(),
  "id": z.string().describe("Unique identifier for this layout node"),
  "max_height": SizeConstraintSchema.optional(),
  "max_width": SizeConstraintSchema.optional(),
  "min_height": SizeConstraintSchema.optional(),
  "min_width": SizeConstraintSchema.optional(),
  "padding": PaddingSchema.optional(),
  "spacing": LayoutNodeSpacingSchema,
  "type": z.literal("stack").describe("Discriminator value for stack layouts"),
  "vertical_alignment": StackLayoutNodeAlignmentSchema.optional(),
  "width": SizeConstraintSchema.optional()
}).strict());
/**
 * Vertical stack layout - arranges children top-to-bottom.
 * 
 * Common properties:
 * - Size constraints work together: if only width is set, it defines the exact or preferred width. If min_width and max_width are set, they bound the width range. The final size is calculated by the rendering engine based on constraints and content
 */
export const VerticalStackLayoutNodeSchema: any = z.lazy(() => z.object({
  "children": z.array(LayoutChildSchema).describe("Ordered list of children to render in sequence"),
  "direction": z.literal("vertical").describe("Flow direction of children - fixed to 'vertical' for this layout type"),
  "height": SizeConstraintSchema.optional(),
  "horizontal_alignment": StackLayoutNodeAlignmentSchema.optional(),
  "id": z.string().describe("Unique identifier for this layout node"),
  "max_height": SizeConstraintSchema.optional(),
  "max_width": SizeConstraintSchema.optional(),
  "min_height": SizeConstraintSchema.optional(),
  "min_width": SizeConstraintSchema.optional(),
  "padding": PaddingSchema.optional(),
  "spacing": LayoutNodeSpacingSchema,
  "type": z.literal("stack").describe("Discriminator value for stack layouts"),
  "width": SizeConstraintSchema.optional()
}).strict());
/**
 * Linear layout that arranges children in a single row or column.
 * 
 * Stack layouts are simpler than grids and ideal for:
 * - Toolbars and navigation
 * - Form fields in sequence
 * - Card lists
 * - Any linear arrangement of components
 * 
 * Alignment works on two axes:
 * - Primary axis (direction of flow): controlled by spacing and flex behaviour
 * - Cross axis: controlled by horizontal_alignment (for vertical stacks) or vertical_alignment (for horizontal stacks)
 */
export const StackLayoutNodeSchema: any = z.lazy(() => z.discriminatedUnion("direction", [
  HorizontalStackLayoutNodeSchema,
  VerticalStackLayoutNodeSchema
]));
/**
 * A child within a grid layout with optional positioning and spanning.
 * 
 * Positioning modes:
 * - Auto-flow (default): Omit column_start and row_start - child is placed in the next available cell
 * - Explicit: Set column_start and row_start to place child at a specific grid position
 * 
 * Grid coordinates are 1-indexed (first column is 1, not 0)
 */
export const GridChildSchema: any = z.lazy(() => z.object({
  "column_span": z.number().optional().describe("Number of columns this child spans. Default: 1"),
  "column_start": z.number().optional().describe("Explicit column position (1-indexed). Omit to use auto-flow positioning"),
  "element": LayoutChildSchema.describe("The layout or component to render in this grid cell"),
  "row_span": z.number().optional().describe("Number of rows this child spans. Default: 1"),
  "row_start": z.number().optional().describe("Explicit row position (1-indexed). Omit to use auto-flow positioning")
}).strict());
/**
 * Grid layout that arranges children in rows and columns.
 * 
 * Grid layouts provide precise two-dimensional control and are ideal for:
 * - Dashboard layouts
 * - Form layouts with labels and inputs
 * - Card grids
 * - Any content requiring alignment on both axes
 * 
 * Grid supports both auto-flow (children placed automatically) and explicit positioning (using column_start/row_start on GridChild)
 */
export const GridLayoutNodeSchema: any = z.lazy(() => z.object({
  "children": z.array(GridChildSchema).describe("Children with optional positioning and spanning information"),
  "column_gap": LayoutNodeSpacingSchema.optional(),
  "columns": z.number().describe("Number of columns in the grid"),
  "height": SizeConstraintSchema.optional(),
  "id": z.string().describe("Unique identifier for this layout node"),
  "max_height": SizeConstraintSchema.optional(),
  "max_width": SizeConstraintSchema.optional(),
  "min_height": SizeConstraintSchema.optional(),
  "min_width": SizeConstraintSchema.optional(),
  "padding": PaddingSchema.optional(),
  "row_gap": LayoutNodeSpacingSchema.optional(),
  "rows": z.number().optional().describe("Optional number of rows. If omitted, rows are created automatically as needed (auto-flow)"),
  "type": z.literal("grid").describe("Discriminator value for grid layouts"),
  "width": SizeConstraintSchema.optional()
}).strict());
/** A layout node defines how child elements are arranged spatially. Can be either a stack layout (linear arrangement) or grid layout (two-dimensional arrangement) */
export const LayoutNodeSchema: any = z.lazy(() => z.discriminatedUnion("type", [
  StackLayoutNodeSchema,
  GridLayoutNodeSchema
]));
/**
 * Available component types, each optimised for specific data shapes. Components are the 'rendering primitives' of the specification system. Each type is designed to handle a particular visualisation pattern.
 * 
 * Available types:
 * - data-table: Tabular display with rows and columns (best for: tabular data shapes, spreadsheet-like views, data grids)
 * - hierarchy: Tree or nested structure display (best for: hierarchical data shapes, file explorers, org charts, JSON viewers)
 * - composition: Composed/aggregate visualisations combining multiple sub-components (best for: dashboards, multi-faceted views, complex analytical displays)
 * - text-insight: Text-based insights, summaries, or explanations (best for: key_value data shapes, insights, summaries, explanatory text)
 */
export const ComponentTypeSchema = z.enum(["data-table", "hierarchy", "composition", "text-insight"]);
/**
 * A ComponentNode is a leaf node in the layout tree that renders data.
 * 
 * ComponentNodes are stored in Component.nodes and referenced from LayoutChild nodes via their IDs. This separation enables:
 * - Component reuse across multiple layout positions
 * - Centralised component configuration
 * - Efficient lookups without tree traversal
 */
export const ComponentNodeSchema = z.object({
  "config": ComponentConfigSchema,
  "id": z.string().describe("Unique identifier for this component. Referenced by LayoutChild.component_id"),
  "type": ComponentTypeSchema
}).strict();
/** A complete component specification including layout, components, and field bindings. This is the root structure used by the rendering engine to build a component in the UI */
export const ComponentSchema = z.object({
  "accessor_bindings": z.record(z.string(), z.record(z.string(), FieldMetadataSchema)).describe(`Field metadata providing semantic information about data fields for each component.

Structure: {[component_id]: {[field_accessor]: FieldMetadata } }

This maps each component's fields to their metadata (types, roles, display hints, value mappings). The component_id keys correspond to IDs in ComponentSpec.components. The field_accessor keys use dot notation matching AffordedField.accessor syntax.

Field metadata includes:
- Semantic roles (label, value, category, etc.)
- Data types with fallback options for coercion
- Value mappings for transforming raw values to display values
- Format strings for dates and numbers

Example:
{
  "table-1": {
    "user.name": {roles: ["label"], data_types: ["string"], ...},
    "user.age": {roles: ["value"], data_types: ["number"], format: "0,0", ...}
  }
}`),
  "layout": LayoutNodeSchema,
  "nodes": z.record(z.string(), ComponentNodeSchema).describe("Registry of all component nodes used in this component, keyed by component ID. Using a Record ensures O(1) lookup performance and guarantees ID uniqueness. Components are referenced from LayoutChild nodes via their IDs")
}).strict();
/**
 * Sigil Component Specification - Intermediate Representation
 * 
 * Design principles:
 * - Specs are generated fresh for each dataset, tailored to its semantic meaning
 * - Field metadata, value mappings, and bindings are embedded directly in the spec
 * - Data values are provided separately at render time (not embedded in spec)
 * - Layout and components are separate concerns
 * - Type-specific configs via discriminated unions
 * - Everything normalised to JSON before spec generation
 * 
 * Specs are generated fresh for each dataset by LLMs or spec generators, tailored to the specific semantic meaning and structure of that data. Even datasets with identical shapes may require different specs if their semantic meaning differs.
 * 
 * The spec contains everything needed to render the visualisation:
 * - Layout structure and component arrangement
 * - Component configurations and affordances
 * - Field metadata, type information, and value mappings
 * - Data shape and structural expectations
 * 
 * The spec does NOT contain the actual data values - those are provided separately at render time. This separation allows:
 * - Lightweight serialisation and storage of specs
 * - Rendering different views of the same dataset (filtered, paginated, etc.)
 * - Versioning and evolution of specs independently from data
 * 
 * The spec is immutable once created - any modifications create a new version.
 */
export const ComponentSpecSchema = z.object({
  "created_at": z.string().describe("ISO 8601 timestamp of when this spec was created. Format: YYYY-MM-DDTHH:mm:ss.sssZ"),
  "data_shape": DataShapeSchema,
  "description": z.string().optional().describe("Optional description explaining the purpose or usage of this spec"),
  "id": z.string().describe("Unique identifier for this specification (UUID v4 recommended)"),
  "root": ComponentSchema.describe("The root node containing the full layout, components, and field bindings. This encapsulates the entire visualisation specification. The rendering engine starts here to build the UI"),
  "title": z.string().describe("Human-readable title for the visualisation")
}).strict();
