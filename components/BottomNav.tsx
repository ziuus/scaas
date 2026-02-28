'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LayoutDashboard, CalendarDays, ClipboardList, BarChart3, Bell, Umbrella } from 'lucide-react';

const navItems = {
    principal: [
        { href: '/dashboard/principal', icon: LayoutDashboard, label: 'Home' },
        { href: '/analytics', icon: BarChart3, label: 'Analytics' },
        { href: '/notifications', icon: Bell, label: 'Alerts' },
    ],
    hod: [
        { href: '/dashboard/hod', icon: LayoutDashboard, label: 'Home' },
        { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/leave', icon: Umbrella, label: 'Leave' },
        { href: '/exams', icon: ClipboardList, label: 'Exams' },
        { href: '/notifications', icon: Bell, label: 'Alerts' },
    ],
    faculty: [
        { href: '/dashboard/faculty', icon: LayoutDashboard, label: 'Home' },
        { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/leave', icon: Umbrella, label: 'Leave' },
        { href: '/notifications', icon: Bell, label: 'Alerts' },
    ],
};

export default function BottomNav() {
    const { user } = useAuth();
    const pathname = usePathname();
    if (!user) return null;
    const items = navItems[user.role] || [];

    return (
        <nav style={{
            display: 'none',
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            padding: '0.5rem 0',
            zIndex: 100,
        }}
            className="mobile-bottom-nav"
        >
            <style>{`@media (max-width: 768px) { .mobile-bottom-nav { display: flex !important; } }`}</style>
            {items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                    <Link key={href} href={href} style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: '0.65rem', fontWeight: 600, textDecoration: 'none', padding: '0.25rem 0',
                    }}>
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
