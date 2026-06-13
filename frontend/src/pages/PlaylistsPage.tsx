import { Heart, Music } from 'lucide-react';

export default function PlaylistsPage() {
  return (
    <div className="min-h-screen p-8 dark:bg-dark-navy">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-4xl font-bold text-gray-900 dark:text-white">
            <Heart className="h-8 w-8 text-brand-coral" />
            Playlists
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your video playlists.</p>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
          <Music className="mx-auto mb-4 h-12 w-12 text-brand-coral" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No playlists yet</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Create a playlist to organize your favorite videos.</p>
        </div>
      </div>
    </div>
  );
}