const trimReg = /(^\s*)|(\s*$)/g;

/**
 * Checks if a value is empty
 * @param obj - The value to check
 * @returns True if the value is considered empty, false otherwise
 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  
  if (typeof obj === 'string') {
    obj = obj.replace(trimReg, '');
    if (obj === '' || obj === 'null' || obj === 'undefined') {
      return true;
    }
    return false;
  }
  
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  
  if (typeof obj === 'boolean') {
    return false;
  }
  
  return false;
}

/**
 * Get deep value from object by path
 * @param obj - The object to retrieve value from
 * @param path - Path to the value, using dot notation
 * @param defaultValue - Default value to return if path not found
 * @returns The value at the path or defaultValue if not found
 */
export function getDeepValue<T>(obj: any, path: string, defaultValue: T = undefined as any): T {
  if (!obj || !path) {
    return defaultValue;
  }

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === undefined || result === null) {
      return defaultValue;
    }
    result = result[key];
  }

  return (result === undefined) ? defaultValue : result;
}

/**
 * Safely stringify a value to JSON
 * @param value - Value to stringify
 * @param defaultValue - Default value to return if stringification fails
 * @returns JSON string or defaultValue if failed
 */
export function safeJsonStringify(value: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Error stringifying value:', error);
    return defaultValue;
  }
}

/**
 * Safely parse a JSON string
 * @param value - JSON string to parse
 * @param defaultValue - Default value to return if parsing fails
 * @returns Parsed object or defaultValue if failed
 */
export function safeJsonParse<T>(value: string, defaultValue: T): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}