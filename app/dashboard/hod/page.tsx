'use client';
import { useState, useEffect } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Users, BookOpen, Clock, FileText,
    CalendarDays, Umbrella, ClipboardList, Eye,
    CheckCircle2, XCircle,
} from 'lucide-react';

export default function HODDashboard() {
    const { user } = useAuth();
    const [faculty, setFaculty] = useState<unknown[]>([]);
    const [leaves, setLeaves] = useState<unknown[]>([]);
    const [subjects, setSubjects] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiFetch('/api/faculty').then(r => r.json()),
            apiFetch('/api/leave').then(r => r.json()),
            apiFetch('/api/subjects').then(r => r.json()),
        ]).then(([f, l, s]) => {
            setFaculty(f.faculty || []);
            setLeaves(l.leaves || []);
            setSubjects(s.subjects || []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    const pendingLeaves = (leaves as { status: string }[]).filter(l => l.status === 'pending').length;

    const quickActions = [
        { href: '/timetable', icon: CalendarDays, label: 'Timetable', color: '#6366f1' },
        { href: '/leave', icon: Umbrella, label: 'Leaves', color: '#fbbf24' },
        { href: '/exams', icon: ClipboardList, label: 'Exams', color: '#34d399' },
        { href: '/invigilator', icon: Eye, label: 'Invigilators', color: '#60a5fa' },
    ];

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">HOD Dashboard</h1>
                    <p className="page-subtitle">{user?.department?.name} &mdash; Department Management</p>
                </div>
            </div>

            <div className="bento-grid">
                {/* Stats Summary */}
                {[
                    { icon: Users, value: faculty.length, label: 'Faculty Members', color: '#6366f1' },
                    { icon: BookOpen, value: subjects.length, label: 'Subjects', color: '#60a5fa' },
                    { icon: Clock, value: pendingLeaves, label: 'Pending Leaves', color: '#fbbf24' },
                    { icon: FileText, value: leaves.length, label: 'Total Requests', color: '#34d399' },
                ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="bento-card bento-col-3 animate-fade-up">
                        <div style={{ background: `${color}15`, padding: '0.65rem', borderRadius: '10px', width: 'fit-content', marginBottom: '0.75rem' }}>
                            <Icon size={20} color={color} strokeWidth={2} />
                        </div>
                        <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.15rem' }}>{value}</div>
                        <div className="stat-label" style={{ fontSize: '0.72rem' }}>{label}</div>
                    </div>
                ))}

                {/* Quick Actions Card */}
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

                {/* Recent Leaves Table */}
                <div className="bento-card bento-col-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    <div className="section-header">
                        <h3 className="section-title">Recent Leave Requests</h3>
                        <a href="/leave" className="text-xs font-bold" style={{ color: 'var(--accent)' }}>View All</a>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead><tr><th>Faculty</th><th>Period</th><th>Status</th></tr></thead>
                            <tbody>
                                {(leaves as { facultyId?: { name?: string }; startDate?: string; endDate?: string; reason?: string; status?: string }[]).slice(0, 5).map((l, i) => (
                                    <tr key={i}>
                                        <td className="font-bold">{l.facultyId?.name || 'N/A'}</td>
                                        <td className="text-sm text-muted">
                                            {l.startDate ? new Date(l.startDate).toLocaleDateString() : ''} &ndash;{' '}
                                            {l.endDate ? new Date(l.endDate).toLocaleDateString() : ''}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${l.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.2rem 0.6rem' }}>
                                                {l.status === 'approved' ? <CheckCircle2 size={10} /> : l.status === 'rejected' ? <XCircle size={10} /> : <Clock size={10} />}
                                                {l.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {leaves.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No leave requests yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
