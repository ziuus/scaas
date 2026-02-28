'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import { Eye, Zap, CheckCircle2, AlertTriangle, Info, Building2, DoorOpen } from 'lucide-react';

interface Allocation { _id: string; examId?: { name?: string; examDate?: string }; roomId?: { roomNumber?: string }; departmentId?: { name?: string }; primaryInvigilatorId?: { name?: string; email?: string }; backupInvigilatorId?: { name?: string }; status: string; }

export default function InvigilatorPage() {
    const { user } = useAuth();
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [exams, setExams] = useState<{ _id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState('');
    const [allocating, setAllocating] = useState(false);
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [allocs, examRes] = await Promise.all([
            apiFetch('/api/invigilator').then(r => r.json()),
            apiFetch('/api/exams').then(r => r.json()),
        ]);
        setAllocations(allocs.allocations || []);
        setExams(examRes.exams || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const autoAllocate = async () => {
        if (!selectedExam) { setMsg('error:Please select an exam first'); return; }
        setAllocating(true); setMsg('');
        const r = await apiFetch('/api/invigilator', { method: 'POST', body: JSON.stringify({ examId: selectedExam }) });
        const d = await r.json();
        if (d.allocations) {
            setMsg(`Assigned ${d.allocations.length} invigilators!${d.unassigned?.length > 0 ? ` ${d.unassigned.length} rooms unassigned.` : ''}`);
            await load();
        } else setMsg('error:' + d.error);
        setAllocating(false);
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    const isHOD = ['hod', 'principal'].includes(user?.role || '');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invigilator Allocation</h1>
                    <p className="page-subtitle">Department-based automatic assignment with workload balancing</p>
                </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    <strong>Allocation Rule:</strong> Invigilators can only be assigned to rooms in their own department. Faculty are sorted by least invigilation count for fair distribution.
                </div>
            </div>

            {msg && !msg.startsWith('error:') && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><CheckCircle2 size={16} />{msg}</div>}
            {msg.startsWith('error:') && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertTriangle size={16} />{msg.replace('error:', '')}</div>}

            {isHOD && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} color="var(--accent)" /> Auto-Allocate Invigilators
                    </h3>
                    <div className="flex gap-3 items-center flex-wrap">
                        <select className="form-select" style={{ maxWidth: 320 }} value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            <option value="">Select Exam</option>
                            {exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={autoAllocate} disabled={allocating} style={{ gap: '0.5rem' }}>
                            {allocating ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Allocating...</> : <><Zap size={16} /> Auto Allocate</>}
                        </button>
                    </div>
                    <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
                        System filters faculty by department, checks availability, and assigns by least invigilation count.
                    </p>
                </div>
            )}

            <div className="card">
                <div className="section-header">
                    <h3 className="section-title">Current Allocations</h3>
                    <span className="badge badge-info">{allocations.length} total</span>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr><th>Exam</th><th><DoorOpen size={14} style={{ display: 'inline', marginRight: 4 }} />Room</th><th><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />Dept</th><th>Primary Invigilator</th><th>Backup</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {allocations.map(a => (
                                <tr key={a._id}>
                                    <td className="font-bold">{a.examId?.name || '—'}</td>
                                    <td>{a.roomId?.roomNumber || '—'}</td>
                                    <td><span className="badge badge-primary">{a.departmentId?.name || '—'}</span></td>
                                    <td>
                                        <div className="font-bold text-sm">{a.primaryInvigilatorId?.name || '—'}</div>
                                        <div className="text-xs text-muted">{a.primaryInvigilatorId?.email}</div>
                                    </td>
                                    <td className="text-sm text-muted">{a.backupInvigilatorId?.name || '—'}</td>
                                    <td><span className={`badge badge-${a.status === 'auto-assigned' ? 'info' : 'approved'}`}>{a.status}</span></td>
                                </tr>
                            ))}
                            {allocations.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                                        <Eye size={32} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                                        <p className="text-muted text-sm">No allocations yet. Use Auto Allocate above.</p>
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
