import { useState, useEffect } from 'react';

/**
 * Debounces a rapidly changing value (e.g., search query input).
 * @param {*} value - The input value to debounce
 * @param {number} delay - Delay in milliseconds (default: 280ms)
 * @returns {*} Debounced value
 */
export function useDebounce(value, delay = 280) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
