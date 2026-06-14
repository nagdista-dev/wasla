import { BookOpen, ListVideo, Users, Search, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';

const steps = [
  {
    icon: BookOpen,
    titleKey: 'howToUse.step1Title',
    descKey: 'howToUse.step1Desc',
    color: 'from-brand-pink to-brand-coral',
  },
  {
    icon: Users,
    titleKey: 'howToUse.step2Title',
    descKey: 'howToUse.step2Desc',
    color: 'from-brand-coral to-brand-orange',
  },
  {
    icon: ListVideo,
    titleKey: 'howToUse.step3Title',
    descKey: 'howToUse.step3Desc',
    color: 'from-brand-orange to-brand-yellow',
  },
  {
    icon: CheckCircle2,
    titleKey: 'howToUse.step4Title',
    descKey: 'howToUse.step4Desc',
    color: 'from-brand-yellow to-brand-coral',
  },
  {
    icon: Play,
    titleKey: 'howToUse.step5Title',
    descKey: 'howToUse.step5Desc',
    color: 'from-brand-pink to-brand-orange',
  },
  {
    icon: Search,
    titleKey: 'howToUse.step6Title',
    descKey: 'howToUse.step6Desc',
    color: 'from-brand-coral to-brand-pink',
  },
];

export default function HowToUsePage() {
  const { t } = useLanguage();
  useMeta({ title: t('howToUse.title'), description: t('howToUse.subtitle') });

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('howToUse.title')}
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('howToUse.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700"
            >
              <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md`}>
                <step.icon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10 text-xs font-bold text-gray-600 dark:text-gray-400">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(step.titleKey)}
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-coral px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-brand-pink"
          >
            {t('howToUse.getStarted')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
