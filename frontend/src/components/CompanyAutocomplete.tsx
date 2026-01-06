import { useState, useEffect, useRef } from 'react';
import { searchCompanies, getCompanyDetails, YTJCompanySearchResult, YTJCompanyDetails } from '../lib/ytj';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCompanySelect: (company: YTJCompanyDetails) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function CompanyAutocomplete({
  value,
  onChange,
  onCompanySelect,
  placeholder = 'Yrityksen nimi',
  className = '',
  error
}: CompanyAutocompleteProps) {
  // Use internal state for the input value
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<YTJCompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state with prop when prop changes externally
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    console.log('Input changed:', newValue);
    setInputValue(newValue);
    onChange(newValue);
  };

  // Search companies when input changes
  useEffect(() => {
    console.log('useEffect triggered, inputValue:', inputValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      console.log('Searching for:', inputValue);
      const results = await searchCompanies(inputValue);
      console.log('Search results:', results);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsLoading(false);
      setSelectedIndex(-1);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (company: YTJCompanySearchResult) => {
    try {
      setIsLoading(true);
      setShowSuggestions(false);
      setInputValue(company.name);
      onChange(company.name);

      // Fetch full company details
      console.log('Fetching details for:', company.businessId);
      const details = await getCompanyDetails(company.businessId);
      console.log('Got details:', details);
      
      if (details) {
        onCompanySelect(details);
      } else {
        // If details fetch fails, still pass the basic info
        console.warn('Could not fetch full details, using basic info');
        onCompanySelect({
          businessId: company.businessId,
          name: company.name,
          registrationDate: company.registrationDate || '',
          companyForm: company.companyForm || '',
          companyFormCode: '',
          businessLine: '',
          businessLineCode: '',
          liquidations: [],
          addresses: [],
          contactDetails: {},
          registeredEntries: [],
          auxiliaryNames: [],
          status: 'Tuntematon',
          raw: null
        });
      }
    } catch (error) {
      console.error('Error selecting company:', error);
      // Still pass basic info on error
      onCompanySelect({
        businessId: company.businessId,
        name: company.name,
        registrationDate: company.registrationDate || '',
        companyForm: company.companyForm || '',
        companyFormCode: '',
        businessLine: '',
        businessLineCode: '',
        liquidations: [],
        addresses: [],
        contactDetails: {},
        registeredEntries: [],
        auxiliaryNames: [],
        status: 'Tuntematon',
        raw: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
            error ? 'border-red-500' : 'border-slate-200'
          } ${className}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((company, index) => (
              <button
                key={company.businessId}
                type="button"
                onClick={() => handleSelect(company)}
                className={`w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 ${
                  index === selectedIndex ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="font-medium text-slate-800">{company.name}</div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <span>Y-tunnus: {company.businessId}</span>
                  {company.companyForm && (
                    <>
                      <span>•</span>
                      <span>{company.companyForm}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {inputValue.length >= 3 && !isLoading && suggestions.length === 0 && showSuggestions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500"
        >
          Yritystä ei löytynyt. Tarkista kirjoitusasu.
        </motion.div>
      )}
    </div>
  );
}


