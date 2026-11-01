import Link from 'next/link';
import { Brand } from '@/libs/components/common/Brand';
import { Icon } from '@/libs/components/common/Icon';

export function PublicHeader() {
  return (
    <header className="landing-header">
      <Link href="/en" aria-label="Archy home">
        <Brand />
      </Link>
      <nav aria-label="Website navigation">
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/login?next=%2Fdashboard" className="primary-button">
          Get started <Icon name="arrow" size={15} />
        </Link>
      </nav>
    </header>
  );
}
