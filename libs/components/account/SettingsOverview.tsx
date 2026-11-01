'use client';
import Link from 'next/link';
import { Icon, type IconName } from '@/libs/components/common/Icon';
import { useLanguage } from '@/libs/i18n/LanguageProvider';

const items: { path: string; title: string; detail: string; icon: IconName }[] =
  [
    {
      path: 'account',
      title: 'Account',
      detail: 'Your name, school, and account security.',
      icon: 'user',
    },
    {
      path: 'language',
      title: 'Language',
      detail: 'Interface and generated note languages.',
      icon: 'book',
    },
    {
      path: 'formats',
      title: 'Note formats',
      detail: 'Choose how your study notes are structured.',
      icon: 'document',
    },
    {
      path: 'notifications',
      title: 'Notifications',
      detail: 'Check notification availability.',
      icon: 'settings',
    },
    {
      path: 'billing',
      title: 'Billing',
      detail: 'Plan, usage, and payment history.',
      icon: 'courses',
    },
  ];
export function SettingsOverview() {
  const { text } = useLanguage();
  return (
    <section className="settings-workspace">
      <header className="page-heading">
        <div>
          <h1>{text('Settings')}</h1>
          <p>{text('Manage your profile, study preferences, and plan.')}</p>
        </div>
      </header>
      <div className="settings-menu">
        {items.map((item) => (
          <Link
            className="settings-menu-item"
            key={item.path}
            href={`/settings/${item.path}`}
          >
            <span className="settings-menu-icon">
              <Icon name={item.icon} size={22} />
            </span>
            <span>
              <strong>{text(item.title)}</strong>
              <small>{item.detail}</small>
            </span>
            <Icon name="chevron" size={19} />
          </Link>
        ))}
      </div>
      <Link className="danger-link" href="/settings/close">
        {text('Close account')}
      </Link>
    </section>
  );
}
