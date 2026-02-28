'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/auth-context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function AnalyticsPage() {
    const [data, setData] = useState<{
        workloadData?: { name: string; currentLoad: number; maxLoad: number; utilizationPct: number }[];
        leaveByStatus?: { pending: number; approved: number; rejected: number };
        leaveByMonth?: { month: string; count: number }[];
        roomUtilization?: { roomNumber: string; usageCount: number }[];
        invigilationDist?: { name: string; count: number }[];
        summary?: { totalFaculty: number; totalLeaves: number; totalTimetableSlots: number; totalRooms: number };
    }>({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const r = await apiFetch('/api/analytics');
        const d = await r.json();
        setData(d);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const leaveStatusData = useMemo(() => {
        return data.leaveByStatus
            ? Object.entries(data.leaveByStatus).map(([name, value]) => ({ name, value }))
            : [];
    }, [data.leaveByStatus]);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    const tooltipStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };

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
                    <h1 className="page-title">Analytics Dashboard</h1>
                    <p className="page-subtitle">Comprehensive insights into academic operations</p>
                </motion.div>
                <button className="btn btn-secondary" onClick={load}>🔄 Refresh</button>
            </div>

            {/* Summary KPIs */}
            <div className="card-grid" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: '👩‍🏫', value: data.summary?.totalFaculty ?? 0, label: 'Total Faculty' },
                    { icon: '🏖️', value: data.summary?.totalLeaves ?? 0, label: 'Total Leaves' },
                    { icon: '📅', value: data.summary?.totalTimetableSlots ?? 0, label: 'Timetable Slots' },
                    { icon: '🏛️', value: data.summary?.totalRooms ?? 0, label: 'Rooms' },
                ].map(({ icon, value, label }, i) => (
                    <motion.div 
                        key={label} 
                        className="stat-card"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * i + 0.3 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                    >
                        <div className="stat-icon">{icon}</div>
                        <div className="stat-value" style={{ color: 'var(--accent)' }}>{value}</div>
                        <div className="stat-label">{label}</div>
                    </motion.div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Leave by Month */}
                <motion.div 
                    className="card"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Leave Trends by Month</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={data.leaveByMonth || []}>
                            <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Leave status pie */}
                <motion.div 
                    className="card"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Leave Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie 
                                data={leaveStatusData} 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={70} 
                                dataKey="value" 
                                label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}`} 
                                labelLine={{ stroke: 'var(--text-muted)' }}
                            >
                                {leaveStatusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Faculty Workload */}
            <motion.div 
                className="card" 
                style={{ marginBottom: '1.5rem' }}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
            >
                <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Faculty Workload Utilization (%)</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(data.workloadData || []).slice(0, 12)} margin={{ bottom: 40 }}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}%`, 'Utilization']} />
                        <Bar dataKey="utilizationPct" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Room Utilization */}
                <motion.div 
                    className="card"
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Room Usage Count</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={(data.roomUtilization || []).slice(0, 8)}>
                            <XAxis dataKey="roomNumber" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="usageCount" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Invigilation Distribution */}
                <motion.div 
                    className="card"
                    initial={{ x: 20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Invigilation Duty Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        < BarChart data={(data.invigilationDist || []).slice(0, 8)} layout="vertical">
                            <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </motion.div>
    );
}
