import { BookOpen, ListVideo, Users, Search, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

const steps = [
  {
    icon: BookOpen,
    title: 'What is Wasla?',
    description: 'Wasla is your personal YouTube playlist manager. It lets you organize channels and playlists into categories, track your learning progress, and filter content by time and topics — all in one clean interface.',
    color: 'from-brand-pink to-brand-coral',
  },
  {
    icon: Users,
    title: 'Adding Channels',
    description: 'Tap the + button and paste a YouTube channel URL or ID. Wasla will automatically fetch the latest video and display it on your home page. You can assign categories to keep channels organized.',
    color: 'from-brand-coral to-brand-orange',
  },
  {
    icon: ListVideo,
    title: 'Adding Playlists',
    description: 'Similarly, use the + button to add a YouTube playlist URL or ID. The app fetches the playlist name, thumbnail, and author automatically. Optionally, add a description and categories to keep things tidy.',
    color: 'from-brand-orange to-brand-yellow',
  },
  {
    icon: CheckCircle2,
    title: 'Playlist Course System',
    description: 'Playlists become interactive courses. Open any playlist to see all videos listed as lessons. Track your progress by marking videos as complete — a progress bar shows how far you\'ve come.',
    color: 'from-brand-yellow to-brand-coral',
  },
  {
    icon: Play,
    title: 'Progress Tracking',
    description: 'Each playlist tracks which videos you\'ve completed. Your progress is saved locally and persists across sessions. Complete all lessons to reach 100%!',
    color: 'from-brand-pink to-brand-orange',
  },
  {
    icon: Search,
    title: 'Search & Filtering',
    description: 'Use the search bar to quickly find channels or videos. Filter your home page by category, time range (last hour, day, week, etc.), and sort by newest, most viewed, or alphabetically.',
    color: 'from-brand-coral to-brand-pink',
  },
];

export default function HowToUsePage() {
  useMeta({ title: 'How to Use', description: 'Learn how to use Wasla to manage your YouTube channels and playlists.' });

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            How to Use Wasla
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to know to get started with organizing your YouTube learning journey.
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
                    {step.title}
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
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
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
