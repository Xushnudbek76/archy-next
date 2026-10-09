import Link from 'next/link';
import { Icon, type IconName } from '@/libs/components/common/Icon';

export function EmptyState({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
}) {
  return (
    <section className="page-content">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-intro">{description}</p>
      <div className="empty-state">
        <div className="empty-icon">
          <Icon name={icon} size={32} />
        </div>
        <h2>Your workspace is taking shape</h2>
        <p>This part of Archy is coming next.</p>
        <Link href="/" className="text-link">
          Back to overview <Icon name="arrow" size={17} />
        </Link>
      </div>
    </section>
  );
}
