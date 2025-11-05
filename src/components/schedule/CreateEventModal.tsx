interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventModal({ open, onClose }: CreateEventModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Create Event</h2>
        <p className="text-gray-600">Event creation form goes here</p>
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
