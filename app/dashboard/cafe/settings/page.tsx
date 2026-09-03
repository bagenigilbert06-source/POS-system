import { redirect } from 'next/navigation';

export default async function CafeSettingsPage() {
  redirect('/dashboard/admin/cafe');
}
