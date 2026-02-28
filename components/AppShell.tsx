'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { WifiOff, GraduationCap, X } from 'lucide-react';

const PUBLIC_PATHS = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isOnline, setIsOnline] = useState(true);
    const [showInstall, setShowInstall] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        if (!isLoading && !user && !PUBLIC_PATHS.includes(pathname)) {
            router.push('/login');
        }
        if (!isLoading && user && pathname === '/login') {
            router.push(`/dashboard/${user.role}`);
        }
    }, [user, isLoading, pathname, router]);

    const handleInstall = async () => {
        if (deferredPrompt) {
            (deferredPrompt as BeforeInstallPromptEvent).prompt?.();
            setShowInstall(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const isPublicPage = PUBLIC_PATHS.includes(pathname);

    return (
        <div className="app-wrapper">
            {!isOnline && (
                <div style={{
                    background: 'var(--warning)', color: '#1a1a1a',
                    padding: '0.5rem 1rem', textAlign: 'center',
                    fontSize: '0.85rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                }}>
                    <WifiOff size={16} /> You are offline — viewing cached data
                </div>
            )}
            {!isPublicPage && user && <Sidebar />}
            <main className={isPublicPage ? '' : 'main-content'} style={!isOnline ? { paddingTop: '2.5rem' } : {}}>
                {children}
            </main>
            {!isPublicPage && user && <BottomNav />}
            {showInstall && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
                    padding: '1rem 1.5rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', zIndex: 200,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GraduationCap size={22} color="white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <strong>Install SmartCollege</strong>
                            <p className="text-sm text-muted" style={{ marginTop: '2px' }}>Add to home screen for offline access</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={handleInstall}>Install</button>
                        <button className="btn btn-icon btn-sm" onClick={() => setShowInstall(false)}><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface BeforeInstallPromptEvent extends Event {
    prompt?: () => Promise<void>;
}
