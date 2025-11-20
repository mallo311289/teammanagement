import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Pin, Megaphone, Trash2 } from 'lucide-react';
import { supabase, ChatMessage, Profile, Announcement } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { NewAnnouncementModal } from '../components/chat/NewAnnouncementModal';

type MessageWithProfile = ChatMessage & {
  profile: Profile;
};

type AnnouncementWithProfile = Announcement & {
  profile: Profile;
};

export function ChatPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { notifications } = useNotifications();
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementWithProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadAnnouncements();
    subscribeToMessages();
    subscribeToAnnouncements();
    markChatNotificationsAsRead();
  }, []);

  const markChatNotificationsAsRead = async () => {
    if (!profile) return;

    const chatNotificationIds = notifications
      .filter((n) => !n.is_read && (n.type === 'message' || n.type === 'announcement'))
      .map((n) => n.id);

    if (chatNotificationIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', chatNotificationIds);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, announcements]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as MessageWithProfile[] || []);
    } catch (error) {
      // console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data as AnnouncementWithProfile[] || []);
    } catch (error) {
      // console.error('Error loading announcements:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          if (profileData) {
            const newMsg: MessageWithProfile = {
              ...(payload.new as ChatMessage),
              profile: profileData,
            };
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          if (profileData) {
            const newAnnouncement: AnnouncementWithProfile = {
              ...(payload.new as Announcement),
              profile: profileData,
            };
            setAnnouncements((prev) => [newAnnouncement, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          setAnnouncements((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !profile) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: profile.id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      // console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!profile?.role || profile.role !== 'manager') return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      toast({
        title: 'Message Deleted',
        description: 'The message has been removed',
      });
    } catch (error: any) {
      // console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!profile?.role || profile.role !== 'manager') return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));

      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been removed',
      });
    } catch (error: any) {
      // console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: 'text-red-600',
        };
      case 'important':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: 'text-orange-600',
        };
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: 'text-yellow-600',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="text-white font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px-80px)] bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3]">
      <div className="bg-white/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A6FA5] rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Team Chat</h1>
              <p className="text-sm text-slate-600">{profile?.team_name}</p>
            </div>
          </div>

          {profile?.role === 'manager' && (
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              className="bg-[#4A6FA5] hover:bg-[#3d5c8f] text-white flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">New Announcement</span>
            </Button>
          )}
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {announcements.map((announcement) => {
            const styles = getPriorityStyles(announcement.priority);
            return (
              <div
                key={announcement.id}
                className={`${styles.bg} ${styles.border} border-2 rounded-2xl p-5 shadow-lg group relative`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Pin className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-1`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${styles.badge} text-xs font-bold px-2.5 py-1 rounded-full border uppercase`}>
                        ANNOUNCEMENT
                      </span>
                      <span className="text-xs text-slate-600">
                        {formatMessageTime(announcement.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {announcement.title}
                    </h3>
                    <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {announcement.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                      Posted by {announcement.profile.full_name}
                    </p>
                  </div>
                  {profile?.role === 'manager' && (
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-red-500/20 text-red-500 hover:text-red-600 absolute top-3 right-3"
                      title="Delete announcement"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/70">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.user_id === profile?.id;
              const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;
              const showName = showAvatar && !isOwnMessage;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${
                    !showAvatar ? (isOwnMessage ? 'mr-[52px]' : 'ml-[52px]') : ''
                  }`}
                >
                  {showAvatar && (
                    <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white shadow-md">
                      {msg.profile.avatar_url ? (
                        <AvatarImage src={msg.profile.avatar_url} alt={msg.profile.full_name} />
                      ) : (
                        <AvatarFallback
                          className={`${
                            isOwnMessage
                              ? 'bg-[#4A6FA5] text-white'
                              : 'bg-slate-200 text-slate-700'
                          } font-semibold`}
                        >
                          {getInitials(msg.profile.full_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}

                  <div className={`flex-1 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showName && (
                      <span className="text-xs font-semibold text-white/90 mb-1 px-1">
                        {msg.profile.full_name}
                      </span>
                    )}
                    <div className="flex items-end gap-2">
                      <div
                        className={`rounded-2xl px-4 py-2.5 max-w-[75%] min-w-[120px] shadow-md ${
                          isOwnMessage
                            ? 'bg-[#4A6FA5] text-white rounded-tr-sm'
                            : 'bg-white text-slate-900 rounded-tl-sm'
                        }`}
                        style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'normal' }}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                          {msg.message}
                        </p>
                        <span
                          className={`text-[11px] mt-1 block ${
                            isOwnMessage ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>
                      {profile?.role === 'manager' && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-red-500/20 text-red-500 hover:text-red-600"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm border-t border-white/20 px-4 py-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                className="w-full pl-4 pr-4 py-6 rounded-full border-2 border-slate-200 focus:border-[#4A6FA5] bg-white text-slate-900 placeholder:text-slate-400 text-[15px] shadow-sm"
                maxLength={1000}
              />
            </div>
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-12 h-12 rounded-full bg-[#4A6FA5] hover:bg-[#3d5c8f] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </div>

      <NewAnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
      />
    </div>
  );
}
