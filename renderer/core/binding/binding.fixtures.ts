/**
 * Test fixtures for data binding utilities
 *
 * Comprehensive test cases covering:
 * - Simple flat data structures
 * - Nested objects and arrays
 * - Deep nesting scenarios
 * - Invalid accessor paths
 * - Mixed success/failure cases
 * - Edge cases (empty, null, undefined)
 */

import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

/**
 * 1. Simple flat data - basic object properties
 */
export const SIMPLE_FLAT_DATA = {
	data: [
		{name: 'Alice Johnson', age: 28, active: true},
		{name: 'Bob Smith', age: 34, active: false},
		{name: 'Carol Williams', age: 42, active: true},
	],
	columns: [
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].age', label: 'Age', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].active', label: 'Status', dataType: 'boolean', alignment: 'center' as const},
	],
	accessorBindings: {
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].age': {
			data_types: ['number' as const],
			roles: ['value'],
		},
		'$[*].active': {
			data_types: ['boolean' as const],
			roles: ['category'],
			value_mappings: {
				'true': {display_value: 'Active'},
				'false': {display_value: 'Inactive'},
			},
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'All rows should bind successfully with value mappings applied to active field',
};

/**
 * 2. Nested object data - accessing properties through object hierarchy
 */
export const NESTED_OBJECT_DATA = {
	data: [
		{
			user: {
				profile: {
					name: 'David Chen',
					email: 'david.chen@example.com',
				},
			},
		},
		{
			user: {
				profile: {
					name: 'Emma Davis',
					email: 'emma.davis@example.com',
				},
			},
		},
	],
	columns: [
		{id: '$[*].user.profile.name', label: 'Full Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].user.profile.email', label: 'Email Address', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].user.profile.name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].user.profile.email': {
			data_types: ['string' as const],
			roles: ['id'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Nested object properties should be accessed correctly via JSONPath',
};

/**
 * 3. Data with arrays in rows - accessing array elements by index
 */
export const DATA_WITH_ARRAYS = {
	data: [
		{
			product: 'Laptop',
			tags: ['electronics', 'computers', 'portable'],
			scores: [8.5, 9.2, 7.8],
		},
		{
			product: 'Phone',
			tags: ['electronics', 'mobile', 'communication'],
			scores: [9.0, 8.7, 9.5],
		},
		{
			product: 'Tablet',
			tags: ['electronics', 'portable', 'touchscreen'],
			scores: [8.0, 8.5, 8.2],
		},
	],
	columns: [
		{id: '$[*].product', label: 'Product', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].tags[0]', label: 'Primary Tag', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].scores[1]', label: 'Quality Score', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*].product': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].tags[0]': {
			data_types: ['string' as const],
			roles: ['category'],
		},
		'$[*].scores[1]': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '0.0',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Array indices should be accessed correctly, returning specific elements',
};

/**
 * 4. Deeply nested structures - three levels of nesting
 */
export const DEEPLY_NESTED_DATA = {
	data: [
		{
			company: {
				department: {
					employees: [
						{name: 'Frank Lee', role: 'Manager'},
						{name: 'Grace Taylor', role: 'Developer'},
					],
					budget: 150000,
				},
			},
		},
		{
			company: {
				department: {
					employees: [
						{name: 'Henry Wilson', role: 'Designer'},
						{name: 'Iris Martinez', role: 'Developer'},
					],
					budget: 200000,
				},
			},
		},
	],
	columns: [
		{id: '$[*].company.department.employees[0].name', label: 'Lead Employee', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].company.department.employees[0].role', label: 'Lead Role', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].company.department.budget', label: 'Budget', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*].company.department.employees[0].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].company.department.employees[0].role': {
			data_types: ['string' as const],
			roles: ['category'],
		},
		'$[*].company.department.budget': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '£0,0',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Deep nesting with array access should work, format should be applied to budget',
};

/**
 * 5a. Invalid accessor - non-existent field
 */
export const INVALID_ACCESSOR_MISSING_FIELD = {
	data: [
		{name: 'John Doe', age: 30},
		{name: 'Jane Smith', age: 25},
	],
	columns: [
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].email', label: 'Email', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].email': {
			data_types: ['string' as const],
			roles: ['id'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Email field does not exist - should return undefined for email cells',
};

/**
 * 5b. Invalid accessor - wrong array index
 */
export const INVALID_ACCESSOR_ARRAY_INDEX = {
	data: [
		{items: ['first', 'second']},
		{items: ['alpha', 'beta']},
	],
	columns: [
		{id: '$[*].items[0]', label: 'First Item', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].items[5]', label: 'Sixth Item', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].items[0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].items[5]': {
			data_types: ['string' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Index 5 is out of bounds - should return undefined for second column',
};

/**
 * 5c. Invalid accessor - returns array when single value expected
 */
export const INVALID_ACCESSOR_ARRAY_RETURNED = {
	data: [
		{tags: ['tag1', 'tag2', 'tag3']},
		{tags: ['alpha', 'beta']},
	],
	columns: [
		{id: '$[*].tags', label: 'Tags', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].tags': {
			data_types: ['string' as const],
			roles: ['category'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Accessor returns full array - should stringify array as display value',
};

/**
 * 6. Mixed success/failure - some rows have field, others do not
 */
export const MIXED_SUCCESS_FAILURE_DATA = {
	data: [
		{id: 1, name: 'Complete Record', optionalField: 'Present'},
		{id: 2, name: 'Partial Record'}, // optionalField missing
		{id: 3, name: 'Another Complete', optionalField: 'Also Present'},
		{id: 4, name: 'Another Partial'}, // optionalField missing
	],
	columns: [
		{id: '$[*].id', label: 'ID', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].optionalField', label: 'Optional', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].id': {
			data_types: ['number' as const],
			roles: ['id'],
		},
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].optionalField': {
			data_types: ['string' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Rows with missing optionalField should have undefined raw value and empty display string',
};

/**
 * 7a. Empty data array
 */
export const EMPTY_DATA_ARRAY = {
	data: [],
	columns: [
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].value', label: 'Value', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].value': {
			data_types: ['number' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Empty data array should return empty rows array',
};

/**
 * 7b. Data with null values
 */
export const DATA_WITH_NULL_VALUES = {
	data: [
		{id: 1, name: 'Alice', status: null},
		{id: 2, name: null, status: 'active'},
		{id: 3, name: 'Charlie', status: null},
	],
	columns: [
		{id: '$[*].id', label: 'ID', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].status', label: 'Status', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].id': {
			data_types: ['number' as const],
			roles: ['id'],
		},
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].status': {
			data_types: ['string' as const],
			roles: ['category'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Null values should result in empty display strings',
};

/**
 * 7c. Data with undefined values
 */
export const DATA_WITH_UNDEFINED_VALUES = {
	data: [
		{id: 1, name: 'Test', value: undefined},
		{id: 2, name: undefined, value: 42},
	],
	columns: [
		{id: '$[*].id', label: 'ID', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].value', label: 'Value', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*].id': {
			data_types: ['number' as const],
			roles: ['id'],
		},
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].value': {
			data_types: ['number' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Undefined values should result in empty display strings',
};

/**
 * 8. Nested path context - data already located at a nested path
 */
export const NESTED_PATH_CONTEXT = {
	data: [
		{userId: 101, userName: 'Alice'},
		{userId: 102, userName: 'Bob'},
	],
	columns: [
		{id: '$[*].userId', label: 'User ID', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].userName', label: 'User Name', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].userId': {
			data_types: ['number' as const],
			roles: ['id'],
		},
		'$[*].userName': {
			data_types: ['string' as const],
			roles: ['label'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$', '.data', '.users'],
	expectedResult: 'Path context should build row paths like ["$", ".data", ".users", "[0]"]',
};

/**
 * 9. Complex value mappings with multiple transformations
 */
export const COMPLEX_VALUE_MAPPINGS = {
	data: [
		{priority: 1, severity: 'high', count: 5},
		{priority: 2, severity: 'medium', count: 12},
		{priority: 3, severity: 'low', count: 28},
	],
	columns: [
		{id: '$[*].priority', label: 'Priority', dataType: 'number', alignment: 'center' as const},
		{id: '$[*].severity', label: 'Severity', dataType: 'string', alignment: 'center' as const},
		{id: '$[*].count', label: 'Count', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*].priority': {
			data_types: ['number' as const],
			roles: ['category'],
			value_mappings: {
				'1': {display_value: 'Critical'},
				'2': {display_value: 'Important'},
				'3': {display_value: 'Normal'},
			},
		},
		'$[*].severity': {
			data_types: ['string' as const],
			roles: ['category'],
			value_mappings: {
				'high': {display_value: 'High Risk'},
				'medium': {display_value: 'Medium Risk'},
				'low': {display_value: 'Low Risk'},
			},
		},
		'$[*].count': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '0,0',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Multiple value mappings should be applied correctly, numbers should be formatted',
};

/**
 * 10. Single row with single column - minimal test case
 */
export const SINGLE_ROW_SINGLE_COLUMN = {
	data: [{name: 'Single'}],
	columns: [
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Single row with single column should bind successfully',
};

/**
 * 11. All columns undefined - empty object with missing fields
 */
export const ALL_COLUMNS_UNDEFINED = {
	data: [{}],
	columns: [
		{id: '$[*].missing1', label: 'Missing 1', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].missing2', label: 'Missing 2', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*].missing1': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].missing2': {
			data_types: ['string' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'All columns returning undefined should produce empty display strings',
};

/**
 * 12. Invalid accessor - does not start with $
 */
export const INVALID_ACCESSOR_NO_DOLLAR_PREFIX = {
	data: [{name: 'Test'}],
	columns: [
		{id: 'name', label: 'Name', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		name: {
			data_types: ['string' as const],
			roles: ['label'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Accessor without $ prefix should produce INVALID_ACCESSOR error',
};

/**
 * 13. Multiple rows with invalid accessor - error accumulation
 */
export const MULTIPLE_ROWS_INVALID_ACCESSOR = {
	data: [{name: 'Test1'}, {name: 'Test2'}, {name: 'Test3'}],
	columns: [
		{id: 'invalid', label: 'Invalid', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		invalid: {
			data_types: ['string' as const],
			roles: ['label'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Should accumulate one error per row for invalid accessor',
};

/**
 * 14. Invalid accessor with path context - verify error path construction
 */
export const INVALID_ACCESSOR_WITH_PATH_CONTEXT = {
	data: [{name: 'Test1'}, {name: 'Test2'}],
	columns: [
		{id: 'bad', label: 'Bad', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		bad: {
			data_types: ['string' as const],
			roles: ['label'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Error paths should be $[0] and $[1] for rows 0 and 1',
};

/**
 * 15. CSV Array-of-arrays data - basic functionality
 */
export const CSV_ARRAY_OF_ARRAYS_BASIC = {
	data: [
		['Product Name', 'Description', 'Price'],        // Header row
		['Smart Watch', 'Features: GPS tracking', 299.99], // Data row
		['Wireless Earbuds', 'Noise cancelling', 149.99],  // Data row
		['Tablet', '10-inch display', 399.99],              // Data row
	],
	columns: [
		{id: '$[*][0]', label: 'Product Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1]', label: 'Description', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][2]', label: 'Price (USD)', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*][0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][1]': {
			data_types: ['string' as const],
			roles: ['description'],
		},
		'$[*][2]': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '$0,0.00',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'CSV array-of-arrays should skip header row and bind data rows correctly',
};

/**
 * 16. CSV Array-of-arrays with value mappings
 */
export const CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS = {
	data: [
		['Name', 'Status', 'Score'],     // Header row
		['Alice', 'A', 95],              // Data row
		['Bob', 'I', 67],                // Data row
		['Carol', 'A', 89],              // Data row
	],
	columns: [
		{id: '$[*][0]', label: 'Student Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1]', label: 'Status', dataType: 'string', alignment: 'center' as const},
		{id: '$[*][2]', label: 'Score', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*][0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][1]': {
			data_types: ['string' as const],
			roles: ['category'],
			value_mappings: {
				'A': {display_value: 'Active'},
				'I': {display_value: 'Inactive'},
			},
		},
		'$[*][2]': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '0',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'CSV data with value mappings should transform status codes to display values',
};

/**
 * 17. CSV Array-of-arrays empty data
 */
export const CSV_ARRAY_OF_ARRAYS_EMPTY = {
	data: [
		['Name', 'Value'],  // Header only, no data rows
	],
	columns: [
		{id: '$[*][0]', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1]', label: 'Value', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*][0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][1]': {
			data_types: ['number' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'CSV with header only should return empty rows array',
};

/**
 * 18. CSV Array-of-arrays with missing values
 */
export const CSV_ARRAY_OF_ARRAYS_MISSING_VALUES = {
	data: [
		['Name', 'Email', 'Phone'],              // Header row
		['Alice Johnson', 'alice@test.com'],     // Missing phone
		['Bob Smith', null, '555-0123'],         // null email
		['Carol'],                               // Missing email and phone
	],
	columns: [
		{id: '$[*][0]', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1]', label: 'Email', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][2]', label: 'Phone', dataType: 'string', alignment: 'left' as const},
	],
	accessorBindings: {
		'$[*][0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][1]': {
			data_types: ['string' as const],
			roles: ['id'],
		},
		'$[*][2]': {
			data_types: ['string' as const],
			roles: ['contact'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Missing array indices should result in null raw values and empty display strings',
};

/**
 * 19. Object-of-objects basic - homogenous key-value data with property name column
 */
export const OBJECT_OF_OBJECTS_BASIC = {
	data: {
		user_123: {name: 'Alice Johnson', role: 'Admin', active: true},
		user_456: {name: 'Bob Smith', role: 'User', active: false},
		user_789: {name: 'Carol Williams', role: 'Editor', active: true},
	},
	columns: [
		{id: '$[*]~', label: 'User ID', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].name', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].role', label: 'Role', dataType: 'string', alignment: 'center' as const},
		{id: '$[*].active', label: 'Status', dataType: 'boolean', alignment: 'center' as const},
	],
	accessorBindings: {
		'$[*]~': {
			data_types: ['string' as const],
			roles: ['identifier'],
		},
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].role': {
			data_types: ['string' as const],
			roles: ['categorical'],
		},
		'$[*].active': {
			data_types: ['boolean' as const],
			roles: ['categorical'],
			value_mappings: {
				'true': {display_value: 'Active'},
				'false': {display_value: 'Inactive'},
			},
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Object-of-objects should extract property names with ~ and values with property accessors',
};

/**
 * 20. Object-of-objects without keys column - just value properties
 */
export const OBJECT_OF_OBJECTS_NO_KEYS = {
	data: {
		product_1: {name: 'Laptop', price: 999.99, inStock: true},
		product_2: {name: 'Mouse', price: 29.99, inStock: false},
		product_3: {name: 'Keyboard', price: 79.99, inStock: true},
	},
	columns: [
		{id: '$[*].name', label: 'Product Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].price', label: 'Price', dataType: 'number', alignment: 'right' as const},
		{id: '$[*].inStock', label: 'Availability', dataType: 'boolean', alignment: 'center' as const},
	],
	accessorBindings: {
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].price': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '$0,0.00',
		},
		'$[*].inStock': {
			data_types: ['boolean' as const],
			roles: ['categorical'],
			value_mappings: {
				'true': {display_value: 'In Stock'},
				'false': {display_value: 'Out of Stock'},
			},
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Object values should be extracted correctly without keys column',
};

/**
 * 21. Object-of-objects nested properties
 */
export const OBJECT_OF_OBJECTS_NESTED = {
	data: {
		dept_eng: {
			name: 'Engineering',
			lead: {name: 'Alice Chen', email: 'alice@example.com'},
			budget: 500000,
		},
		dept_sales: {
			name: 'Sales',
			lead: {name: 'Bob Martinez', email: 'bob@example.com'},
			budget: 300000,
		},
	},
	columns: [
		{id: '$[*]~', label: 'Department ID', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].name', label: 'Department Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].lead.name', label: 'Department Lead', dataType: 'string', alignment: 'left' as const},
		{id: '$[*].budget', label: 'Budget', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*]~': {
			data_types: ['string' as const],
			roles: ['identifier'],
		},
		'$[*].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].lead.name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*].budget': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '$0,0',
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Nested properties within object values should be accessible',
};

/**
 * 22. Object-of-arrays - mixed data structure
 */
export const OBJECT_OF_ARRAYS = {
	data: {
		row_1: ['Alice Johnson', 'alice@example.com', 28],
		row_2: ['Bob Smith', 'bob@example.com', 34],
		row_3: ['Carol Williams', 'carol@example.com', 42],
	},
	columns: [
		{id: '$[*]~', label: 'Row ID', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][0]', label: 'Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1]', label: 'Email', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][2]', label: 'Age', dataType: 'number', alignment: 'right' as const},
	],
	accessorBindings: {
		'$[*]~': {
			data_types: ['string' as const],
			roles: ['identifier'],
		},
		'$[*][0]': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][1]': {
			data_types: ['string' as const],
			roles: ['id'],
		},
		'$[*][2]': {
			data_types: ['number' as const],
			roles: ['value'],
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Object-of-arrays should support both property name column and positional array access',
};

/**
 * 23. Array-of-arrays with object properties - mixed accessor pattern
 *
 * Tests the pattern $[*][N].property where array elements are objects.
 * This verifies that the regex correctly identifies this as array-of-arrays binding
 * while supporting property access on the nested objects.
 */
export const ARRAY_OF_ARRAYS_WITH_OBJECTS = {
	data: [
		['Product', 'Details', 'Status'], // Header row
		[{name: 'Laptop', sku: 'LAP-001'}, {description: 'High-performance laptop', price: 1299.99}, {active: true, stock: 5}],
		[{name: 'Mouse', sku: 'MOU-001'}, {description: 'Wireless mouse', price: 29.99}, {active: true, stock: 50}],
		[{name: 'Keyboard', sku: 'KEY-001'}, {description: 'Mechanical keyboard', price: 129.99}, {active: false, stock: 0}],
	],
	columns: [
		{id: '$[*][0].name', label: 'Product Name', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][0].sku', label: 'SKU', dataType: 'string', alignment: 'left' as const},
		{id: '$[*][1].price', label: 'Price', dataType: 'number', alignment: 'right' as const},
		{id: '$[*][2].active', label: 'Status', dataType: 'boolean', alignment: 'center' as const},
	],
	accessorBindings: {
		'$[*][0].name': {
			data_types: ['string' as const],
			roles: ['label'],
		},
		'$[*][0].sku': {
			data_types: ['string' as const],
			roles: ['identifier'],
		},
		'$[*][1].price': {
			data_types: ['number' as const],
			roles: ['value'],
			format: '$0,0.00',
		},
		'$[*][2].active': {
			data_types: ['boolean' as const],
			roles: ['categorical'],
			value_mappings: {
				'true': {display_value: 'Active'},
				'false': {display_value: 'Inactive'},
			},
		},
	} satisfies Record<string, FieldMetadata>,
	pathContext: ['$'],
	expectedResult: 'Array-of-arrays with nested objects should support mixed accessor patterns like $[*][0].property',
};
