import Link from 'next/link';
import { Icon, type IconName } from '@/libs/components/common/Icon';
import { useLanguage } from '@/libs/i18n/LanguageProvider';

const items: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Home', icon: 'grid' },
  { href: '/record', label: 'Record', icon: 'mic' },
  { href: '/recordings', label: 'History', icon: 'history' },
];
export function MobileNavigation({ pathname }: { pathname: string }) {
  const { text } = useLanguage();
  return (
    <nav className="mobile-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`dock-item ${item.icon === 'mic' ? 'dock-record' : ''}`}
          aria-current={pathname === item.href ? 'page' : undefined}
        >
          <span>
            <Icon name={item.icon} size={23} />
          </span>
          {text(item.label)}
        </Link>
      ))}
    </nav>
  );
}
