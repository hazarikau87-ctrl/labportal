import { useRef, useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface TestSelectorProps {
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[]; 
}

export default function TestSelector({ selected, onChange, options }: TestSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`min-h-[42px] px-3 py-2 border rounded-lg bg-gray-50 flex flex-wrap gap-1.5 items-center cursor-pointer transition-all pr-8 relative ${
          open ? 'border-green-600 ring-2 ring-green-50' : 'border-gray-200 hover:border-green-600'
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">Choose tests...</span>
        ) : (
          selected.map((val) => (
            <span
              key={val}
              className={`inline-flex items-center gap-1 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow-sm ${
                val.includes('Prescribed') ? 'bg-blue-600' : 'bg-green-700'
              }`}
            >
              {val}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(val); }}
                className="ml-1 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-green-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute top-[110%] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-[110] max-h-60 overflow-y-auto p-1.5 animate-in fade-in zoom-in duration-150">
          {options && options.length > 0 ? (
            options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selected.includes(option) ? 'bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="w-4 h-4 rounded accent-green-700 border-gray-300"
                />
                <span className={`text-sm ${selected.includes(option) ? 'text-green-900 font-medium' : 'text-gray-700'}`}>
                  {option}
                </span>
              </label>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-gray-400 italic">
              No tests available for this lab.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
