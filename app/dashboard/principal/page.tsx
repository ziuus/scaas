'use client';
import { useState, useEffect } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Users, Umbrella, CalendarDays, Building2,
    TrendingUp, CheckCircle2,
    Clock, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

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
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="page-header">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="page-title">Principal Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name} &mdash; Full system overview</p>
                </motion.div>
            </div>

            <div className="bento-grid">
                {/* Stats Summary Section */}
                {[
                    { icon: Users, value: s?.totalFaculty ?? 0, label: 'Total Faculty', color: '#6366f1' },
                    { icon: Umbrella, value: stats.leaveByStatus?.pending ?? 0, label: 'Pending Leaves', color: '#fbbf24' },
                    { icon: CalendarDays, value: s?.totalTimetableSlots ?? 0, label: 'Timetable Slots', color: '#34d399' },
                    { icon: Building2, value: s?.totalRooms ?? 0, label: 'Total Rooms', color: '#60a5fa' },
                ].map(({ icon: Icon, value, label, color }, i) => (
                    <motion.div 
                        key={label} 
                        className="bento-card bento-col-3"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 * i + 0.3 }}
                        whileHover={{ y: -5, boxShadow: 'var(--shadow-accent)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <div style={{ background: `${color}15`, padding: '0.75rem', borderRadius: '12px' }}>
                                <Icon size={24} color={color} strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: '1.75rem', marginBottom: '0.25rem' }}>{value}</div>
                        <div className="stat-label" style={{ fontSize: '0.75rem' }}>{label}</div>
                    </motion.div>
                ))}

                {/* Major Insight: Workload */}
                <motion.div 
                    className="bento-card bento-col-8"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className="section-header">
                        <h3 className="section-title">Faculty Workload Overview</h3>
                        <TrendingUp size={18} color="var(--accent)" />
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead><tr><th>Faculty</th><th>Department</th><th>Usage</th><th>Utilization</th></tr></thead>
                            <tbody>
                                {(stats.workloadData || []).slice(0, 6).map(f => (
                                    <tr key={f.name}>
                                        <td className="font-bold">{f.name}</td>
                                        <td className="text-muted text-sm">{f.department}</td>
                                        <td>{f.currentLoad}/{f.maxLoad}h</td>
                                        <td style={{ width: '150px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${f.utilizationPct}%` }}
                                                        transition={{ duration: 1, delay: 1 }}
                                                        style={{ height: '100%', background: f.utilizationPct > 90 ? 'var(--danger)' : 'var(--accent)', borderRadius: '3px' }} 
                                                    />
                                                </div>
                                                <span className="text-xs text-muted" style={{ minWidth: '30px' }}>{f.utilizationPct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Insight Column */}
                <div className="bento-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <motion.div 
                        className="bento-card"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        style={{ flex: 1 }}
                    >
                        <div className="section-header"><h3 className="section-title">Leave Trends</h3></div>
                        {stats.leaveByStatus && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {[
                                    { key: 'pending', label: 'Pending', Icon: Clock, color: 'var(--warning)' },
                                    { key: 'approved', label: 'Approved', Icon: CheckCircle2, color: 'var(--success)' },
                                    { key: 'rejected', label: 'Rejected', Icon: XCircle, color: 'var(--danger)' },
                                ].map(({ key, label, Icon, color }) => {
                                    const count = stats.leaveByStatus?.[key as 'pending' | 'approved' | 'rejected'] ?? 0;
                                    const total = (stats.leaveByStatus?.pending ?? 0) + (stats.leaveByStatus?.approved ?? 0) + (stats.leaveByStatus?.rejected ?? 0);
                                    const pct = total > 0 ? (count / total) * 100 : 0;
                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between items-center text-sm" style={{ marginBottom: '6px' }}>
                                                <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Icon size={14} color={color} />{label}</span>
                                                <span className="font-bold">{count}</span>
                                            </div>
                                            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 1, delay: 1.2 }}
                                                    style={{ height: '100%', background: color, borderRadius: '2px' }} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>

                    <motion.div 
                        className="bento-card"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.9 }}
                    >
                        <div className="section-header"><h3 className="section-title">Top Invigilators</h3></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {(stats.invigilationDist || []).slice(0, 3).map((f, i) => (
                                <motion.div 
                                    key={f.name} 
                                    className="flex justify-between items-center"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.5 + (0.1 * i) }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--accent)', fontWeight: 800 }}>
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-medium">{f.name}</span>
                                    </div>
                                    <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{f.count} duties</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
