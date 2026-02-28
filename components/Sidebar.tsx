'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
    LayoutDashboard, CalendarDays, Users, BookOpen,
    Umbrella, ClipboardList, Eye, Upload,
    BarChart3, BarChart2, Bell, LogOut, GraduationCap, X
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import styles from './Sidebar.module.css';

const NAV_ITEMS = {
    principal: [
        { href: '/dashboard/principal', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/analytics', icon: BarChart3, label: 'Analytics' },
        { href: '/exams', icon: ClipboardList, label: 'Exams' },
        { href: '/invigilator', icon: Eye, label: 'Invigilator' },
        { href: '/import', icon: Upload, label: 'Bulk Import' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
    ],
    hod: [
        { href: '/dashboard/hod', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/faculty', icon: Users, label: 'Faculty' },
        { href: '/subjects', icon: BookOpen, label: 'Subjects' },
        { href: '/coverage', icon: BarChart2, label: 'Coverage Report' },
        { href: '/leave', icon: Umbrella, label: 'Leave' },
        { href: '/exams', icon: ClipboardList, label: 'Exams' },
        { href: '/invigilator', icon: Eye, label: 'Invigilator' },
        { href: '/import', icon: Upload, label: 'Bulk Import' },
        { href: '/analytics', icon: BarChart3, label: 'Analytics' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
    ],
    faculty: [
        { href: '/dashboard/faculty', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/coverage', icon: BarChart2, label: 'My Coverage' },
        { href: '/leave', icon: Umbrella, label: 'Leave' },
        { href: '/invigilator', icon: Eye, label: 'My Duties' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
    ],
};

export default function Sidebar({ isOpen, toggle }: { isOpen?: boolean; toggle?: () => void }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted || !user) return null;
    const items = NAV_ITEMS[user.role] || [];
    const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className={styles.mobileOverlay} onClick={toggle} />}
            
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                {/* Mobile Close Button */}
                <button className={styles.closeBtn} onClick={toggle}>
                    <X size={20} />
                </button>

                {/* Logo */}
                <div className={styles.logo}>
                <GraduationCap size={32} color="var(--accent)" strokeWidth={1.5} />
                <div>
                    <div className={styles.logoName}>SmartCollege</div>
                    <div className={styles.logoTagline}>Academic Automation</div>
                </div>
            </div>

            {/* User info */}
            <div className={styles.userInfo}>
                <div className={styles.avatar}>{initials}</div>
                <div>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userRole}>{user.role}</div>
                    {user.department?.name && <div className={styles.userDept}>{user.department.name}</div>}
                </div>
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
                {items.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || (href !== '/dashboard/' + user.role && pathname.startsWith(href) && href !== '/');
                    return (
                        <Link key={href} href={href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={styles.navIcon} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                    <ThemeToggle />
                    <button className={styles.logoutBtnSmall} onClick={logout} title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
        </>
    );
}
