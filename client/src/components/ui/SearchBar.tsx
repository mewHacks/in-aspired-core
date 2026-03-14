import React from 'react';
import { Search } from 'lucide-react';

// Reusable search bar component
interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = "Search...",
    className = ""
}) => {
    return (
        <div className={`relative w-full group ${className}`}>

            {/* Search icon */}
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 group-focus-within:scale-110 transition-all duration-300" />
            </div>

            {/* Search input */}
            <input
                type="text"
                className="block w-full pl-14 pr-6 py-4 border-0 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:shadow-md hover:ring-2 hover:ring-indigo-500 text-base transition-all duration-300 ease-out"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)} // Handle value change in real time
            />
        </div>
    );
};
