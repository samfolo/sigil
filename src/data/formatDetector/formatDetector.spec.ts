import {describe, expect, it} from 'vitest';

import {detectFormat} from './formatDetector';

describe('detectFormat', () => {
  it('should detect JSON format', () => {
    const input = '{"name": "John", "age": 30}';
    const result = detectFormat(input);
    expect(result.format).toBe('json');
    expect(result.data).toEqual({name: 'John', age: 30});
  });

  it('should detect JSON array format', () => {
    const input = '[{"id": 1}, {"id": 2}]';
    const result = detectFormat(input);
    expect(result.format).toBe('json');
    expect(result.data).toEqual([{id: 1}, {id: 2}]);
  });

  it('should detect CSV format', () => {
    const input = 'name,age\nJohn,30\nJane,25';
    const result = detectFormat(input);
    expect(result.format).toBe('csv');
    expect(result.data).toEqual([
      {name: 'John', age: 30},
      {name: 'Jane', age: 25},
    ]);
  });

  it('should detect YAML format', () => {
    const input = 'name: John\nage: 30';
    const result = detectFormat(input);
    expect(result.format).toBe('yaml');
    expect(result.data).toEqual({name: 'John', age: 30});
  });

  it('should detect XML format', () => {
    const input = '<person><name>John</name><age>30</age></person>';
    const result = detectFormat(input);
    expect(result.format).toBe('xml');
    expect(result.data).toEqual({person: {name: 'John', age: 30}});
  });

  it('should return unknown for empty string', () => {
    const result = detectFormat('');
    expect(result.format).toBe('unknown');
    expect(result.data).toBe(null);
  });

  it('should return unknown for whitespace only', () => {
    const result = detectFormat('   \n  \t  ');
    expect(result.format).toBe('unknown');
    expect(result.data).toBe(null);
  });

  it('should return unknown for plain text without structure', () => {
    const result = detectFormat('this is not valid data in any format');
    expect(result.format).toBe('unknown');
    expect(result.data).toBe(null);
  });

  it('should prioritise JSON over YAML for valid JSON', () => {
    const input = '{"key": "value"}';
    const result = detectFormat(input);
    expect(result.format).toBe('json');
  });

  it('should detect XML before CSV', () => {
    const input = '<root><item>value</item></root>';
    const result = detectFormat(input);
    expect(result.format).toBe('xml');
  });

  it('should handle complex nested JSON', () => {
    const input = '{"users": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}';
    const result = detectFormat(input);
    expect(result.format).toBe('json');
    expect(result.data).toEqual({
      users: [
        {name: 'John', age: 30},
        {name: 'Jane', age: 25},
      ],
    });
  });
});
