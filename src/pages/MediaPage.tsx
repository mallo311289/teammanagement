import { useEffect, useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Video, Trash2, X, Play, Download, Camera as CameraIcon, Images } from 'lucide-react';
import { supabase, MediaFile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../hooks/use-toast';
import { format } from 'date-fns';
import { takePicture, selectFromGallery, dataUrlToBlob } from '../lib/camera';

export function MediaPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('media_files')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      // console.error('Error loading media:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const image = await takePicture({
        quality: 90,
        allowEditing: true,
      });

      if (image.dataUrl) {
        await uploadImage(image.dataUrl);
      }
    } catch (error) {
      toast({
        title: 'Camera error',
        description: 'Failed to capture photo',
        variant: 'destructive',
      });
    }
  };

  const handleGallerySelect = async () => {
    try {
      const image = await selectFromGallery({
        quality: 90,
        allowEditing: false,
      });

      if (image.dataUrl) {
        await uploadImage(image.dataUrl);
      }
    } catch (error) {
      toast({
        title: 'Gallery error',
        description: 'Failed to select photo',
        variant: 'destructive',
      });
    }
  };

  const uploadImage = async (dataUrl: string) => {
    if (!profile) return;

    try {
      setUploading(true);

      const blob = dataUrlToBlob(dataUrl);
      const fileExt = 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('media_files')
        .insert({
          user_id: profile.id,
          file_name: fileName,
          file_path: filePath,
          file_type: 'image',
          file_size: blob.size,
          mime_type: 'image/jpeg',
          caption: caption || null,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      });

      setCaption('');
      await loadMediaFiles();
    } catch (error) {
      // console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !profile) return;

    const file = files[0];
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;

    if (!fileType) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image or video file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 100MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('media_files')
        .insert({
          user_id: profile.id,
          file_name: file.name,
          file_path: filePath,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          caption: caption || null,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: `${fileType === 'image' ? 'Image' : 'Video'} uploaded successfully`,
      });

      setCaption('');
      await loadMediaFiles();
    } catch (error) {
      // console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (media: MediaFile) => {
    if (!profile || media.user_id !== profile.id) {
      toast({
        title: 'Permission denied',
        description: 'You can only delete your own uploads',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([media.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('media_files')
        .delete()
        .eq('id', media.id);

      if (dbError) throw dbError;

      setMediaFiles(prev => prev.filter(m => m.id !== media.id));
      setSelectedMedia(null);

      toast({
        title: 'Deleted',
        description: 'Media file deleted successfully',
      });
    } catch (error) {
      // console.error('Error deleting media:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete media file',
        variant: 'destructive',
      });
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="text-white font-medium">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 sm:pb-24 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-bold text-white mb-2">Team Media</h1>
          <p className="text-white/70 text-lg">Share photos and videos with your team</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:bg-white/15 transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">Upload Media</h2>
              <p className="text-white/70 text-sm">Images and videos (max 100MB)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="caption" className="text-white mb-2 block">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaption(e.target.value)}
                placeholder="Add a caption for your upload..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                disabled={uploading}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCameraCapture}
                disabled={uploading}
                className="bg-white text-[#4A6FA5] hover:bg-white/90 font-semibold py-6 transition-all"
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                Take Photo
              </Button>
              <Button
                onClick={handleGallerySelect}
                disabled={uploading}
                className="bg-white text-[#4A6FA5] hover:bg-white/90 font-semibold py-6 transition-all"
              >
                <Images className="w-5 h-5 mr-2" />
                Choose Photo
              </Button>
            </div>
          </div>
        </div>

        {mediaFiles.length === 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <EmptyState
              icon={ImageIcon}
              title="No Media Yet"
              description="Upload your first photo or video to get started. Share team moments, training sessions, and match highlights!"
              action={{
                label: 'Upload Media',
                onClick: () => fileInputRef.current?.click()
              }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {mediaFiles.map((media, index) => (
              <button
                key={media.id}
                onClick={() => setSelectedMedia(media)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-300 group animate-in fade-in zoom-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {media.file_type === 'image' ? (
                  <img
                    src={getMediaUrl(media.file_path)}
                    alt={media.caption || media.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={getMediaUrl(media.file_path)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-[#4A6FA5] ml-1" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-2 text-white text-xs">
                      {media.file_type === 'image' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      <span className="truncate">{media.file_name}</span>
                    </div>
                    {media.caption && (
                      <p className="text-white text-sm mt-1 line-clamp-2">{media.caption}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <Dialog open={selectedMedia !== null} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{selectedMedia?.file_name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMedia(null)}
                  className="flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            {selectedMedia && (
              <div className="space-y-4">
                <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                  {selectedMedia.file_type === 'image' ? (
                    <img
                      src={getMediaUrl(selectedMedia.file_path)}
                      alt={selectedMedia.caption || selectedMedia.file_name}
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />
                  ) : (
                    <video
                      src={getMediaUrl(selectedMedia.file_path)}
                      controls
                      className="w-full h-auto max-h-[60vh]"
                    />
                  )}
                </div>

                {selectedMedia.caption && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-900">{selectedMedia.caption}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Uploaded by</p>
                    <p className="text-slate-900">{selectedMedia.profile?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Date</p>
                    <p className="text-slate-900">
                      {format(new Date(selectedMedia.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">File size</p>
                    <p className="text-slate-900">{formatFileSize(selectedMedia.file_size)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Type</p>
                    <p className="text-slate-900 capitalize">{selectedMedia.file_type}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(getMediaUrl(selectedMedia.file_path), '_blank')}
                    className="flex-1 bg-[#4A6FA5] hover:bg-[#3d5c8f]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  {profile?.id === selectedMedia.user_id && (
                    <Button
                      onClick={() => handleDelete(selectedMedia)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-12 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
          <img
            src="/moorgreen-logo.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-48 h-48 object-contain opacity-40 hover:opacity-60 transition-opacity duration-300"
          />
        </div>
      </div>
    </div>
  );
}
