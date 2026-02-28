'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import AnimatedBackground from './AnimatedBackground';
import { WifiOff, GraduationCap, X } from 'lucide-react';
import styles from './Sidebar.module.css';

const PUBLIC_PATHS = ['/login'];

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showInstall, setShowInstall] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { 
            e.preventDefault(); 
            setDeferredPrompt(e as BeforeInstallPromptEvent); 
            setShowInstall(true); 
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isLoading && !user && !PUBLIC_PATHS.includes(pathname)) {
            router.push('/login');
        }
        if (!isLoading && user && pathname === '/login') {
            router.push(`/dashboard/${user.role}`);
        }
    }, [user, isLoading, pathname, router, mounted]);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            setShowInstall(false);
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    if (isLoading || !mounted) {
        return (
            <div className="loading-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const isPublicPage = PUBLIC_PATHS.includes(pathname);

    return (
        <div className={styles.appShell}>
            <AnimatedBackground />
            {!isOnline && (
                <div style={{
                    background: 'var(--warning)', color: '#1a1a1a',
                    padding: '0.5rem 1rem', textAlign: 'center',
                    fontSize: '0.85rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
                }}>
                    <WifiOff size={16} /> You are offline — viewing cached data
                </div>
            )}
            {!isPublicPage && user && <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />}
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
                        <div style={{ background: 'var(--accent-gradient)', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
