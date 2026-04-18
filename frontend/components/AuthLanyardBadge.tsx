'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';

// Dynamically import with no SSR — Three.js requires browser APIs
const UserLanyardBadge = dynamic(
  () => import('./reactbits/Lanyard/UserLanyardBadge'),
  { ssr: false }
);

export default function AuthLanyardBadge() {
  const { user, loading } = useAuth();

  // Don't render during SSR or while auth is loading, or if not logged in
  if (loading || !user) return null;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  return (
    <UserLanyardBadge
      userName={name}
      userEmail={user.email}
      avatarUrl={user.user_metadata?.avatar_url}
    />
  );
}
