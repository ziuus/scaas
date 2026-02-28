'use client';
import { useState, useEffect } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import { Umbrella, Bell, CalendarDays, Eye, AlertCircle } from 'lucide-react';

export default function FacultyDashboard() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<unknown[]>([]);
    const [notifications, setNotifications] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiFetch('/api/leave').then(r => r.json()),
            apiFetch('/api/notifications').then(r => r.json()),
        ]).then(([l, n]) => {
            setLeaves(l.leaves || []);
            setNotifications(n.notifications || []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    const unread = (notifications as { isRead: boolean }[]).filter(n => !n.isRead).length;

    const quickActions = [
        { href: '/timetable', icon: CalendarDays, label: 'View My Timetable (Offline Ready)' },
        { href: '/leave', icon: Umbrella, label: 'Apply for Leave' },
        { href: '/invigilator', icon: Eye, label: 'My Invigilation Duties' },
        { href: '/notifications', icon: Bell, label: `Notifications${unread > 0 ? ` (${unread} new)` : ''}` },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Dashboard</h1>
                    <p className="page-subtitle">Welcome, {user?.name} — {user?.department?.name}</p>
                </div>
            </div>

            <div className="card-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { Icon: Umbrella, value: leaves.length, label: 'Leaves Taken', color: 'var(--accent)' },
                    { Icon: Bell, value: unread, label: 'Unread Alerts', color: 'var(--info)' },
                ].map(({ Icon, value, label, color }) => (
                    <div key={label} className="stat-card">
                        <div className="stat-icon"><Icon size={28} color={color} strokeWidth={1.5} /></div>
                        <div className="stat-value" style={{ color }}>{value}</div>
                        <div className="stat-label">{label}</div>
                    </div>
                ))}
            </div>

            <div className="card-grid">
                <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {quickActions.map(({ href, icon: Icon, label }) => (
                            <a key={href} href={href} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
                                <Icon size={16} /> {label}
                            </a>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Recent Alerts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(notifications as { _id: string; title: string; body: string; isRead: boolean }[]).slice(0, 5).map(n => (
                            <div key={n._id} style={{
                                padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                                background: n.isRead ? 'var(--bg-secondary)' : 'var(--accent-light)',
                                border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--border-accent)'}`,
                                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            }}>
                                <AlertCircle size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                                <div>
                                    <div className="font-bold text-sm">{n.title}</div>
                                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{n.body}</div>
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && <p className="text-muted text-sm">No notifications yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
