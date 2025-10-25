import {XMLParser} from 'fast-xml-parser';
import yaml from 'js-yaml';
import Papa from 'papaparse';

export const parseJSON = (data: string): unknown | null => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export const parseCSV = (data: string): unknown | null => {
  try {
    const result = Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (result.errors.length > 0) {
      return null;
    }

    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

export const parseYAML = (data: string): unknown | null => {
  try {
    const result = yaml.load(data);

    if (result === null || result === undefined) {
      return null;
    }

    // Check if result is an empty object
    if (typeof result === 'object' && Object.keys(result).length === 0 && !Array.isArray(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

export const parseXML = (data: string): unknown | null => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const result = parser.parse(data);

    // XML parser returns {} for invalid XML - treat as failure
    if (result === null || result === undefined) {
      return null;
    }

    if (typeof result === 'object' && Object.keys(result).length === 0 && !Array.isArray(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
