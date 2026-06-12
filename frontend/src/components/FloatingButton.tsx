import { Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FloatingButton({ onClick }: { onClick: () => void }) {
  const { isRTL } = useLanguage();
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors`}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
