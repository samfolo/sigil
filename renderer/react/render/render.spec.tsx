/**
 * Integration tests for render function
 *
 * These tests verify the full rendering pipeline from ComponentSpec to
 * React elements, including buildRenderTree processing, data transformation,
 * and error handling.
 */

import {render as renderComponent, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ERROR_CODES, SpecProcessingError} from '@sigil/src/common/errors';
import type {ComponentType} from '@sigil/src/lib/generated/types/specification';

import {render} from './render';
import {
  EMPTY_DATA,
  INVALID_COMPONENT_ID_SPEC,
  NESTED_ACCESSOR_DATA,
  NESTED_ACCESSOR_SPEC,
  SIMPLE_USER_DATA,
  SIMPLE_USER_SPEC,
  TYPE_MISMATCH_SPEC,
} from './render.fixtures';

describe('render', () => {
  describe('Successful Rendering', () => {
    it('should render valid ComponentSpec as React element', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);

      // Should return a React element
      expect(element).toBeTruthy();
      expect(element.type).toBeTruthy();
    });

    it('should pass correct TableProps to DataTable', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);

      // Render the element to verify it displays correctly
      renderComponent(element);

      // Verify table title from spec
      expect(screen.getByText('Users')).toBeInTheDocument();

      // Verify column headers
      expect(screen.getByRole('columnheader', {name: 'Full Name'})).toBeInTheDocument();
      expect(screen.getByRole('columnheader', {name: 'Email Address'})).toBeInTheDocument();
      expect(screen.getByRole('columnheader', {name: 'Status'})).toBeInTheDocument();
    });

    it('should transform data correctly', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);
      renderComponent(element);

      // Verify data rows are rendered
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should apply value mappings from accessor_bindings', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);
      renderComponent(element);

      // Status values should be mapped: 'active' → 'Active', 'inactive' → 'Inactive'
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();

      // Raw values should not appear
      expect(screen.queryByText('active')).not.toBeInTheDocument();
      expect(screen.queryByText('inactive')).not.toBeInTheDocument();
    });

    it('should handle nested data accessors', () => {
      const element = render(NESTED_ACCESSOR_SPEC, NESTED_ACCESSOR_DATA);
      renderComponent(element);

      // Verify nested accessor extraction works
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  describe('Empty Data', () => {
    it('should render table with no rows when data is empty', () => {
      const element = render(SIMPLE_USER_SPEC, EMPTY_DATA);
      renderComponent(element);

      // Headers should still render
      expect(screen.getByRole('columnheader', {name: 'Full Name'})).toBeInTheDocument();

      // Empty state should show
      expect(screen.getByText('No results')).toBeInTheDocument();
    });

    it('should not throw when data array is empty', () => {
      expect(() => {
        render(SIMPLE_USER_SPEC, EMPTY_DATA);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw when buildRenderTree fails - invalid component_id', () => {
      expect(() => {
        render(INVALID_COMPONENT_ID_SPEC, []);
      }).toThrow(SpecProcessingError);
    });

    it('should throw when buildRenderTree fails - type mismatch', () => {
      expect(() => {
        render(TYPE_MISMATCH_SPEC, []);
      }).toThrow(SpecProcessingError);
    });

    it('should provide descriptive error messages', () => {
      try {
        render(INVALID_COMPONENT_ID_SPEC, []);
      } catch (error) {
        expect(error).toBeInstanceOf(SpecProcessingError);
        if (error instanceof SpecProcessingError) {
          // Should contain formatted error message
          expect(error.message).toMatch(/missing component/i);
          // Should have structured errors attached
          expect(error.errors).toHaveLength(1);
          expect(error.errors.at(0)?.code).toBe(ERROR_CODES.MISSING_COMPONENT);
        }
      }
    });

    it('should throw for unknown render node types', () => {
      // Create a spec that would produce an unknown type
      // This tests the default case in the switch statement
      const invalidSpec = {
        ...SIMPLE_USER_SPEC,
        root: {
          ...SIMPLE_USER_SPEC.root,
          nodes: {
            'users-table': {
              ...SIMPLE_USER_SPEC.root.nodes['users-table'],
              // Force an unknown type through type assertion
              type: 'unknown-type' as unknown as ComponentType,
            },
          },
        },
      };

      expect(() => {
        render(invalidSpec, []);
      }).toThrow();
    });
  });

  describe('Data Transformation Pipeline', () => {
    it('should handle multiple rows correctly', () => {
      const multiRowData = [
        {name: 'User 1', email: 'user1@test.com', status: 'active'},
        {name: 'User 2', email: 'user2@test.com', status: 'inactive'},
        {name: 'User 3', email: 'user3@test.com', status: 'active'},
        {name: 'User 4', email: 'user4@test.com', status: 'inactive'},
      ];

      const element = render(SIMPLE_USER_SPEC, multiRowData);
      renderComponent(element);

      // All 4 rows should render
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('User 3')).toBeInTheDocument();
      expect(screen.getByText('User 4')).toBeInTheDocument();
    });

    it('should handle missing accessor_bindings gracefully', () => {
      // Create spec without accessor_bindings for a column
      const specWithMissingBindings = {
        ...SIMPLE_USER_SPEC,
        root: {
          ...SIMPLE_USER_SPEC.root,
          accessor_bindings: {
            'users-table': {
              // Only include name, omit email and status
              name: {
                roles: ['label'],
                data_types: ['string'],
              },
            },
          },
        },
      };

      const element = render(specWithMissingBindings, SIMPLE_USER_DATA);
      renderComponent(element);

      // Should still render, using defaults for missing bindings
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('should handle nested object data structures', () => {
      const element = render(NESTED_ACCESSOR_SPEC, NESTED_ACCESSOR_DATA);
      renderComponent(element);

      // Nested accessors should extract deeply nested values
      // user.name
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // user.profile.email (two levels deep)
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  describe('Component Type Handling', () => {
    it('should render data-table type correctly', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);

      // Should be a DataTable component
      renderComponent(element);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should pass through all table properties', () => {
      const element = render(SIMPLE_USER_SPEC, SIMPLE_USER_DATA);
      renderComponent(element);

      // Title and description should pass through
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('List of all users in the system')).toBeInTheDocument();

      // Alignment should be preserved
      const statusHeader = screen.getByRole('columnheader', {name: 'Status'});
      expect(statusHeader).toHaveClass('text-center');
    });
  });

  describe('Edge Cases', () => {
    it('should handle data with undefined values', () => {
      const dataWithUndefined = [
        {name: 'Alice', email: undefined, status: 'active'},
      ];

      const element = render(SIMPLE_USER_SPEC, dataWithUndefined);
      renderComponent(element);

      // Name should render
      expect(screen.getByText('Alice')).toBeInTheDocument();

      // Undefined email should render as empty
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should handle data with null values', () => {
      const dataWithNull = [{name: 'Bob', email: null, status: null}];

      const element = render(SIMPLE_USER_SPEC, dataWithNull);
      renderComponent(element);

      // Name should render
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // Null values should be handled gracefully
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle empty objects in data array', () => {
      const emptyObjectData = [{}];

      const element = render(SIMPLE_USER_SPEC, emptyObjectData);
      renderComponent(element);

      // Table should render with empty cells
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Should not crash
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
