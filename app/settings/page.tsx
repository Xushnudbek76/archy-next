import { EmptyState } from '@/libs/components/common/EmptyState';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <EmptyState
      eyebrow="MAKE YOURSELF AT HOME"
      title="Workspace settings"
      description="A space to make Archy feel a little more like you."
      icon="settings"
    />
  );
}
