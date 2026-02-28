'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Bell, CheckCheck, BellOff, Info, AlertTriangle,
    CalendarDays, Layout, UserCheck, RefreshCw,
} from 'lucide-react';

interface Notification { _id: string; title: string; body: string; type: string; isRead: boolean; createdAt: string; }

const typeIcon = (type: string) => {
    const props = { size: 18, strokeWidth: 1.8 };
    if (type === 'leave_approved') return <UserCheck {...props} color="var(--success)" />;
    if (type === 'exam_duty') return <CalendarDays {...props} color="var(--accent)" />;
    if (type === 'replacement_request') return <RefreshCw {...props} color="var(--warning)" />;
    if (type === 'timetable_change') return <Layout {...props} color="var(--info)" />;
    return <AlertTriangle {...props} color="var(--text-muted)" />;
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { } = useAuth();

    const load = useCallback(async () => {
        setLoading(true);
        const r = await apiFetch('/api/notifications');
        const d = await r.json();
        setNotifications(d.notifications || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const markAllRead = async () => {
        await apiFetch('/api/notifications', { method: 'PUT', body: JSON.stringify({ markAllRead: true }) });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const markRead = async (id: string) => {
        await apiFetch('/api/notifications', { method: 'PUT', body: JSON.stringify({ id, isRead: true }) });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const unread = notifications.filter(n => !n.isRead).length;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notifications</h1>
                    <p className="page-subtitle">
                        {unread > 0 ? `${unread} unread alert${unread > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unread > 0 && (
                    <button className="btn btn-secondary" onClick={markAllRead} style={{ gap: '0.5rem' }}>
                        <CheckCheck size={16} /> Mark All Read
                    </button>
                )}
            </div>

            <div className="card">
                {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <BellOff size={48} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <h3>No Notifications</h3>
                        <p className="text-muted" style={{ marginTop: '0.5rem' }}>You&apos;re all caught up!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.map(n => (
                            <div
                                key={n._id}
                                onClick={() => !n.isRead && markRead(n._id)}
                                style={{
                                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                                    padding: '1rem 1.25rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: n.isRead ? 'transparent' : 'var(--accent-light)',
                                    border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--border-accent)'}`,
                                    cursor: n.isRead ? 'default' : 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ flexShrink: 0, marginTop: 2 }}>{typeIcon(n.type)}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontWeight: n.isRead ? 500 : 700, fontSize: '0.9rem' }}>{n.title}</span>
                                        {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                                    </div>
                                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>{n.body}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
