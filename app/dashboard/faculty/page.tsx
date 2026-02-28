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
        { href: '/timetable', icon: CalendarDays, label: 'Timetable', color: '#6366f1' },
        { href: '/leave', icon: Umbrella, label: 'Leave', color: '#fbbf24' },
        { href: '/invigilator', icon: Eye, label: 'Duties', color: '#34d399' },
        { href: '/notifications', icon: Bell, label: 'Alerts', color: '#60a5fa' },
    ];

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Dashboard</h1>
                    <p className="page-subtitle">Welcome, {user?.name} &mdash; {user?.department?.name}</p>
                </div>
            </div>

            <div className="bento-grid">
                {/* Stats Summary */}
                {[
                    { icon: Umbrella, value: leaves.length, label: 'Leaves Taken', color: '#6366f1' },
                    { icon: Bell, value: unread, label: 'Unread Alerts', color: '#60a5fa' },
                ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="bento-card bento-col-4 animate-fade-up">
                        <div style={{ background: `${color}15`, padding: '0.65rem', borderRadius: '10px', width: 'fit-content', marginBottom: '0.75rem' }}>
                            <Icon size={20} color={color} strokeWidth={2} />
                        </div>
                        <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.15rem' }}>{value}</div>
                        <div className="stat-label" style={{ fontSize: '0.72rem' }}>{label}</div>
                    </div>
                ))}

                {/* Quick Actions */}
                <div className="bento-card bento-col-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <div className="section-header"><h3 className="section-title">Quick Actions</h3></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {quickActions.map(({ href, icon: Icon, label, color }) => (
                            <a key={href} href={href} className="btn btn-secondary" style={{ 
                                padding: '1rem', 
                                flexDirection: 'column', 
                                gap: '0.5rem', 
                                height: 'auto',
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-glass)'
                            }}>
                                <Icon size={20} color={color} />
                                <span className="text-xs font-bold">{label}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="bento-card bento-col-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    <div className="section-header">
                        <h3 className="section-title">Recent Alerts</h3>
                        <a href="/notifications" className="text-xs font-bold" style={{ color: 'var(--accent)' }}>View All</a>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {(notifications as { _id: string; title: string; body: string; isRead: boolean }[]).slice(0, 4).map(n => (
                            <div key={n._id} className="list-item" style={{
                                padding: '0.75rem 1rem',
                                background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                                border: `1px solid ${n.isRead ? 'var(--border)' : 'rgba(129, 140, 248, 0.15)'}`,
                            }}>
                                <div style={{ background: n.isRead ? 'var(--bg-secondary)' : 'var(--accent-light)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <AlertCircle size={14} color={n.isRead ? 'var(--text-muted)' : 'var(--accent)'} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="font-bold text-sm" style={{ color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{n.title}</div>
                                    <div className="text-xs text-muted" style={{ marginTop: '3px' }}>{n.body}</div>
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>No notifications yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
