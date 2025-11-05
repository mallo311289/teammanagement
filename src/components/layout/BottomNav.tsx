import { Home, Calendar, Users, BarChart3, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Page = 'home' | 'fixtures' | 'lineup' | 'squad' | 'stats' | 'media' | 'profile';

interface BottomNavProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  const navItems = [
    { id: 'home' as Page, icon: Home, label: 'Home' },
    { id: 'fixtures' as Page, icon: Calendar, label: 'Fixtures' },
    { id: 'lineup' as Page, icon: Users, label: 'Lineup' },
    { id: 'squad' as Page, icon: Users, label: 'Squad' },
    { id: 'stats' as Page, icon: BarChart3, label: 'Stats' },
    { id: 'media' as Page, icon: MessageSquare, label: 'Media' },
    { id: 'profile' as Page, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  isActive ? 'text-[#4A6FA5]' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className={cn('w-6 h-6 mb-1', isActive && 'scale-110')} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
