import { EmptyState } from '@/libs/components/common/EmptyState';

export const metadata = { title: 'Recordings' };

export default function RecordingsPage() {
  return (
    <EmptyState
      eyebrow="KEEP THE MOMENTS THAT MATTER"
      title="Your recordings"
      description="Lecture recordings and their notes will come together here."
      icon="audio"
    />
  );
}
