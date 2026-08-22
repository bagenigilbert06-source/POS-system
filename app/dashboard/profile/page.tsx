import type { Metadata } from 'next';
import { UserRound } from 'lucide-react';
import { getOwnProfile } from '@/app/actions/profile';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { ProfileSettings } from '@/components/profile/profile-settings';

export const metadata: Metadata = { title: 'My profile | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const profile = await getOwnProfile();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <DashboardPageHeading
        theme="adaptive"
        icon={UserRound}
        eyebrow="Personal account"
        title="My profile"
        description="Manage your identity, profile photo and account security."
      />
      <ProfileSettings profile={profile} />
    </div>
  );
}
