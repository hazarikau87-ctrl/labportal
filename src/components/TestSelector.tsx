import { useRef, useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export const TEST_OPTIONS = [
  'Full Body Checkup',
  'CBC / Blood Test',
  'Diabetes Screen',
  'Thyroid Profile',
  'Prescribed (Upload Below)',
];

interface TestSelectorProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function TestSelector({ selected, onChange }: TestSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        className="min-h-[42px] px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex flex-wrap gap-1.5 items-center cursor-pointer hover:border-green-600 transition-colors pr-8 relative"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">Choose tests...</span>
        ) : (
          selected.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 bg-green-700 text-white text-xs px-2 py-0.5 rounded"
            >
              {val}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(val); }}
                className="hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-green-700 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute top-[105%] left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto p-2">
          {TEST_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer hover:bg-green-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="w-4 h-4 accent-green-700"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
