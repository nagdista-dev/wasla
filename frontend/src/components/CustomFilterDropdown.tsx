import { useRef, useState, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';

export interface FilterOption {
  value: string;
  label: string;
}

interface CustomFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
  placeholder?: string;
}

/**
 * CustomFilterDropdown
 *
 * Uses a stable portal container (appended to document.body once on mount,
 * removed on unmount) to avoid the React "removeChild" NotFoundError that
 * occurs when the portal is conditionally created/destroyed inline.
 */
export default function CustomFilterDropdown({ value, onChange, options, className = '', placeholder }: CustomFilterDropdownProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Stable portal container ───────────────────────────────────────────────
  // We create one <div> appended to document.body on mount and remove it on
  // unmount. This avoids the DOM mismatch that happens when the portal node
  // is conditionally rendered (created/destroyed) inside JSX.
  const portalRoot = useRef<HTMLDivElement | null>(null);
  if (!portalRoot.current) {
    const el = document.createElement('div');
    el.setAttribute('data-filter-portal', '');
    portalRoot.current = el;
  }

  useEffect(() => {
    const root = portalRoot.current!;
    document.body.appendChild(root);
    return () => {
      // Guard: only remove if still a child of body (prevents the same error
      // if something else already cleaned it up)
      if (document.body.contains(root)) {
        document.body.removeChild(root);
      }
    };
  }, []);

  // ── Positioning ───────────────────────────────────────────────────────────
  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);
  const displayValue = selectedOption?.label || placeholder || t('filterDropdown.select');

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on unmount to avoid stale open state
  useEffect(() => {
    return () => setIsOpen(false);
  }, []);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  // ── Portal content — always mounted in portalRoot, visibility via isOpen ──
  const menuContent = createPortal(
    isOpen ? (
      <div
        ref={menuRef}
        className="fixed z-[100] max-h-60 overflow-y-auto rounded-lg bg-white ring-1 ring-gray-200 shadow-lg dark:bg-dark-navy dark:ring-gray-700 scrollbar-hide"
        style={menuStyle}
      >
        <ul role="listbox" aria-label={placeholder || 'Options'}>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-2 text-sm truncate transition ${
                  opt.value === value
                    ? 'bg-brand-pink/10 text-brand-coral dark:text-brand-coral'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.08]'
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null,
    portalRoot.current!
  );

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className="w-full appearance-none rounded-lg bg-white pl-2.5 pr-7 py-2 text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer dark:bg-dark-navy dark:text-white dark:hover:bg-white/[0.08] truncate flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate pr-2">{displayValue}</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />}
      </button>
      {menuContent}
    </div>
  );
}