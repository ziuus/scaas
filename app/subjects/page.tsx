'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import { BookOpen, Plus, Pencil, Trash2, Building2, Clock, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface Subject { _id: string; subjectCode: string; subjectName: string; semester: number; section: string; subjectType: 'theory' | 'lab' | 'elective'; hoursPerWeek: number; departmentId?: { _id?: string; name?: string }; }
interface Department { _id: string; name: string; }

export default function SubjectsPage() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Subject | null>(null);
    const [form, setForm] = useState({ subjectCode: '', subjectName: '', semester: '3', section: 'A', subjectType: 'theory', hoursPerWeek: '3', departmentId: '' });
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [s, d] = await Promise.all([
            apiFetch('/api/subjects').then(r => r.json()),
            apiFetch('/api/departments').then(r => r.json()),
        ]);
        setSubjects(s.subjects || []);
        setDepartments(d.departments || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditing(null);
        setForm({ subjectCode: '', subjectName: '', semester: '3', section: 'A', subjectType: 'theory', hoursPerWeek: '3', departmentId: departments[0]?._id || '' });
        setShowForm(true);
    };

    const openEdit = (s: Subject) => {
        setEditing(s);
        setForm({ subjectCode: s.subjectCode, subjectName: s.subjectName, semester: String(s.semester), section: s.section, subjectType: s.subjectType, hoursPerWeek: String(s.hoursPerWeek), departmentId: (s.departmentId as { _id?: string })?._id || '' });
        setShowForm(true);
    };

    const save = async () => {
        setMsg('');
        const payload = { ...form, semester: parseInt(form.semester), hoursPerWeek: parseInt(form.hoursPerWeek) };
        const r = editing
            ? await apiFetch('/api/subjects', { method: 'PUT', body: JSON.stringify({ id: editing._id, ...payload }) })
            : await apiFetch('/api/subjects', { method: 'POST', body: JSON.stringify(payload) });
        const d = await r.json();
        if (d.subject) { setMsg('success'); setShowForm(false); await load(); }
        else setMsg('error:' + (d.error || 'Failed to save'));
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this subject?')) return;
        await apiFetch('/api/subjects', { method: 'DELETE', body: JSON.stringify({ id }) });
        await load();
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const canEdit = ['hod', 'principal'].includes(user?.role || '');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Subjects</h1>
                    <p className="page-subtitle">{subjects.length} subjects configured</p>
                </div>
                {canEdit && (
                    <button className="btn btn-primary" onClick={openAdd} style={{ gap: '0.5rem' }}>
                        <Plus size={16} /> Add Subject
                    </button>
                )}
            </div>

            {msg === 'success' && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><CheckCircle2 size={16} /> Subject saved!</div>}
            {msg.startsWith('error:') && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertTriangle size={16} />{msg.replace('error:', '')}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={18} color="var(--accent)" /> {editing ? 'Edit Subject' : 'Add New Subject'}
                        </h3>
                        <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Subject Code</label>
                                <input className="form-input" value={form.subjectCode} onChange={e => setForm({ ...form, subjectCode: e.target.value })} placeholder="e.g. CS401" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject Name</label>
                                <input className="form-input" value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })} placeholder="e.g. Machine Learning" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label"><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />Department</label>
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
                            <div className="form-group">
                                <label className="form-label">Section</label>
                                <input className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="A" maxLength={2} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={form.subjectType} onChange={e => setForm({ ...form, subjectType: e.target.value })}>
                                    <option value="theory">Theory</option>
                                    <option value="lab">Lab</option>
                                    <option value="elective">Elective</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Hours/Week</label>
                                <input className="form-input" type="number" min={1} max={8} value={form.hoursPerWeek} onChange={e => setForm({ ...form, hoursPerWeek: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={save} style={{ gap: '0.5rem' }}><CheckCircle2 size={16} /> {editing ? 'Save Changes' : 'Add Subject'}</button>
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr><th>Code</th><th>Name</th><th>Department</th><th>Sem</th><th>Type</th><th>Hrs/Wk</th>{canEdit && <th>Actions</th>}</tr>
                        </thead>
                        <tbody>
                            {subjects.map(s => (
                                <tr key={s._id}>
                                    <td><span className="badge badge-primary">{s.subjectCode}</span></td>
                                    <td className="font-bold">{s.subjectName}</td>
                                    <td className="text-sm text-muted">{(s.departmentId as { name?: string })?.name}</td>
                                    <td>Sem {s.semester}</td>
                                    <td><span className={`badge badge-${s.subjectType === 'lab' ? 'warning' : s.subjectType === 'elective' ? 'info' : 'approved'}`}>{s.subjectType}</span></td>
                                    <td>{s.hoursPerWeek} hrs</td>
                                    {canEdit && (
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-icon btn-sm" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                                                <button className="btn btn-icon btn-sm btn-danger-ghost" onClick={() => remove(s._id)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {subjects.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                                        <BookOpen size={36} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                                        <p className="text-muted text-sm">No subjects yet. Add your first subject above.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
