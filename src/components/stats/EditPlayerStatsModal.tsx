import { Player, PlayerStats } from '@/lib/supabase';
import { Dispatch, SetStateAction } from 'react';

interface EditPlayerStatsModalProps {
  player?: Player | null;
  stats?: PlayerStats;
  open?: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
  onClose?: () => void;
  onSuccess?: () => void;
  onSave?: (playerId: string, stats: Partial<PlayerStats>) => Promise<void>;
}

export function EditPlayerStatsModal({ open, onClose }: EditPlayerStatsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Edit Player Stats</h2>
        <p className="text-gray-600">Edit stats form goes here</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
