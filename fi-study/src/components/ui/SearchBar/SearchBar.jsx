import { useState, useEffect } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import './search-bar.css';

export default function SearchBar({
  placeholder = 'Search notes, tags, content...',
  onSearch,
  delay = 220,
  initialValue = ''
}) {
  const [rawQuery, setRawQuery] = useState(initialValue);
  const debouncedQuery = useDebounce(rawQuery, delay);

  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  function handleClear() {
    setRawQuery('');
    if (onSearch) onSearch('');
  }

  return (
    <div className="minimal-search-wrapper">
      <span className="material-symbols-outlined minimal-search-icon">search</span>
      <input
        type="search"
        className="minimal-search-input"
        placeholder={placeholder}
        value={rawQuery}
        onChange={(e) => setRawQuery(e.target.value)}
        aria-label={placeholder}
      />
      {rawQuery && (
        <button
          type="button"
          className="minimal-search-clear"
          onClick={handleClear}
          title="Clear search"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  );
}
