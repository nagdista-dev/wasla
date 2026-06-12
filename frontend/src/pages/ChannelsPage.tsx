import { useState } from 'react';
import { Plus, Edit } from 'lucide-react';
import FloatingButton from '../components/FloatingButton';
import AddChannelModal from '../components/AddChannelModal';
import EditChannelModal from '../components/EditChannelModal';
import type { Channel } from '../types';

interface ChannelsPageProps {
  channels: Channel[];
  onAdd: (entry: Channel) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, categories: string[]) => void;
}

export default function ChannelsPage({ channels, onAdd, onDelete, onUpdate }: ChannelsPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setShowEditModal(true);
  };

  const handleUpdate = (name: string, categories: string[]) => {
    if (editingChannel) {
      onUpdate(editingChannel.id, name, categories);
      setShowEditModal(false);
      setEditingChannel(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Channels</h1>
            <p className="mt-2 text-gray-600">Manage the YouTube channels in your feed.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        </div>

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-gray-900">No channels yet</p>
            <p className="mt-2 text-gray-600">Add a YouTube channel to start building your feed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{channel.name}</h2>
                  <p className="text-sm text-gray-500">{channel.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {channel.categories.length > 0 ? (
                      channel.categories.map((category) => (
                        <span key={category} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {category}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No categories</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(channel)}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(channel.id)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FloatingButton onClick={() => setShowModal(true)} />
      {showModal && <AddChannelModal onClose={() => setShowModal(false)} onAdd={onAdd} />}
      {showEditModal && editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => {
            setShowEditModal(false);
            setEditingChannel(null);
          }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
