/**
 * Test fixtures for buildRenderTree function
 *
 * Comprehensive test cases covering:
 * - Valid specs with successful data binding
 * - Partial binding failures (some rows succeed, some fail)
 * - Complete binding failures (all rows fail)
 * - Spec errors that prevent binding
 * - Nested data with mixed success
 * - Edge cases (empty data)
 */

import type {ComponentSpec, FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {RenderTree} from '../types';

/**
 * 1. Valid spec with valid flat data - all rows bind successfully
 *
 * Scenario:
 * - Simple ComponentSpec with single data-table component
 * - Flat data array with two users
 * - All columns have matching accessors in the data
 * - Expected: Successful RenderTree with 2 rows, no errors
 */
export const VALID_SPEC_VALID_DATA = {
  spec: {
    id: 'test-valid-spec',
    title: 'User List',
    description: 'Simple user table',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'users-table',
          },
        ],
      },
      nodes: {
        'users-table': {
          id: 'users-table',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Users',
            description: 'List of users',
            columns: [
              {
                accessor: '$.name',
                label: 'Name',
              },
              {
                accessor: '$.age',
                label: 'Age',
                alignment: 'right' as const,
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'users-table': {
          '$.name': {
            roles: ['label'],
            data_types: ['string' as const],
          },
          '$.age': {
            roles: ['value'],
            data_types: ['number' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [
    {name: 'Alice', age: 30},
    {name: 'Bob', age: 25},
  ],
  expectedResult: 'Successful RenderTree with 2 rows, no errors',
};

/**
 * 2. Valid spec with partial binding failure - some rows succeed, some fail
 *
 * Scenario:
 * - ComponentSpec with two columns: valid '$.name' and invalid 'badCol'
 * - All rows will have binding errors from 'badCol' accessor
 * - Expected: Binding errors for each row from the invalid accessor
 */
export const VALID_SPEC_PARTIAL_BINDING_FAILURE = {
  spec: {
    id: 'test-partial-failure',
    title: 'Mixed Valid/Invalid',
    description: 'Table with one valid and one invalid accessor',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'mixed-table',
          },
        ],
      },
      nodes: {
        'mixed-table': {
          id: 'mixed-table',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Mixed Columns',
            columns: [
              {
                accessor: '$.name', // Valid
                label: 'Name',
              },
              {
                accessor: 'badCol', // Invalid: no $
                label: 'Bad Column',
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'mixed-table': {
          '$.name': {
            roles: ['label'],
            data_types: ['string' as const],
          },
          badCol: { // Invalid accessor
            roles: ['label'],
            data_types: ['string' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [{name: 'Alice'}, {name: 'Bob'}],
  expectedResult: '2 INVALID_ACCESSOR errors (one per row), RenderTree with errors',
};

/**
 * 3. Valid spec with all binding failures - invalid accessor syntax
 *
 * Scenario:
 * - ComponentSpec with INVALID accessor 'badAccessor' (doesn't start with $)
 * - Data array with 3 rows
 * - Expected: 3 binding errors (INVALID_ACCESSOR), error result returned
 */
export const VALID_SPEC_ALL_BINDING_FAILURE = {
  spec: {
    id: 'test-all-failures',
    title: 'Invalid Accessor Table',
    description: 'Table with invalid accessor syntax',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'invalid-table',
          },
        ],
      },
      nodes: {
        'invalid-table': {
          id: 'invalid-table',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Invalid Accessor',
            columns: [
              {
                accessor: 'badAccessor', // Invalid: doesn't start with $
                label: 'Bad Accessor',
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'invalid-table': {
          badAccessor: { // Invalid accessor
            roles: ['label'],
            data_types: ['string' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [
    {name: 'Alice', age: 30},
    {name: 'Bob', age: 25},
    {name: 'Carol', age: 28},
  ],
  expectedResult: '3 INVALID_ACCESSOR errors (one per row), error result returned',
};

/**
 * 4. Spec error prevents binding - invalid component_id
 *
 * Scenario:
 * - ComponentSpec references 'missing-component' that doesn't exist in nodes
 * - Valid data provided
 * - Expected: Spec error returned, binding never attempted
 */
export const SPEC_ERROR_AND_BINDING_ERROR = {
  spec: {
    id: 'test-spec-error',
    title: 'Invalid Component Reference',
    description: 'Spec with missing component',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'missing-component', // Does not exist in nodes
          },
        ],
      },
      nodes: {
        'actual-component': {
          id: 'actual-component',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Users',
            columns: [
              {
                accessor: '$.name',
                label: 'Name',
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'actual-component': {
          '$.name': {
            roles: ['label'],
            data_types: ['string' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [{name: 'Alice'}, {name: 'Bob'}],
  expectedResult: 'MISSING_COMPONENT spec error, binding never attempted',
};

/**
 * 5. Nested data with invalid accessor - verify path context handling
 *
 * Scenario:
 * - ComponentSpec with nested VALID accessor and INVALID accessor
 * - Testing that error paths are constructed correctly with nesting
 * - Expected: Binding errors with properly constructed paths
 */
export const NESTED_DATA_MIXED_SUCCESS = {
  spec: {
    id: 'test-nested-mixed',
    title: 'Nested with Invalid',
    description: 'Table with nested valid accessor and invalid accessor',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'nested-table',
          },
        ],
      },
      nodes: {
        'nested-table': {
          id: 'nested-table',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Nested Data',
            columns: [
              {
                accessor: '$.company.department.name', // Valid
                label: 'Department',
              },
              {
                accessor: 'invalid', // Invalid: no $
                label: 'Bad Accessor',
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'nested-table': {
          '$.company.department.name': {
            roles: ['label'],
            data_types: ['string' as const],
          },
          invalid: { // Invalid accessor
            roles: ['label'],
            data_types: ['string' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [
    {company: {department: {name: 'Engineering'}}},
    {company: {department: {name: 'Sales'}}},
  ],
  expectedResult: 'Binding errors with correctly constructed error paths',
};

/**
 * 6. Valid spec with empty data array - edge case
 *
 * Scenario:
 * - Valid ComponentSpec with proper structure
 * - Empty data array []
 * - Expected: Successful RenderTree with 0 rows, no errors
 */
export const EMPTY_DATA = {
  spec: {
    id: 'test-empty-data',
    title: 'Empty Table',
    description: 'Table with no data',
    created_at: '2025-10-18T00:00:00Z',
    data_shape: 'tabular' as const,
    root: {
      layout: {
        type: 'stack' as const,
        direction: 'vertical' as const,
        id: 'root-layout',
        spacing: 'normal' as const,
        children: [
          {
            type: 'component' as const,
            component_id: 'empty-table',
          },
        ],
      },
      nodes: {
        'empty-table': {
          id: 'empty-table',
          type: 'data-table' as const,
          config: {
            type: 'data-table' as const,
            title: 'Empty',
            columns: [
              {
                accessor: '$.name',
                label: 'Name',
              },
              {
                accessor: '$.value',
                label: 'Value',
                alignment: 'right' as const,
              },
            ],
            affordances: [],
          },
        },
      },
      accessor_bindings: {
        'empty-table': {
          '$.name': {
            roles: ['label'],
            data_types: ['string' as const],
          },
          '$.value': {
            roles: ['value'],
            data_types: ['number' as const],
          },
        } satisfies Record<string, FieldMetadata>,
      },
    },
  } satisfies ComponentSpec,
  data: [],
  expectedResult: 'Successful RenderTree with 0 rows, no errors',
};

/**
 * Expected RenderTree for VALID_SPEC_VALID_DATA fixture
 *
 * This shows the complete expected output structure after buildRenderTree
 * successfully processes the spec and data.
 */
export const EXPECTED_VALID_RENDER_TREE: RenderTree = {
  type: 'data-table',
  props: {
    title: 'Users',
    description: 'List of users',
    columns: [
      {
        id: '$.name',
        label: 'Name',
        dataType: 'string',
        alignment: undefined,
      },
      {
        id: '$.age',
        label: 'Age',
        dataType: 'number',
        alignment: 'right',
      },
    ],
    data: [
      {
        id: 'row-0',
        cells: {
          '$.name': {
            raw: 'Alice',
            display: 'Alice',
            dataType: 'string',
            format: undefined,
          },
          '$.age': {
            raw: 30,
            display: '30',
            dataType: 'number',
            format: undefined,
          },
        },
      },
      {
        id: 'row-1',
        cells: {
          '$.name': {
            raw: 'Bob',
            display: 'Bob',
            dataType: 'string',
            format: undefined,
          },
          '$.age': {
            raw: 25,
            display: '25',
            dataType: 'number',
            format: undefined,
          },
        },
      },
    ],
  },
};
