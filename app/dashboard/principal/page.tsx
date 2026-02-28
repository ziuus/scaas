'use client';
import { useState, useEffect } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Users, Umbrella, CalendarDays, Building2,
    TrendingUp, Award, BarChart3, CheckCircle2,
    Clock, XCircle
} from 'lucide-react';

interface Stats {
    summary?: { totalFaculty: number; totalLeaves: number; totalTimetableSlots: number; totalRooms: number };
    workloadData?: { name: string; department: string; currentLoad: number; maxLoad: number; utilizationPct: number; invigilationCount: number }[];
    leaveByStatus?: { pending: number; approved: number; rejected: number };
    invigilationDist?: { name: string; count: number }[];
}

export default function PrincipalDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/api/analytics').then(r => r.json()).then(d => { setStats(d); setLoading(false); });
    }, []);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const s = stats.summary;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Principal Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name} — Full system overview</p>
                </div>
            </div>

            <div className="card-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: Users, value: s?.totalFaculty ?? 0, label: 'Total Faculty', color: 'var(--accent)' },
                    { icon: Umbrella, value: stats.leaveByStatus?.pending ?? 0, label: 'Pending Leaves', color: 'var(--warning)' },
                    { icon: CalendarDays, value: s?.totalTimetableSlots ?? 0, label: 'Timetable Slots', color: 'var(--success)' },
                    { icon: Building2, value: s?.totalRooms ?? 0, label: 'Total Rooms', color: 'var(--info)' },
                ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="stat-card">
                        <div className="stat-icon"><Icon size={28} color={color} strokeWidth={1.5} /></div>
                        <div className="stat-value" style={{ color }}>{value}</div>
                        <div className="stat-label">{label}</div>
                    </div>
                ))}
            </div>

            <div className="card-grid">
                <div className="card">
                    <div className="section-header"><h3 className="section-title">Leave Status Overview</h3></div>
                    {stats.leaveByStatus && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {([
                                { key: 'pending', label: 'Pending', Icon: Clock, color: 'var(--warning)' },
                                { key: 'approved', label: 'Approved', Icon: CheckCircle2, color: 'var(--success)' },
                                { key: 'rejected', label: 'Rejected', Icon: XCircle, color: 'var(--danger)' },
                            ] as { key: 'pending' | 'approved' | 'rejected'; label: string; Icon: React.FC<{ size: number; color: string }>; color: string }[]).map(({ key, label, Icon, color }) => {
                                const count = stats.leaveByStatus![key];
                                return (
                                    <div key={key}>
                                        <div className="flex justify-between text-sm" style={{ marginBottom: '4px' }}>
                                            <span className="flex items-center gap-2"><Icon size={14} color={color} />{label}</span>
                                            <span className="font-bold">{count}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${Math.min(100, count * 20)}%`, background: color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="section-header"><h3 className="section-title">Top Invigilators</h3></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(stats.invigilationDist || []).slice(0, 5).map((f, i) => (
                            <div key={f.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.875rem' }}>#{i + 1}</span>
                                    <Award size={14} color="var(--accent)" />
                                    <span className="text-sm">{f.name}</span>
                                </div>
                                <span className="badge badge-primary">{f.count} duties</span>
                            </div>
                        ))}
                        {(stats.invigilationDist || []).length === 0 && <p className="text-muted text-sm">No invigilation data yet.</p>}
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="section-header">
                        <h3 className="section-title">Faculty Workload Overview</h3>
                        <TrendingUp size={18} color="var(--accent)" />
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead><tr><th>Faculty</th><th>Department</th><th>Load</th><th>Utilization</th><th>Invigilations</th></tr></thead>
                            <tbody>
                                {(stats.workloadData || []).slice(0, 10).map(f => (
                                    <tr key={f.name}>
                                        <td className="font-bold">{f.name}</td>
                                        <td className="text-muted text-sm">{f.department}</td>
                                        <td>{f.currentLoad}/{f.maxLoad} hrs</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="progress-bar" style={{ flex: 1 }}>
                                                    <div className="progress-fill" style={{ width: `${f.utilizationPct}%` }} />
                                                </div>
                                                <span className="text-xs text-muted">{f.utilizationPct}%</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-info">{f.invigilationCount}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
