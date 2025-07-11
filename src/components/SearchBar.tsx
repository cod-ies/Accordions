import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, onSearch, placeholder }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    onChange('');
    onSearch('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-center border-2 rounded-lg transition-colors ${
            isFocused ? 'border-blue-500' : 'border-gray-300'
          }`}
        >
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 ml-3" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder || 'Search todos...'}
            className="flex-1 p-3 border-0 focus:ring-0 focus:outline-none rounded-lg"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 mr-1"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>
      
      <div className="mt-2 text-sm text-gray-500">
        <p>
          💡 Try: "urgent tasks", "due this week", "work meetings", or "overdue items"
        </p>
      </div>
    </div>
  );
}
