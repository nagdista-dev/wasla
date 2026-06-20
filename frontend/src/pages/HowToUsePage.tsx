import { useState, useEffect } from 'react';
import { 
  BookOpen, ListVideo, Users, CheckCircle2, Play, ArrowRight, 
  Shield, Keyboard, HelpCircle, Lightbulb, Zap, ChevronDown, 
  Info, Share2, RefreshCw, LayoutTemplate,
  ArrowUp, Menu, X, FolderHeart, Film, Code
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';

const SECTIONS = [
  { id: 'about', icon: Info, en: 'What is Wasla?', ar: 'ما هي وصلة؟' },
  { id: 'quickstart', icon: Zap, en: 'Quick Start', ar: 'البدء السريع' },
  { id: 'features', icon: LayoutTemplate, en: 'Features', ar: 'المميزات' },
  { id: 'tips', icon: Lightbulb, en: 'Pro Tips', ar: 'نصائح احترافية' },
  { id: 'faq', icon: HelpCircle, en: 'FAQ', ar: 'الأسئلة الشائعة' },
  { id: 'shortcuts', icon: Keyboard, en: 'Shortcuts', ar: 'اختصارات لوحة المفاتيح' },
  { id: 'privacy', icon: Shield, en: 'Privacy & Data', ar: 'الخصوصية والبيانات' },
  { id: 'roadmap', icon: RefreshCw, en: 'Version & Roadmap', ar: 'الإصدارات والتطوير' },
];

const FAQ_ITEMS = [
  {
    q: { en: "What is Wasla?", ar: "ما هي وصلة؟" },
    a: { en: "Wasla is a private, client-side application that aggregates YouTube channels into custom categories. It runs entirely in your browser without requiring a YouTube account.", ar: "وصلة هو تطبيق يعمل من جهة المستخدم لتجميع قنوات يوتيوب في أقسام مخصصة. يعمل بالكامل في متصفحك ولا يحتاج إلى حساب يوتيوب." }
  },
  {
    q: { en: "Does Wasla require a YouTube account?", ar: "هل تحتاج وصلة إلى حساب يوتيوب؟" },
    a: { en: "No! Wasla operates independently. You can follow channels and track your watch history without logging into Google.", ar: "لا! وصلة تعمل بشكل مستقل. يمكنك متابعة القنوات وتتبع سجل المشاهدة بدون تسجيل الدخول لجوجل." }
  },
  {
    q: { en: "How do shared categories work?", ar: "كيف تعمل الأقسام المشتركة؟" },
    a: { en: "You can generate a unique link for any category you create. Anyone who clicks the link will automatically import your curated list of channels into their own Wasla app.", ar: "يمكنك إنشاء رابط فريد لأي قسم. أي شخص يضغط على الرابط سيقوم باستيراد قائمة القنوات إلى تطبيقه الخاص تلقائياً." }
  },
  {
    q: { en: "Where is my data stored?", ar: "أين يتم تخزين بياناتي؟" },
    a: { en: "All your data (channels, playlists, categories, history) is stored locally on your device using your browser's IndexedDB and LocalStorage. No cloud servers are involved.", ar: "كل بياناتك (القنوات، القوائم، الأقسام، السجل) مخزنة محلياً على جهازك. لا نستخدم أي خوادم سحابية." }
  },
  {
    q: { en: "Can I export my data?", ar: "هل يمكنني تصدير بياناتي؟" },
    a: { en: "Yes, you can export your entire database as a JSON file from the Settings page and import it on any other device.", ar: "نعم، يمكنك تصدير قاعدة بياناتك بالكامل كملف JSON من صفحة الإعدادات واستيرادها على أي جهاز آخر." }
  }
];

export default function HowToUsePage() {
  const { language, isRTL } = useLanguage();
  useMeta({ title: language === 'ar' ? 'دليل الاستخدام - وصلة' : 'Documentation - Wasla' });
  
  const [activeSection, setActiveSection] = useState('hero');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      
      const sections = ['hero', ...SECTIONS.map(s => s.id)];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 150) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setShowMobileMenu(false);
  };

  const str = (obj: { en: string; ar: string }) => obj[language as 'en'|'ar'] || obj.en;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 font-sans relative">
      {/* Scroll to Top */}
      <button
        onClick={() => scrollTo('hero')}
        className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 rounded-full bg-brand-coral p-3 text-white shadow-xl transition-all duration-300 hover:bg-brand-pink hover:scale-110 active:scale-95 ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-6 w-6" />
      </button>

      {/* Mobile Nav Toggle */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-dark-navy/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">{language === 'ar' ? 'التوثيق والدليل' : 'Documentation'}</span>
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
        
        {/* Sidebar Navigation */}
        <aside className={`lg:w-64 shrink-0 lg:sticky lg:top-24 lg:self-start transition-all duration-300 z-30 ${showMobileMenu ? 'block fixed inset-0 top-[60px] bg-white dark:bg-dark-navy p-6 overflow-y-auto' : 'hidden lg:block'}`}>
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSection === section.id ? 'bg-brand-coral text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <section.icon className="h-4 w-4" />
                {str(section)}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full min-w-0 pb-32">
          
          {/* 1. HERO SECTION */}
          <section id="hero" className="mb-24 pt-4 lg:pt-10">
            <div className="rounded-3xl bg-gradient-to-br from-brand-pink via-brand-coral to-brand-orange p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <Film className="w-64 h-64" />
              </div>
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <span className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                    <BookOpen className="h-8 w-8 text-white" />
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                    {language === 'ar' ? 'مرحباً بك في وصلة' : 'Welcome to Wasla'}
                  </h1>
                </div>
                <p className="text-lg sm:text-xl font-medium text-white/90 leading-relaxed mb-8">
                  {language === 'ar' 
                    ? 'المنصة الشخصية الخالية من المشتتات لتجميع قنوات اليوتيوب. نظم صناع المحتوى في أقسام، وتابع تقدم مشاهداتك بكل سهولة وخصوصية تامّة.'
                    : 'Your personal, distraction-free YouTube aggregator. Organize creators into categories, track your watch progress, and build your own feed with complete privacy.'}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={() => scrollTo('quickstart')} className="px-8 py-3.5 bg-white text-brand-coral font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                    {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
                    <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                  <Link to="/" className="px-8 py-3.5 bg-black/20 text-white backdrop-blur-sm font-bold rounded-xl hover:bg-black/30 transition-all">
                    {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* 2. WHAT IS WASLA */}
          <section id="about" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Info className="h-8 w-8 text-brand-coral" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[0])}</h2>
            </div>
            <div className="bg-white dark:bg-dark-navy rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                {language === 'ar'
                  ? 'وصلة (Wasla) صُممت لحل مشكلة الإزعاج والتشتت في منصات الفيديو الحديثة. بدلاً من الاعتماد على خوارزميات التوصية التي تضيع وقتك، تمنحك وصلة التحكم الكامل في المحتوى الذي تستهلكه.'
                  : 'Wasla was designed to solve the noise and distraction of modern video platforms. Instead of relying on algorithmic recommendations designed to keep you scrolling, Wasla gives you total control over your content diet.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><FolderHeart className="h-5 w-5 text-brand-pink" /> {language === 'ar' ? 'التنظيم' : 'Organization'}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'ar' ? 'قم بتجميع قنواتك المفضلة (تعليم، تقنية، ترفيه) في أقسام مخصصة لسهولة الوصول.' : 'Group your favorite channels (Tech, Education, Entertainment) into custom categories for easy access.'}
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Shield className="h-5 w-5 text-brand-orange" /> {language === 'ar' ? 'الخصوصية' : 'Privacy-First'}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'ar' ? 'لا يوجد حسابات ولا خوادم تتبع. كل شيء يتم حفظه محلياً على جهازك المتصفح.' : 'No accounts, no tracking servers. Everything is saved locally on your browser.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. QUICK START */}
          <section id="quickstart" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="h-8 w-8 text-brand-yellow" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[1])}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { i: 1, icon: Users, en: 'Add your first channel', ar: 'أضف قناتك الأولى' },
                { i: 2, icon: FolderHeart, en: 'Create a category', ar: 'أنشئ قسماً جديداً' },
                { i: 3, icon: CheckCircle2, en: 'Assign channels to categories', ar: 'اربط القنوات بالأقسام' },
                { i: 4, icon: Play, en: 'Browse latest videos', ar: 'تصفح أحدث الفيديوهات' },
                { i: 5, icon: ListVideo, en: 'Track watch progress', ar: 'تابع تقدم مشاهداتك' },
                { i: 6, icon: Share2, en: 'Share categories with others', ar: 'شارك أقسامك مع الآخرين' },
              ].map((step) => (
                <div key={step.i} className="relative bg-white dark:bg-dark-navy p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-md transition-shadow">
                  <span className="absolute -top-4 -start-4 h-8 w-8 rounded-full bg-brand-coral text-white font-bold flex items-center justify-center shadow-lg border-2 border-white dark:border-dark-navy">
                    {step.i}
                  </span>
                  <step.icon className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-4 group-hover:text-brand-coral transition-colors" />
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{str(step)}</h3>
                </div>
              ))}
            </div>
          </section>

          {/* 4. FEATURE SHOWCASE */}
          <section id="features" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <LayoutTemplate className="h-8 w-8 text-brand-pink" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[2])}</h2>
            </div>

            <div className="space-y-8">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-dark-navy rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row">
                <div className="p-8 sm:w-1/3 bg-gray-50 dark:bg-gray-800/30 flex flex-col justify-center border-b sm:border-b-0 sm:border-e border-gray-100 dark:border-gray-800">
                  <Users className="h-10 w-10 text-brand-coral mb-4" />
                  <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'إدارة القنوات' : 'Channel Management'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'أضف، عدّل، واحذف القنوات بمرونة تامة.' : 'Add, edit, and delete channels flexibly.'}
                  </p>
                </div>
                <div className="p-8 sm:w-2/3">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'إضافة قناة عن طريق الرابط أو المُعرّف' : 'Add channel by URL or Handle'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'تعديل اسم القناة المخصص' : 'Edit custom channel names'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'تحديد قنوات مفضلة للوصول السريع' : 'Mark channels as favorites for quick access'}</li>
                  </ul>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-dark-navy rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row">
                <div className="p-8 sm:w-1/3 bg-gray-50 dark:bg-gray-800/30 flex flex-col justify-center border-b sm:border-b-0 sm:border-e border-gray-100 dark:border-gray-800">
                  <Share2 className="h-10 w-10 text-brand-orange mb-4" />
                  <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'المشاركة والاستيراد' : 'Sharing & Importing'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'شارك اهتماماتك مع أصدقائك بضغطة زر.' : 'Share your interests with friends with one click.'}
                  </p>
                </div>
                <div className="p-8 sm:w-2/3">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'إنشاء روابط مشاركة للأقسام' : 'Generate shareable links for categories'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'استيراد تلقائي للقنوات المشتركة' : 'Automatically import shared channels'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'دمج القنوات بدون تكرار' : 'Merge channels without duplicates'}</li>
                  </ul>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-dark-navy rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row">
                <div className="p-8 sm:w-1/3 bg-gray-50 dark:bg-gray-800/30 flex flex-col justify-center border-b sm:border-b-0 sm:border-e border-gray-100 dark:border-gray-800">
                  <Play className="h-10 w-10 text-brand-pink mb-4" />
                  <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'مشغل الفيديو والتتبع' : 'Video Player & Tracking'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'مشاهدة خالية من الإعلانات مع حفظ التقدم.' : 'Ad-free viewing with progress saving.'}
                  </p>
                </div>
                <div className="p-8 sm:w-2/3">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'حفظ تلقائي لتقدم المشاهدة' : 'Auto-save watch progress'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'استئناف الفيديو من حيث توقفت' : 'Resume videos from where you left off'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {language === 'ar' ? 'سجل مشاهدة كامل (Watch History)' : 'Complete Watch History'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 5. PRO TIPS */}
          <section id="tips" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Lightbulb className="h-8 w-8 text-brand-yellow" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[3])}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-brand-orange/10 to-brand-coral/10 p-6 rounded-2xl border border-brand-coral/20">
                <h3 className="font-bold text-lg mb-2 text-brand-coral">{language === 'ar' ? 'نظم المحتوى بنظام النيش' : 'Organize by Niche'}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'أنشئ أقساماً مثل "برمجة"، "أخبار"، "رياضة" لتصفح الفيديوهات حسب حالتك المزاجية.' : 'Create categories like "Coding", "News", and "Sports" to browse videos based on your mood.'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-2xl border border-blue-500/20">
                <h3 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">{language === 'ar' ? 'استخدم قوائم المشاهدة لاحقاً' : 'Use Watch Later'}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'لا وقت للمشاهدة الآن؟ أضف الفيديو إلى "المشاهدة لاحقاً" من أي كارت فيديو.' : 'No time to watch now? Add videos to "Watch Later" directly from any video card.'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-2xl border border-green-500/20">
                <h3 className="font-bold text-lg mb-2 text-green-600 dark:text-green-400">{language === 'ar' ? 'النسخ الاحتياطي الدوري' : 'Regular Backups'}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'اذهب إلى الإعدادات وقم بتصدير بياناتك أسبوعياً لتجنب فقدانها عند تغيير المتصفح.' : 'Go to Settings and export your data weekly to avoid losing it when changing browsers.'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 p-6 rounded-2xl border border-pink-500/20">
                <h3 className="font-bold text-lg mb-2 text-pink-600 dark:text-pink-400">{language === 'ar' ? 'الأقسام المشتركة للمجتمعات' : 'Shared Categories for Communities'}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'ar' ? 'هل تدير مجموعة دراسية؟ شاركهم رابط قسم يحتوي على أهم القنوات التعليمية بضغطة زر.' : 'Running a study group? Share a category link containing the best educational channels with one click.'}
                </p>
              </div>
            </div>
          </section>

          {/* 6. FAQ */}
          <section id="faq" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="h-8 w-8 text-brand-coral" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[4])}</h2>
            </div>
            <div className="space-y-4">
              {FAQ_ITEMS.map((faq, idx) => (
                <div key={idx} className="bg-white dark:bg-dark-navy rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-start font-bold focus:outline-none"
                  >
                    <span>{str(faq.q)}</span>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`px-5 text-gray-600 dark:text-gray-400 transition-all duration-300 overflow-hidden ${openFaqIndex === idx ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p>{str(faq.a)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. SHORTCUTS */}
          <section id="shortcuts" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Keyboard className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[5])}</h2>
            </div>
            <div className="bg-white dark:bg-dark-navy p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {language === 'ar' ? 'يتم حالياً تطوير مجموعة من اختصارات لوحة المفاتيح لتسريع تجربة الاستخدام في التحديثات القادمة.' : 'A robust set of keyboard shortcuts is currently under development to speed up your workflow in upcoming updates.'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center opacity-50 grayscale cursor-not-allowed">
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm shadow-sm">Ctrl + K</kbd>
                  <p className="text-xs mt-2 font-medium">{language === 'ar' ? 'البحث السريع (قريباً)' : 'Quick Search (Soon)'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center opacity-50 grayscale cursor-not-allowed">
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm shadow-sm">Space</kbd>
                  <p className="text-xs mt-2 font-medium">{language === 'ar' ? 'تشغيل/إيقاف' : 'Play/Pause'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. PRIVACY */}
          <section id="privacy" className="scroll-mt-24 mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="h-8 w-8 text-green-500" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[6])}</h2>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row gap-6 items-start">
              <div className="p-4 bg-white dark:bg-green-800/30 rounded-full shrink-0 shadow-sm">
                <Shield className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-green-900 dark:text-green-400 mb-3">
                  {language === 'ar' ? 'بياناتك ملكك وحدك' : 'Your data is yours alone'}
                </h3>
                <p className="text-green-800 dark:text-green-200/80 leading-relaxed">
                  {language === 'ar' 
                    ? 'نحن لا نقوم بتتبع نقراتك، ولا نجمع سجل مشاهداتك، ولا نشارك أي معلومات مع أطراف ثالثة. يعمل التطبيق بشكل كامل كطبقة محلية (Local Client) في متصفحك. أنت تمتلك ملفاتك وقنواتك 100%.'
                    : 'We do not track your clicks, collect your watch history, or share information with third parties. The app works entirely as a local client in your browser. You own your files and channels 100%.'}
                </p>
              </div>
            </div>
          </section>

          {/* 9. ROADMAP */}
          <section id="roadmap" className="scroll-mt-24 mb-10">
            <div className="flex items-center gap-3 mb-8">
              <RefreshCw className="h-8 w-8 text-blue-500" />
              <h2 className="text-3xl font-bold">{str(SECTIONS[7])}</h2>
            </div>
            <div className="bg-white dark:bg-dark-navy p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
                <span className="font-bold text-gray-900 dark:text-white text-lg">Wasla v1.0.0</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wide">Stable</span>
              </div>
              <h4 className="font-bold mb-4 text-gray-700 dark:text-gray-300">{language === 'ar' ? 'ميزات قادمة في خارطة الطريق:' : 'Upcoming features in roadmap:'}</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-brand-coral"></span>
                  {language === 'ar' ? 'مزامنة سحابية اختيارية عبر Google Drive' : 'Optional cloud sync via Google Drive'}
                </li>
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-brand-coral"></span>
                  {language === 'ar' ? 'إشعارات حية للإصدارات الجديدة' : 'Live notifications for new releases'}
                </li>
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  {language === 'ar' ? 'تطبيق للهواتف المحمولة (PWA/Native)' : 'Mobile Application (PWA/Native)'}
                </li>
              </ul>
            </div>
          </section>

        </main>
      </div>

      {/* 10. FOOTER */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-navy py-12">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-coral rounded-lg">
              <Film className="h-5 w-5 text-white" />
            </span>
            <span className="font-bold text-xl tracking-tight">Wasla</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <button onClick={() => scrollTo('hero')} className="hover:text-brand-coral transition-colors">{language === 'ar' ? 'الرئيسية' : 'Home'}</button>
            <button onClick={() => scrollTo('privacy')} className="hover:text-brand-coral transition-colors">{language === 'ar' ? 'الخصوصية' : 'Privacy'}</button>
            <Link to="/settings" className="hover:text-brand-coral transition-colors">{language === 'ar' ? 'الإعدادات' : 'Settings'}</Link>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="GitHub">
              <Code className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="text-center text-xs text-gray-400 mt-8">
          &copy; {new Date().getFullYear()} Wasla Project. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </div>
      </footer>
    </div>
  );
}
