'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Users, Plus, Pencil, Trash2, Mail, Phone,
    Building2, BookOpen, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

interface Faculty { _id: string; facultyId: string; name: string; email: string; phone?: string; designation: string; departmentId?: { _id?: string; name?: string }; maxWeeklyLoad: number; currentLoad: number; isActive: boolean; }
interface Department { _id: string; name: string; }

export default function FacultyPage() {
    const { user } = useAuth();
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Faculty | null>(null);
    const [form, setForm] = useState({ facultyId: '', name: '', email: '', phone: '', designation: 'Assistant Professor', departmentId: '', maxWeeklyLoad: '18' });
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [f, d] = await Promise.all([
            apiFetch('/api/faculty').then(r => r.json()),
            apiFetch('/api/departments').then(r => r.json()),
        ]);
        setFaculty(f.faculty || []);
        setDepartments(d.departments || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditing(null);
        setForm({ facultyId: '', name: '', email: '', phone: '', designation: 'Assistant Professor', departmentId: departments[0]?._id || '', maxWeeklyLoad: '18' });
        setShowForm(true);
    };

    const openEdit = (f: Faculty) => {
        setEditing(f);
        setForm({ facultyId: f.facultyId, name: f.name, email: f.email, phone: f.phone || '', designation: f.designation, departmentId: (f.departmentId as { _id?: string })?._id || '', maxWeeklyLoad: String(f.maxWeeklyLoad) });
        setShowForm(true);
    };

    const save = async () => {
        setMsg('');
        const payload = { ...form, maxWeeklyLoad: parseInt(form.maxWeeklyLoad) };
        const r = editing
            ? await apiFetch('/api/faculty', { method: 'PUT', body: JSON.stringify({ id: editing._id, ...payload }) })
            : await apiFetch('/api/faculty', { method: 'POST', body: JSON.stringify(payload) });
        const d = await r.json();
        if (d.faculty) { setMsg('success'); setShowForm(false); await load(); }
        else setMsg('error:' + d.error);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this faculty member?')) return;
        await apiFetch('/api/faculty', { method: 'DELETE', body: JSON.stringify({ id }) });
        await load();
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const canEdit = ['hod', 'principal'].includes(user?.role || '');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Faculty</h1>
                    <p className="page-subtitle">{faculty.length} faculty members</p>
                </div>
                {canEdit && (
                    <button className="btn btn-primary" onClick={openAdd} style={{ gap: '0.5rem' }}>
                        <Plus size={16} /> Add Faculty
                    </button>
                )}
            </div>

            {msg === 'success' && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><CheckCircle2 size={16} /> Faculty saved successfully!</div>}
            {msg.startsWith('error:') && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertTriangle size={16} />{msg.replace('error:', '')}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="var(--accent)" /> {editing ? 'Edit Faculty' : 'Add New Faculty'}
                        </h3>
                        <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Faculty ID</label>
                                <input className="form-input" value={form.facultyId} onChange={e => setForm({ ...form, facultyId: e.target.value })} placeholder="e.g. FAC007" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label"><Mail size={14} style={{ display: 'inline', marginRight: 4 }} />Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@college.edu" />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><Phone size={14} style={{ display: 'inline', marginRight: 4 }} />Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <select className="form-select" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                                    {['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label"><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />Department</label>
                                <select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Weekly Load (hrs)</label>
                                <input className="form-input" type="number" min={4} max={30} value={form.maxWeeklyLoad} onChange={e => setForm({ ...form, maxWeeklyLoad: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={save} style={{ gap: '0.5rem' }}><CheckCircle2 size={16} /> {editing ? 'Save Changes' : 'Add Faculty'}</button>
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-grid">
                {faculty.map(f => (
                    <div key={f._id} className="card" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                                }}>
                                    {f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold">{f.name}</div>
                                    <div className="text-xs text-muted">{f.designation}</div>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex gap-1">
                                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(f)} title="Edit"><Pencil size={14} /></button>
                                    <button className="btn btn-icon btn-sm btn-danger-ghost" onClick={() => remove(f._id)} title="Delete"><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                            <div className="flex items-center gap-2 text-muted"><Mail size={13} />{f.email}</div>
                            <div className="flex items-center gap-2 text-muted"><Building2 size={13} />{(f.departmentId as { name?: string })?.name || 'N/A'}</div>
                            <div className="flex items-center gap-2 text-muted"><BookOpen size={13} />{f.currentLoad}/{f.maxWeeklyLoad} hrs/week</div>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min(100, (f.currentLoad / f.maxWeeklyLoad) * 100)}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
                {faculty.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                        <Users size={48} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <h3>No Faculty Members</h3>
                        <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>Add your first faculty member using the button above.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
