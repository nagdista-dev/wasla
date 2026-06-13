import { ChevronDown } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}

export default function FilterDropdown({ value, onChange, options, className = '' }: FilterDropdownProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg bg-white pl-2.5 pr-7 py-2 text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer dark:bg-dark-navy dark:text-white dark:hover:bg-white/[0.08] truncate"
        style={{ colorScheme: 'dark' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0a1128', color: 'white' }}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
    </div>
  );
}
