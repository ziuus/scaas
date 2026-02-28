'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) {
      if (user) router.push(`/dashboard/${user.role}`);
      else router.push('/login');
    }
  }, [user, isLoading, router]);
  return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
}
