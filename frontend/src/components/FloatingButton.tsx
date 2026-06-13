import { Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FloatingButton({ onClick }: { onClick: () => void }) {
  const { isRTL } = useLanguage();
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} bg-brand-coral text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-brand-pink transition-colors`}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
