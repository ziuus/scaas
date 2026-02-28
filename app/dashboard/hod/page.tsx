'use client';
import { useState, useEffect } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Users, BookOpen, Clock, FileText,
    CalendarDays, Umbrella, ClipboardList, Eye,
    Upload, BarChart3, CheckCircle2, XCircle,
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
        { href: '/timetable', icon: CalendarDays, label: 'Generate Timetable' },
        { href: '/leave', icon: Umbrella, label: 'Manage Leaves' },
        { href: '/exams', icon: ClipboardList, label: 'Schedule Exams' },
        { href: '/invigilator', icon: Eye, label: 'Assign Invigilators' },
        { href: '/import', icon: Upload, label: 'Bulk Import' },
        { href: '/analytics', icon: BarChart3, label: 'View Analytics' },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">HOD Dashboard</h1>
                    <p className="page-subtitle">{user?.department?.name} — Department Management</p>
                </div>
            </div>

            <div className="card-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: Users, value: faculty.length, label: 'Faculty Members', color: 'var(--accent)' },
                    { icon: BookOpen, value: subjects.length, label: 'Subjects', color: 'var(--info)' },
                    { icon: Clock, value: pendingLeaves, label: 'Pending Leaves', color: 'var(--warning)' },
                    { icon: FileText, value: leaves.length, label: 'Total Requests', color: 'var(--success)' },
                ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="stat-card">
                        <div className="stat-icon"><Icon size={28} color={color} strokeWidth={1.5} /></div>
                        <div className="stat-value" style={{ color }}>{value}</div>
                        <div className="stat-label">{label}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {quickActions.map(({ href, icon: Icon, label }) => (
                        <a key={href} href={href} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
                            <Icon size={16} /> {label}
                        </a>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="section-header"><h3 className="section-title">Recent Leave Requests</h3></div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead><tr><th>Faculty</th><th>Period</th><th>Reason</th><th>Status</th></tr></thead>
                        <tbody>
                            {(leaves as { facultyId?: { name?: string }; startDate?: string; endDate?: string; reason?: string; status?: string }[]).slice(0, 5).map((l, i) => (
                                <tr key={i}>
                                    <td className="font-bold">{l.facultyId?.name || 'N/A'}</td>
                                    <td className="text-sm text-muted">
                                        {l.startDate ? new Date(l.startDate).toLocaleDateString() : ''} –{' '}
                                        {l.endDate ? new Date(l.endDate).toLocaleDateString() : ''}
                                    </td>
                                    <td className="text-sm">{l.reason}</td>
                                    <td>
                                        <span className={`badge badge-${l.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {l.status === 'approved' ? <CheckCircle2 size={12} /> : l.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                                            {l.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {leaves.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
