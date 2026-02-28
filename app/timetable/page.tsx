'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    CalendarDays, List, Zap, LayoutGrid, Users, BookOpen,
    CheckCircle2, AlertTriangle, BarChart2, TrendingUp,
} from 'lucide-react';

interface TSlot { day: string; startTime: string; endTime: string; subjectId?: { subjectName?: string; subjectCode?: string }; facultyId?: { _id?: string; name?: string }; roomId?: { roomNumber?: string }; section?: string; semester?: number; }
interface Timetable { _id: string; departmentId?: { name?: string }; semester: number; section: string; isApproved: boolean; slots: TSlot[]; generatedAt: string; }
interface Department { _id: string; name: string; code: string; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['09:00', '10:00', '11:15', '12:15', '14:00', '15:00'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimetablePage() {
    const { user } = useAuth();
    const [timetables, setTimetables] = useState<Timetable[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selected, setSelected] = useState<Timetable | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [genForm, setGenForm] = useState({ departmentId: '', semester: '3', section: 'A', academicYear: '2024-25' });
    const [msg, setMsg] = useState('');
    const [priorityMsg, setPriorityMsg] = useState('');
    const [priorityReport, setPriorityReport] = useState<{ subjectName: string; coverage: number; baseHours: number; scheduledHours: number; priority: string }[]>([]);
    const [generatingPriority, setGeneratingPriority] = useState(false);
    const [priorityForm, setPriorityForm] = useState({ semester: '4', section: 'CS(AI)' });

    // New view states
    const [viewType, setViewType] = useState<'class' | 'faculty'>('class');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');

    const load = useCallback(async () => {
        setLoading(true);
        const [tt, dp] = await Promise.all([
            apiFetch('/api/timetable').then(r => r.json()),
            apiFetch('/api/departments').then(r => r.json()),
        ]);
        setTimetables(tt.timetables || []);
        setDepartments(dp.departments || []);
        if (tt.timetables?.length > 0) setSelected(tt.timetables[0]);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Extract unique faculties from generated timetables
    const faculties = useMemo(() => {
        const facs = new Map();
        timetables.forEach(t => {
            t.slots.forEach(s => {
                if (s.facultyId && s.facultyId._id) {
                    facs.set(s.facultyId._id, s.facultyId);
                }
            });
        });
        const list = Array.from(facs.values());
        if (list.length > 0 && !selectedFacultyId) setSelectedFacultyId(list[0]._id!);
        return list;
    }, [timetables, selectedFacultyId]);

    const generate = async () => {
        setGenerating(true); setMsg('');
        const r = await apiFetch('/api/timetable/generate', { method: 'POST', body: JSON.stringify(genForm) });
        const d = await r.json();
        if (d.timetable) {
            setMsg(`Generated ${d.slotsGenerated} slots!${d.conflicts?.length > 0 ? ` ${d.conflicts.length} conflicts.` : ''}`);
            await load();
        } else setMsg('error:' + d.error);
        setGenerating(false);
    };

    const generatePriority = async () => {
        setGeneratingPriority(true); setPriorityMsg(''); setPriorityReport([]);
        const r = await apiFetch('/api/timetable/generate-priority', {
            method: 'POST',
            body: JSON.stringify(priorityForm),
        });
        const d = await r.json();
        if (d.timetable) {
            setPriorityReport(d.priorityReport || []);
            const conflict = d.conflicts?.length > 0 ? ` ${d.conflicts.length} scheduling conflicts.` : '';
            setPriorityMsg(`success:Generated ${d.slotsGenerated} slots using coverage-based priority.${conflict}`);
            await load();
        } else {
            setPriorityMsg('error:' + (d.error || 'Failed'));
        }
        setGeneratingPriority(false);
    };

    const getSlot = (day: string, time: string) => {
        if (viewType === 'class') {
            return selected?.slots.find(s => s.day === day && s.startTime === time);
        } else {
            // Search all timetables for this faculty
            for (const tt of timetables) {
                const slot = tt.slots.find(s => s.day === day && s.startTime === time && s.facultyId?._id === selectedFacultyId);
                if (slot) {
                    // Inject class info for rendering
                    return { ...slot, section: tt.section, semester: tt.semester };
                }
            }
            return null;
        }
    };

    // Get all slots for current view (for List View)
    const currentSlots = useMemo(() => {
        if (viewType === 'class') return selected?.slots || [];
        // Extract faculty slots and attach semester/section
        const slots: TSlot[] = [];
        timetables.forEach(tt => {
            tt.slots.forEach(s => {
                if (s.facultyId?._id === selectedFacultyId) {
                    slots.push({ ...s, section: tt.section, semester: tt.semester });
                }
            });
        });
        return slots;
    }, [viewType, selected, selectedFacultyId, timetables]);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    const isHODOrPrincipal = ['hod', 'principal'].includes(user?.role || '');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable</h1>
                    <p className="page-subtitle">View and manage class and faculty schedules</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="tabs" style={{ background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                        <button className={`tab ${viewType === 'class' ? 'active' : ''}`} onClick={() => setViewType('class')} style={{ padding: '0.4rem 0.8rem', gap: 6, display: 'flex' }}>
                            <BookOpen size={14} /> Class View
                        </button>
                        <button className={`tab ${viewType === 'faculty' ? 'active' : ''}`} onClick={() => setViewType('faculty')} style={{ padding: '0.4rem 0.8rem', gap: 6, display: 'flex' }}>
                            <Users size={14} /> Faculty View
                        </button>
                    </div>
                    <button onClick={() => setViewMode(v => v === 'calendar' ? 'list' : 'calendar')} className="btn btn-secondary" style={{ gap: '0.5rem', padding: '0.5rem' }} title={`Switch to ${viewMode === 'calendar' ? 'List' : 'Calendar'} View`}>
                        {viewMode === 'calendar' ? <List size={18} /> : <LayoutGrid size={18} />}
                    </button>
                </div>
            </div>

            {/* Selection Nav */}
            {timetables.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    {viewType === 'class' ? (
                        <div className="flex gap-2 flex-wrap">
                            {timetables.map(tt => (
                                <button key={tt._id} onClick={() => setSelected(tt)} className={`btn ${selected?._id === tt._id ? 'btn-primary' : 'btn-secondary'}`} style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}>
                                    <CalendarDays size={14} /> Sem {tt.semester} | {tt.section}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Select Faculty:</label>
                            <select className="form-select" style={{ maxWidth: 300 }} value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}>
                                {faculties.map(f => (
                                    <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {isHODOrPrincipal && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} color="var(--accent)" /> Auto-Generate Timetable
                    </h3>
                    {msg && (
                        <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : msg.includes('conflicts') ? 'alert-warning' : 'alert-success'}`} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {msg.startsWith('error:') ? <AlertTriangle size={16} /> : msg.includes('conflicts') ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                            {msg.replace('error:', '')}
                        </div>
                    )}
                    <div className="form-row">
                        {user?.role === 'principal' && (
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select className="form-select" value={genForm.departmentId} onChange={e => setGenForm({ ...genForm, departmentId: e.target.value })}>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select className="form-select" value={genForm.semester} onChange={e => setGenForm({ ...genForm, semester: e.target.value })}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Section</label>
                            <input className="form-input" value={genForm.section} onChange={e => setGenForm({ ...genForm, section: e.target.value })} placeholder="A" />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ marginTop: '1rem', gap: '0.5rem' }}>
                        {generating ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : <><Zap size={16} /> Generate Class Timetable</>}
                    </button>
                </div>
            )}

            {/* ──── Priority-Based Timetable (HOD Only) ──── */}
            {isHODOrPrincipal && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--accent)" /> Priority Timetable (Syllabus-Driven)
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
                        Uses faculty coverage data to schedule more hours for under-covered subjects.
                        Faculty must enter their coverage in <strong>Coverage Report</strong> first.
                    </p>
                    {priorityMsg && (
                        <div className={`alert ${priorityMsg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {priorityMsg.startsWith('error:') ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                            {priorityMsg.replace('error:', '').replace('success:', '')}
                        </div>
                    )}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select className="form-select" value={priorityForm.semester} onChange={e => setPriorityForm({ ...priorityForm, semester: e.target.value })}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Section</label>
                            <input className="form-input" value={priorityForm.section} onChange={e => setPriorityForm({ ...priorityForm, section: e.target.value })} placeholder="CS(AI)" />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={generatePriority} disabled={generatingPriority} style={{ marginTop: '1rem', gap: '0.5rem' }}>
                        {generatingPriority ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing & Generating...</> : <><BarChart2 size={16} /> Generate Priority Timetable</>}
                    </button>

                    {/* Priority Report */}
                    {priorityReport.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Schedule Priority Report</h4>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            {['Subject', 'Coverage', 'Priority', 'Base Hrs', 'Scheduled Hrs', 'Extra Hrs'].map(h =>
                                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priorityReport.map((row, i) => {
                                            const colors: Record<string, { bg: string; text: string }> = {
                                                Critical: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
                                                High: { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
                                                Medium: { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
                                                Low: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
                                            };
                                            const c = colors[row.priority] || colors.Low;
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{row.subjectName}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 99 }}>
                                                                <div style={{ height: '100%', width: `${row.coverage}%`, background: c.text, borderRadius: 99 }} />
                                                            </div>
                                                            <span style={{ color: c.text, fontWeight: 700 }}>{row.coverage}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>
                                                        <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: 99, background: c.bg, color: c.text, fontWeight: 700, fontSize: '0.72rem' }}>{row.priority}</span>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{row.baseHours}h</td>
                                                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{row.scheduledHours}h</td>
                                                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--accent)' }}>+{row.scheduledHours - row.baseHours}h</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(viewType === 'class' ? selected : selectedFacultyId) && viewMode === 'calendar' && (
                <div className="card">
                    <div className="section-header">
                        <div>
                            <h3 className="section-title">
                                {viewType === 'class'
                                    ? `Sem ${selected?.semester} | Section ${selected?.section}`
                                    : `Faculty: ${faculties.find(f => f._id === selectedFacultyId)?.name || 'Unknown'}`
                                }
                            </h3>
                            <p className="text-sm text-muted">{currentSlots.length} classes scheduled</p>
                        </div>
                        {viewType === 'class' && selected?.isApproved && <span className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Approved</span>}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', width: 70 }}>Time</th>
                                    {DAYS.map((d, i) => <th key={d} style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{DAY_SHORT[i]}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {TIMES.map(time => (
                                    <tr key={time}>
                                        <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{time}</td>
                                        {DAYS.map(day => {
                                            const slot = getSlot(day, time);
                                            return (
                                                <td key={day} style={{ padding: '3px', width: `${100 / 6}%` }}>
                                                    {slot ? (
                                                        <div style={{ background: 'var(--accent-light)', borderLeft: '3px solid var(--accent)', borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.72rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{slot.subjectId?.subjectCode || '—'}</div>
                                                            {viewType === 'class' ? (
                                                                <div style={{ color: 'var(--text-secondary)' }}>{slot.facultyId?.name?.split(' ')[0]}</div>
                                                            ) : (
                                                                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Sem {slot.semester} {slot.section}</div>
                                                            )}
                                                            <div style={{ color: 'var(--text-muted)' }}>{slot.roomId?.roomNumber}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ minHeight: 64, background: 'var(--bg-secondary)', borderRadius: '6px' }} />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(viewType === 'class' ? selected : selectedFacultyId) && viewMode === 'list' && (
                <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>
                        {viewType === 'class'
                            ? `Sem ${selected?.semester} | Section ${selected?.section}`
                            : `Faculty Timetable: ${faculties.find(f => f._id === selectedFacultyId)?.name || 'Unknown'}`
                        }
                    </h3>
                    <div className="card-grid">
                        {DAYS.map(day => {
                            const daySlots = currentSlots.filter(s => s.day === day);
                            return (
                                <div key={day} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 700 }}>{day}</h4>
                                    {daySlots.length === 0 ? <p className="text-xs text-muted">No classes</p> : daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s, i) => (
                                        <div key={i} style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 6, marginBottom: '0.5rem', borderLeft: '3px solid var(--accent)' }}>
                                            <div className="font-bold text-sm">{s.subjectId?.subjectName}</div>
                                            <div className="text-xs text-muted">
                                                {s.startTime}–{s.endTime} ·
                                                {viewType === 'class' ? s.facultyId?.name : <strong style={{ color: 'var(--text-primary)' }}>Sem {s.semester} {s.section}</strong>}
                                                {' · '}{s.roomId?.roomNumber}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {timetables.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <CalendarDays size={48} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3>No Timetables Yet</h3>
                    <p className="text-muted" style={{ marginTop: '0.5rem' }}>Use the generator above to create your first timetable.</p>
                </div>
            )}
        </div>
    );
}
