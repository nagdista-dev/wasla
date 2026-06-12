import { Heart, Music, Plus } from 'lucide-react';

export default function PlaylistsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-4xl font-bold text-gray-900">
              <Heart className="h-8 w-8" />
              Playlists
            </h1>
            <p className="mt-2 text-gray-600">Manage your video playlists.</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Playlist
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">No playlists yet</h2>
          <p className="mt-2 text-gray-600">Create a playlist to organize your favorite videos.</p>
        </div>
      </div>
    </div>
  );
}