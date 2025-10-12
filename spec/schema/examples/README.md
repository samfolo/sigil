# Specification Examples

This directory contains example Sigil specifications demonstrating various features and use cases.

## Examples

### simple-table.json

A basic data table specification showcasing:
- **Data shape**: Tabular
- **Layout**: Single vertical stack with one component
- **Component**: Data table with user information
- **Affordances**:
  - Sorting (name, email, created_at)
  - Pagination (25 items per page, size options)
  - Search (name and email fields)
- **Field metadata**:
  - String fields with roles (label, sortable, searchable)
  - Date field with ISO8601 format
  - Categorical field (status) with value mappings and chip display configs

**Use case**: Simple user directory with basic table interactions

## Validating Examples

To validate examples against the bundled schema:

```bash
npm run spec:validate
```

This will check that all examples conform to the specification schema.

## Creating New Examples

When creating new examples:

1. Follow the schema structure defined in `spec/specification.schema.json`
2. Include meaningful field metadata and value mappings
3. Demonstrate specific affordances or layout patterns
4. Add appropriate comments in this README
5. Validate with `npm run spec:validate`

## Example Patterns

### Minimal Specification
- Single component
- Basic layout
- No affordances
- Minimal field metadata

### Common Table Features
- Sorting, filtering, pagination
- Search functionality
- Value mappings with display configs
- Export capabilities

### Complex Layouts
- Nested stack layouts
- Grid layouts
- Multiple components
- Component composition

### Advanced Affordances
- Complex filtering with logical conditions
- Virtualisation for large datasets
- Selection with multi-select
- Custom export configurations
