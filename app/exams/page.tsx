'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    ClipboardList, Plus, Building2, CalendarDays,
    Clock, Armchair, CheckCircle2, AlertTriangle,
} from 'lucide-react';

interface Exam { _id: string; name: string; departmentId?: { name?: string }; semester: number; examDate: string; startTime: string; endTime: string; status: string; }

export default function ExamsPage() {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', departmentId: '', semester: '3', examDate: '', startTime: '09:00', endTime: '12:00' });
    const [msg, setMsg] = useState('');
    const [allocating, setAllocating] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [e, d] = await Promise.all([
            apiFetch('/api/exams').then(r => r.json()),
            apiFetch('/api/departments').then(r => r.json()),
        ]);
        setExams(e.exams || []);
        setDepartments(d.departments || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const createExam = async () => {
        const r = await apiFetch('/api/exams', { method: 'POST', body: JSON.stringify({ ...form, semester: parseInt(form.semester) }) });
        const d = await r.json();
        if (d.exam) { setMsg('success'); setShowForm(false); await load(); }
        else setMsg('error:' + d.error);
    };

    const allocateSeating = async (examId: string) => {
        setAllocating(examId); setMsg('');
        const r = await apiFetch('/api/exams', { method: 'PUT', body: JSON.stringify({ examId }) });
        const d = await r.json();
        if (d.totalAllocated !== undefined)
            setMsg(`Seating allocated for ${d.totalAllocated} students!${d.unallocated?.length > 0 ? ` ${d.unallocated.length} unallocated.` : ''}`);
        else setMsg('error:' + d.error);
        setAllocating(null);
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const isHOD = ['hod', 'principal'].includes(user?.role || '');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Exam Management</h1>
                    <p className="page-subtitle">Schedule exams and auto-allocate seating</p>
                </div>
                {isHOD && (
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ gap: '0.5rem' }}>
                        <Plus size={16} /> Schedule Exam
                    </button>
                )}
            </div>

            {msg === 'success' && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><CheckCircle2 size={16} /> Exam created successfully!</div>}
            {msg.startsWith('error:') && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertTriangle size={16} />{msg.replace('error:', '')}</div>}
            {!msg.startsWith('error:') && msg && !msg.startsWith('success') && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><CheckCircle2 size={16} />{msg}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={18} color="var(--accent)" /> New Exam
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Exam Name</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mid-Term Examination 2024" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                                    <option value="">Select</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select className="form-select" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Exam Date</label>
                                <input className="form-input" type="date" value={form.examDate} onChange={e => setForm({ ...form, examDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Start Time</label>
                                <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <input className="form-input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={createExam} style={{ gap: '0.5rem' }}><Plus size={16} /> Create Exam</button>
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-grid">
                {exams.map(exam => (
                    <div key={exam._id} className="card">
                        <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{exam.name}</h3>
                            <span className={`badge badge-${exam.status === 'completed' ? 'approved' : exam.status === 'ongoing' ? 'warning' : 'primary'}`}>{exam.status}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <div className="flex items-center gap-2 text-muted"><Building2 size={14} /><span>{exam.departmentId?.name}</span></div>
                            <div className="flex items-center gap-2 text-muted"><CalendarDays size={14} /><span>{new Date(exam.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                            <div className="flex items-center gap-2 text-muted"><Clock size={14} /><span>{exam.startTime} – {exam.endTime}</span></div>
                            <div className="flex items-center gap-2 text-muted"><ClipboardList size={14} /><span>Semester {exam.semester}</span></div>
                        </div>
                        {isHOD && (
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                                onClick={() => allocateSeating(exam._id)}
                                disabled={allocating === exam._id}
                            >
                                {allocating === exam._id ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Allocating...</> : <><Armchair size={14} /> Auto-Allocate Seating</>}
                            </button>
                        )}
                    </div>
                ))}
                {exams.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                        <ClipboardList size={48} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <h3>No Exams Scheduled</h3>
                        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Create your first exam using the button above.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
