import type { IconName } from '../common/Icon';

export const workspacePages: { href: string; label: string; icon: IconName }[] =
  [
    { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { href: '/documents', label: 'My documents', icon: 'document' },
    { href: '/record', label: 'Quick record', icon: 'mic' },
    { href: '/recordings', label: 'History', icon: 'history' },
    { href: '/courses', label: 'Manage courses', icon: 'courses' },
    { href: '/timetable', label: 'Timetable', icon: 'calendar' },
    { href: '/settings', label: 'Account & settings', icon: 'settings' },
  ];

export function activeWorkspacePage(pathname: string) {
  return (
    workspacePages.find(
      (page) => pathname === page.href || pathname.startsWith(`${page.href}/`),
    ) ?? workspacePages[1]!
  );
}
