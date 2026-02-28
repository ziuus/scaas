'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    Umbrella, Plus, Trash2, Clock, CalendarDays,
    CalendarRange, MessageSquare, CheckCircle2, AlertTriangle,
    Users, Sun, X, UserCheck, Info, Layers,
} from 'lucide-react';

interface AffectedSlot {
    day: string;
    startTime: string;
    endTime: string;
    substituteName?: string;
}

interface Leave {
    _id: string;
    facultyId?: { _id?: string; name?: string; email?: string };
    substituteId?: { name?: string; email?: string };
    leaveType: 'full_day' | 'partial';
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    reason: string;
    status: string;
    affectedSlots?: AffectedSlot[];
}

export default function LeavePage() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [leaveType, setLeaveType] = useState<'full_day' | 'partial'>('full_day');
    const [form, setForm] = useState({ startDate: '', endDate: '', startTime: '09:00', endTime: '12:00', reason: '' });
    const [msg, setMsg] = useState('');
    const [autoSub, setAutoSub] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const r = await apiFetch('/api/leave');
        const d = await r.json();
        setLeaves(d.leaves || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const submit = async () => {
        if (!form.startDate) { setMsg('error:Please select a date.'); return; }
        if (!form.reason.trim()) { setMsg('error:Please provide a reason.'); return; }
        if (leaveType === 'partial' && (!form.startTime || !form.endTime)) {
            setMsg('error:Please specify start and end time.'); return;
        }
        setSubmitting(true); setMsg(''); setAutoSub('');
        const payload = {
            leaveType,
            startDate: form.startDate,
            endDate: leaveType === 'full_day' ? (form.endDate || form.startDate) : form.startDate,
            startTime: leaveType === 'partial' ? form.startTime : undefined,
            endTime: leaveType === 'partial' ? form.endTime : undefined,
            reason: form.reason,
        };
        const r = await apiFetch('/api/leave', { method: 'POST', body: JSON.stringify(payload) });
        const d = await r.json();
        if (d.leave) {
            setMsg('success');
            setAutoSub(d.autoSubstitute || '');
            setShowForm(false);
            setForm({ startDate: '', endDate: '', startTime: '09:00', endTime: '12:00', reason: '' });
            await load();
        } else {
            setMsg('error:' + (d.error || 'Failed to submit leave'));
        }
        setSubmitting(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Cancel this leave?')) return;
        await apiFetch('/api/leave', { method: 'DELETE', body: JSON.stringify({ id }) });
        setMsg(''); setAutoSub('');
        await load();
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    const isHOD = ['hod', 'principal'].includes(user?.role || '');
    const isFaculty = user?.role === 'faculty';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {isFaculty ? 'My Leave' : 'Department Leaves'}
                    </h1>
                    <p className="page-subtitle">
                        {isFaculty
                            ? 'Apply for full-day or partial leave — substitutes are auto-assigned'
                            : 'All faculty leave records with auto-assigned substitutes'
                        }
                    </p>
                </div>
                {isFaculty && (
                    <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setMsg(''); setAutoSub(''); }}>
                        {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Apply Leave</>}
                    </button>
                )}
            </div>

            {/* Alerts */}
            {msg === 'success' && (
                <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700 }}>Leave applied successfully!</div>
                        {autoSub && <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', opacity: 0.85 }}>{autoSub}</div>}
                    </div>
                </div>
            )}
            {msg.startsWith('error:') && (
                <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} /> {msg.replace('error:', '')}
                </div>
            )}

            {/* HOD info banner */}
            {isHOD && (
                <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Info size={16} />
                    Substitutes are auto-assigned by the system. You can view who is covering each class below.
                </div>
            )}

            {/* Faculty Apply Form */}
            {showForm && isFaculty && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Umbrella size={18} color="var(--accent)" /> Apply for Leave
                    </h3>

                    <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                        <button className={`tab ${leaveType === 'full_day' ? 'active' : ''}`} onClick={() => setLeaveType('full_day')}>
                            <Sun size={15} /> Full Day
                        </button>
                        <button className={`tab ${leaveType === 'partial' ? 'active' : ''}`} onClick={() => setLeaveType('partial')}>
                            <Clock size={15} /> Specific Hours
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {leaveType === 'full_day' ? (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label"><CalendarDays size={13} style={{ display: 'inline', marginRight: 4 }} />Start Date</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><CalendarRange size={13} style={{ display: 'inline', marginRight: 4 }} />End Date <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                                    <input className="form-input" type="date" value={form.endDate} min={form.startDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label"><CalendarDays size={13} style={{ display: 'inline', marginRight: 4 }} />Date</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ maxWidth: 280 }} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label"><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />From</label>
                                        <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label"><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />To</label>
                                        <input className="form-input" type="time" value={form.endTime} min={form.startTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label"><MessageSquare size={13} style={{ display: 'inline', marginRight: 4 }} />Reason</label>
                            <textarea className="form-textarea" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." />
                        </div>

                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                                {submitting
                                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Applying...</>
                                    : <><CheckCircle2 size={16} /> Apply Leave</>}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave List */}
            <div className="card">
                <div className="section-header">
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} color="var(--accent)" />
                        {isFaculty ? 'My Applied Leaves' : 'All Faculty Leaves'}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--accent-light)', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid var(--border-accent)' }}>
                        {leaves.length} records
                    </span>
                </div>

                {leaves.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <Umbrella size={44} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>No Leaves Yet</h3>
                        <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                            {isFaculty ? 'Click "Apply Leave" to submit a leave.' : 'No leave records in your department.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1rem' }}>
                        {leaves.map(l => {
                            const hasSubstitute = l.substituteId?.name || l.affectedSlots?.some(s => s.substituteName);
                            const substituteName = l.substituteId?.name || l.affectedSlots?.find(s => s.substituteName)?.substituteName;

                            return (
                                <div key={l._id} style={{
                                    padding: '1.1rem 1.25rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid var(--border-glass)',
                                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                                    backdropFilter: 'blur(8px)',
                                    transition: 'var(--transition)',
                                }}>
                                    {/* Type icon */}
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                        background: l.leaveType === 'partial' ? 'rgba(96,165,250,0.12)' : 'rgba(129,140,248,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `1px solid ${l.leaveType === 'partial' ? 'rgba(96,165,250,0.25)' : 'rgba(129,140,248,0.25)'}`,
                                    }}>
                                        {l.leaveType === 'partial' ? <Clock size={18} color="var(--info)" /> : <Sun size={18} color="var(--accent)" />}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Faculty name for HOD view */}
                                        {!isFaculty && (
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={13} color="var(--text-muted)" />
                                                {l.facultyId?.name || 'Unknown'}
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{l.facultyId?.email}</span>
                                            </div>
                                        )}

                                        {/* Date / time */}
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem', alignItems: 'center' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                <CalendarDays size={13} />
                                                {fmtDate(l.startDate)}
                                                {l.endDate && l.endDate !== l.startDate && <> — {fmtDate(l.endDate)}</>}
                                            </span>
                                            {l.leaveType === 'partial' && l.startTime && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    <Clock size={13} /> {l.startTime} – {l.endTime}
                                                </span>
                                            )}
                                            <span style={{
                                                padding: '0.15rem 0.6rem', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                                                background: l.leaveType === 'partial' ? 'rgba(96,165,250,0.12)' : 'rgba(129,140,248,0.12)',
                                                color: l.leaveType === 'partial' ? 'var(--info)' : 'var(--accent)',
                                                border: `1px solid ${l.leaveType === 'partial' ? 'rgba(96,165,250,0.25)' : 'rgba(129,140,248,0.25)'}`,
                                            }}>
                                                {l.leaveType === 'full_day' ? 'Full Day' : 'Partial'}
                                            </span>
                                            {l.affectedSlots && l.affectedSlots.length > 0 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Layers size={12} /> {l.affectedSlots.length} slot{l.affectedSlots.length !== 1 ? 's' : ''} affected
                                                </span>
                                            )}
                                        </div>

                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.5rem' }}>{l.reason}</p>

                                        {/* Substitute info */}
                                        {hasSubstitute ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.7rem', borderRadius: 99, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', fontSize: '0.78rem', color: 'var(--success)' }}>
                                                <UserCheck size={13} /> {substituteName} assigned as substitute
                                            </div>
                                        ) : l.affectedSlots && l.affectedSlots.length > 0 ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.7rem', borderRadius: 99, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', fontSize: '0.78rem', color: 'var(--warning)' }}>
                                                <AlertTriangle size={13} /> No substitute available — HOD to manage
                                            </div>
                                        ) : (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.7rem', borderRadius: 99, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', fontSize: '0.78rem', color: 'var(--info)' }}>
                                                <Info size={13} /> No classes scheduled during this leave
                                            </div>
                                        )}
                                    </div>

                                    {/* Cancel button — faculty only */}
                                    {isFaculty && (
                                        <button
                                            className="btn btn-icon btn-sm btn-danger"
                                            onClick={() => remove(l._id)}
                                            title="Cancel this leave"
                                            style={{ flexShrink: 0, opacity: 0.75 }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
