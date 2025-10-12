import {describe, expect, it} from 'vitest';

import {parseCSV, parseJSON, parseXML, parseYAML} from './parsers';

describe('parseJSON', () => {
	it('should parse valid JSON', () => {
		const result = parseJSON('{"name": "John", "age": 30}');
		expect(result).toEqual({name: 'John', age: 30});
	});

	it('should return null for invalid JSON', () => {
		const result = parseJSON('{invalid json}');
		expect(result).toBe(null);
	});

	it('should return null for empty string', () => {
		const result = parseJSON('');
		expect(result).toBe(null);
	});

	it('should parse JSON arrays', () => {
		const result = parseJSON('[1, 2, 3]');
		expect(result).toEqual([1, 2, 3]);
	});
});

describe('parseCSV', () => {
	it('should parse valid CSV with headers', () => {
		const csv = 'name,age\nJohn,30\nJane,25';
		const result = parseCSV(csv);
		expect(result).toEqual([
			{name: 'John', age: 30},
			{name: 'Jane', age: 25},
		]);
	});

	it('should return null for empty CSV', () => {
		const result = parseCSV('');
		expect(result).toBe(null);
	});

	it('should skip empty lines', () => {
		const csv = 'name,age\nJohn,30\n\nJane,25';
		const result = parseCSV(csv);
		expect(result).toEqual([
			{name: 'John', age: 30},
			{name: 'Jane', age: 25},
		]);
	});

	it('should handle dynamic typing', () => {
		const csv = 'name,age,active\nJohn,30,true\nJane,25,false';
		const result = parseCSV(csv);
		expect(result).toEqual([
			{name: 'John', age: 30, active: true},
			{name: 'Jane', age: 25, active: false},
		]);
	});

	it('should return null for CSV with only headers', () => {
		const result = parseCSV('name,age');
		expect(result).toBe(null);
	});
});

describe('parseYAML', () => {
	it('should parse valid YAML object', () => {
		const yaml = 'name: John\nage: 30';
		const result = parseYAML(yaml);
		expect(result).toEqual({name: 'John', age: 30});
	});

	it('should parse valid YAML array', () => {
		const yaml = '- item1\n- item2\n- item3';
		const result = parseYAML(yaml);
		expect(result).toEqual(['item1', 'item2', 'item3']);
	});

	it('should return null for empty YAML', () => {
		const result = parseYAML('');
		expect(result).toBe(null);
	});

	it('should return null for empty object', () => {
		const result = parseYAML('{}');
		expect(result).toBe(null);
	});

	it('should parse nested YAML', () => {
		const yaml = 'person:\n  name: John\n  age: 30';
		const result = parseYAML(yaml);
		expect(result).toEqual({person: {name: 'John', age: 30}});
	});

	it('should return null for invalid YAML', () => {
		const result = parseYAML('invalid: yaml: structure:');
		expect(result).toBe(null);
	});
});

describe('parseXML', () => {
	it('should parse valid XML', () => {
		const xml = '<person><name>John</name><age>30</age></person>';
		const result = parseXML(xml);
		expect(result).toEqual({person: {name: 'John', age: 30}});
	});

	it('should return null for empty XML', () => {
		const result = parseXML('');
		expect(result).toBe(null);
	});

	it('should parse empty XML elements', () => {
		const result = parseXML('<root></root>');
		expect(result).toEqual({root: ''});
	});

	it('should parse XML with attributes', () => {
		const xml = '<person id="1"><name>John</name></person>';
		const result = parseXML(xml);
		expect(result).toEqual({person: {'@_id': '1', name: 'John'}});
	});

	it('should parse nested XML', () => {
		const xml = '<root><person><name>John</name><age>30</age></person></root>';
		const result = parseXML(xml);
		expect(result).toEqual({root: {person: {name: 'John', age: 30}}});
	});

	it('should parse unclosed XML elements leniently', () => {
		const result = parseXML('<invalid><unclosed>');
		// fast-xml-parser is lenient and auto-closes unclosed tags
		expect(result).toEqual({invalid: {unclosed: ''}});
	});
});
