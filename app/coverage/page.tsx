'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import {
    BookOpen, CheckCircle2, AlertTriangle, BarChart3,
    ChevronDown, ChevronRight, Pencil, X, Layers, Upload,
    Clock, Trash2, GraduationCap, TrendingDown, Zap, Info, FileText, Eye,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Topic { topicName: string; estimatedHours: number; unit?: string; }

interface SyllabusDoc {
    _id: string;
    subjectId?: { _id?: string; subjectName?: string; subjectCode?: string };
    semester: number; section: string;
    topics: (Topic & { topicNumber: number })[];
    totalEstimatedHours: number;
    uploadedBy?: { name?: string };
    updatedAt?: string;
}

interface CoverageRecord {
    _id: string;
    facultyId?: { name?: string; email?: string };
    subjectId?: { _id?: string; subjectName?: string; subjectCode?: string; hoursPerWeek?: number };
    syllabusId?: { topics?: Topic[]; totalEstimatedHours?: number };
    coveragePercent: number;
    coveredTopics: number;
    totalTopics: number;
    coveredHours: number;
    remainingHours: number;
    totalEstimatedHours: number;
    predictedHoursToFinish: number;
    lastTaughtTopicName?: string;
    lastTaughtTopicIndex: number;
    semester: number; section: string; notes?: string;
}

// ── Priority label ──────────────────────────────────────────────────────────
const priorityStyle = (pct: number) => {
    if (pct < 25) return { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    if (pct < 50) return { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' };
    if (pct < 75) return { label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' };
    return { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' };
};

export default function CoveragePage() {
    const { user } = useAuth();
    const isHOD = ['hod', 'principal'].includes(user?.role || '');
    const isFaculty = user?.role === 'faculty';

    // ── Shared State ──────────────────────────────────────────────────────────
    const [records, setRecords] = useState<CoverageRecord[]>([]);
    const [syllabi, setSyllabi] = useState<SyllabusDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [filterSem, setFilterSem] = useState('4');
    const [filterSec, setFilterSec] = useState('CS(AI)');

    // ── HOD: Syllabus file upload state ──────────────────────────────────────
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({ subjectId: '', semester: '4', section: 'CS(AI)', academicYear: '2024-25', totalHours: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<{ extracted: number; preview: string[] } | null>(null);
    const [expandedSyllabus, setExpandedSyllabus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Faculty: Progress update state ───────────────────────────────────────
    const [showProgress, setShowProgress] = useState(false);
    const [progressForm, setProgressForm] = useState({ subjectId: '', semester: '4', section: 'CS(AI)', lastTaughtTopic: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [facSyllabi, setFacSyllabi] = useState<SyllabusDoc[]>([]);
    const [matchMsg, setMatchMsg] = useState('');

    // ── Load data ──────────────────────────────────────────────────────────────
    const loadRecords = useCallback(async () => {
        const params = isHOD ? `?semester=${filterSem}&section=${filterSec}` : '';
        const r = await apiFetch(`/api/coverage${params}`);
        const d = await r.json();
        setRecords(d.records || []);
    }, [isHOD, filterSem, filterSec]);

    const loadSyllabi = useCallback(async () => {
        const params = isHOD ? `?semester=${filterSem}&section=${filterSec}` : '';
        const r = await apiFetch(`/api/syllabus${params}`);
        const d = await r.json();
        if (isHOD) setSyllabi(d.syllabi || []);
        else setFacSyllabi(d.syllabi || []);
    }, [isHOD, filterSem, filterSec]);

    const load = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadRecords(), loadSyllabi()]);
        setLoading(false);
    }, [loadRecords, loadSyllabi]);

    useEffect(() => { load(); }, [load]);

    // ── HOD: Upload syllabus file ─────────────────────────────────────────────
    const uploadSyllabus = async () => {
        if (!uploadForm.subjectId) { setMsg('error:Please enter a Subject ID'); return; }
        if (!selectedFile) { setMsg('error:Please select a PDF, DOCX, or TXT file'); return; }
        setUploading(true); setMsg(''); setUploadPreview(null);
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('subjectId', uploadForm.subjectId);
        fd.append('semester', uploadForm.semester);
        fd.append('section', uploadForm.section);
        fd.append('academicYear', uploadForm.academicYear);
        fd.append('totalHours', uploadForm.totalHours || '0');
        // Use raw fetch for FormData (apiFetch adds Content-Type: application/json)
        const token = localStorage.getItem('token') || '';
        const r = await fetch('/api/syllabus/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd,
        });
        const d = await r.json();
        if (d.syllabus) {
            setMsg('success:Syllabus parsed & saved!');
            setUploadPreview({ extracted: d.extracted, preview: d.preview || [] });
            setShowUpload(false);
            setSelectedFile(null);
            await load();
        } else {
            setMsg('error:' + (d.error || 'Upload failed'));
        }
        setUploading(false);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) setSelectedFile(f);
    };

    const deleteSyllabus = async (id: string) => {
        if (!confirm('Delete this syllabus?')) return;
        await apiFetch('/api/syllabus', { method: 'DELETE', body: JSON.stringify({ id }) });
        await load();
    };

    // ── Faculty: Submit progress ──────────────────────────────────────────────
    const submitProgress = async () => {
        if (!progressForm.subjectId) { setMsg('error:Select a subject'); return; }
        if (!progressForm.lastTaughtTopic) { setMsg('error:Enter the last topic taught'); return; }
        setSubmitting(true); setMsg(''); setMatchMsg('');
        const r = await apiFetch('/api/coverage', {
            method: 'POST',
            body: JSON.stringify({
                subjectId: progressForm.subjectId,
                semester: parseInt(progressForm.semester),
                section: progressForm.section,
                lastTaughtTopic: progressForm.lastTaughtTopic,
                notes: progressForm.notes,
            }),
        });
        const d = await r.json();
        if (d.record) {
            setMsg('success:Progress updated!');
            setMatchMsg(d.matched || '');
            setShowProgress(false);
            await loadRecords();
        } else {
            setMsg('error:' + (d.error || 'Failed'));
        }
        setSubmitting(false);
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    // ── Selected syllabus for faculty progress form ───────────────────────────
    const selectedSyllabus = facSyllabi.find(s =>
        s.subjectId?._id === progressForm.subjectId &&
        s.semester === parseInt(progressForm.semester) &&
        s.section === progressForm.section
    );

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isHOD ? 'Syllabus & Coverage' : 'My Syllabus Progress'}</h1>
                    <p className="page-subtitle">
                        {isHOD
                            ? 'Upload syllabi → faculty update progress → auto hour-prediction drives priority scheduling'
                            : 'Select up to which topic you have taught — backend auto-computes progress & predicts remaining hours'
                        }
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {isHOD && (
                        <button className="btn btn-primary" onClick={() => setShowUpload(v => !v)} style={{ gap: '0.5rem' }}>
                            {showUpload ? <><X size={16} />Cancel</> : <><Upload size={16} />Upload Syllabus</>}
                        </button>
                    )}
                    {isFaculty && (
                        <button className="btn btn-primary" onClick={() => setShowProgress(v => !v)} style={{ gap: '0.5rem' }}>
                            {showProgress ? <><X size={16} />Cancel</> : <><Pencil size={16} />Update My Progress</>}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Alerts ── */}
            {msg.startsWith('success:') && (
                <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                        <div>{msg.replace('success:', '')}</div>
                        {matchMsg && <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.2rem' }}>{matchMsg}</div>}
                    </div>
                </div>
            )}
            {msg.startsWith('error:') && (
                <div className="alert alert-error" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} />{msg.replace('error:', '')}
                </div>
            )}

            {/* ── HOD Filter ── */}
            {isHOD && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
                            <label className="form-label">Semester</label>
                            <select className="form-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                            <label className="form-label">Section</label>
                            <input className="form-input" value={filterSec} onChange={e => setFilterSec(e.target.value)} placeholder="CS(AI)" />
                        </div>
                        <button className="btn btn-primary" onClick={load} style={{ gap: '0.5rem' }}>
                            <BarChart3 size={16} />View
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════ HOD: Syllabus File Upload Form ════════════════ */}
            {showUpload && isHOD && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={18} color="var(--accent)" /> Upload Syllabus File
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
                        Upload a PDF, DOCX, or TXT file — the backend will automatically extract all topics, detect units/modules, estimate hours, and populate the syllabus.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Class info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select className="form-select" value={uploadForm.semester} onChange={e => setUploadForm({ ...uploadForm, semester: e.target.value })}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Section</label>
                                <input className="form-input" value={uploadForm.section} onChange={e => setUploadForm({ ...uploadForm, section: e.target.value })} placeholder="CS(AI)" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Hours <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                                <input className="form-input" type="number" value={uploadForm.totalHours} onChange={e => setUploadForm({ ...uploadForm, totalHours: e.target.value })} placeholder="e.g. 45" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject ID</label>
                            <input className="form-input" value={uploadForm.subjectId} onChange={e => setUploadForm({ ...uploadForm, subjectId: e.target.value })} placeholder="Paste subject ID from the Subjects page" />
                        </div>

                        {/* Drag & drop file zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-glass)'}`,
                                borderRadius: 14,
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: dragOver ? 'rgba(129,140,248,0.06)' : 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                                style={{ display: 'none' }}
                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            {selectedFile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={36} color="var(--accent)" strokeWidth={1.5} />
                                    <div style={{ fontWeight: 700 }}>{selectedFile.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(selectedFile.size / 1024).toFixed(0)} KB · Click to change</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                    <Upload size={40} color="var(--text-muted)" strokeWidth={1} />
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Drag & drop your syllabus file here</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PDF, DOCX, TXT · Click to browse</div>
                                </div>
                            )}
                        </div>

                        <div className="alert alert-info" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem' }}>
                            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ fontSize: '0.8rem' }}>
                                The parser auto-detects numbered lists, bullet points, unit/module headers. If total hours are provided, they are distributed evenly across topics that don't have hours specified.
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={uploadSyllabus} disabled={uploading || !selectedFile} style={{ gap: '0.5rem' }}>
                                {uploading
                                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Parsing & Saving...</>
                                    : <><GraduationCap size={16} />Parse & Save Syllabus</>
                                }
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload success preview */}
            {uploadPreview && (
                <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ fontWeight: 700 }}>Extracted {uploadPreview.extracted} topics from the file!</div>
                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', opacity: 0.85 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}><Eye size={12} /> First topics detected:</span>
                            {uploadPreview.preview.map((t, i) => <div key={i} style={{ paddingLeft: '1rem', fontSize: '0.8rem' }}>• {t}</div>)}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ Faculty: Progress Update Form ════════════════ */}
            {showProgress && isFaculty && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} color="var(--accent)" /> Update Teaching Progress
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
                        Type the last topic you have taught — the system will auto-match it against the uploaded syllabus and compute your progress percentage and remaining hours.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select className="form-select" value={progressForm.semester} onChange={e => setProgressForm({ ...progressForm, semester: e.target.value })}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Section</label>
                                <input className="form-input" value={progressForm.section} onChange={e => setProgressForm({ ...progressForm, section: e.target.value })} placeholder="CS(AI)" />
                            </div>
                        </div>

                        {/* If there are uploaded syllabi, show dropdown for subject */}
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            {facSyllabi.length > 0 ? (
                                <select className="form-select" value={progressForm.subjectId} onChange={e => setProgressForm({ ...progressForm, subjectId: e.target.value })}>
                                    <option value="">-- Select subject --</option>
                                    {facSyllabi.map(s => (
                                        <option key={s._id} value={s.subjectId?._id || ''}>
                                            {s.subjectId?.subjectName} ({s.subjectId?.subjectCode})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input className="form-input" value={progressForm.subjectId} onChange={e => setProgressForm({ ...progressForm, subjectId: e.target.value })} placeholder="Paste subject ID" />
                            )}
                        </div>

                        {/* Topic picker — if syllabus loaded, show numbered dropdown */}
                        {selectedSyllabus ? (
                            <div className="form-group">
                                <label className="form-label">Last Topic Taught</label>
                                <select
                                    className="form-select"
                                    value={progressForm.lastTaughtTopic}
                                    onChange={e => setProgressForm({ ...progressForm, lastTaughtTopic: e.target.value })}
                                >
                                    <option value="">-- Select last completed topic --</option>
                                    {selectedSyllabus.topics.map((t, i) => (
                                        <option key={i} value={String(i + 1)}>
                                            {i + 1}. {t.topicName} ({t.estimatedHours}h) {t.unit ? `[${t.unit}]` : ''}
                                        </option>
                                    ))}
                                </select>
                                {progressForm.lastTaughtTopic && (() => {
                                    const idx = parseInt(progressForm.lastTaughtTopic) - 1;
                                    const covered = selectedSyllabus.topics.slice(0, idx + 1).reduce((s, t) => s + t.estimatedHours, 0);
                                    const remaining = selectedSyllabus.totalEstimatedHours - covered;
                                    const pct = Math.round((covered / selectedSyllabus.totalEstimatedHours) * 100);
                                    const ps = priorityStyle(pct);
                                    return (
                                        <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', background: ps.bg, border: `1px solid ${ps.border}`, borderRadius: 10, display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: ps.color }}>{pct}%</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Covered</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{covered.toFixed(1)}h</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Done</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: ps.color }}>{remaining.toFixed(1)}h</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ padding: '0.2rem 0.7rem', borderRadius: 99, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, fontSize: '0.75rem', fontWeight: 700 }}>{ps.label} Priority</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Last Topic Taught (free text)</label>
                                <input className="form-input" value={progressForm.lastTaughtTopic} onChange={e => setProgressForm({ ...progressForm, lastTaughtTopic: e.target.value })} placeholder="e.g. Sorting algorithms / Topic 5" />
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <Info size={12} /> No syllabus uploaded yet. HOD can upload one for precise hour predictions.
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <textarea className="form-textarea" rows={2} value={progressForm.notes} onChange={e => setProgressForm({ ...progressForm, notes: e.target.value })} placeholder="Any remarks..." />
                        </div>

                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={submitProgress} disabled={submitting} style={{ gap: '0.5rem' }}>
                                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Saving...</> : <><CheckCircle2 size={16} />Save Progress</>}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowProgress(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ HOD: Uploaded Syllabi ════════════════ */}
            {isHOD && syllabi.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GraduationCap size={16} color="var(--accent)" /> Uploaded Syllabi
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{syllabi.length} subjects</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                        {syllabi.map(s => (
                            <div key={s._id} style={{ border: '1px solid var(--border-glass)', borderRadius: 10, overflow: 'hidden' }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer', background: 'rgba(255,255,255,0.025)' }}
                                    onClick={() => setExpandedSyllabus(v => v === s._id ? null : s._id)}
                                >
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        {expandedSyllabus === s._id ? <ChevronDown size={14} color="var(--accent)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.subjectId?.subjectName} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({s.subjectId?.subjectCode})</span></div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem {s.semester} · {s.section} · {s.topics.length} topics · {s.totalEstimatedHours}h total</div>
                                        </div>
                                    </div>
                                    <button className="btn btn-icon btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteSyllabus(s._id); }} style={{ opacity: 0.7 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                {expandedSyllabus === s._id && (
                                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
                                        {s.topics.map((t, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0', borderBottom: i < s.topics.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.82rem' }}>
                                                <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 22 }}>{i + 1}.</span>
                                                <span style={{ flex: 1 }}>{t.topicName} {t.unit && <span style={{ color: 'var(--text-muted)' }}>[{t.unit}]</span>}</span>
                                                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{t.estimatedHours}h</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════ Coverage Records ════════════════ */}
            <div className="card">
                <div className="section-header">
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} color="var(--accent)" /> {isHOD ? 'Coverage by Faculty' : 'My Progress'}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--accent-light)', padding: '0.2rem 0.7rem', borderRadius: 99, border: '1px solid var(--border-accent)' }}>
                        {records.length} records
                    </span>
                </div>

                {records.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <BookOpen size={44} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>No Progress Data Yet</h3>
                        <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                            {isFaculty ? 'Click "Update My Progress" to report what you have taught.' : 'Faculty members need to update their progress first.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1rem' }}>
                        {records.map(rec => {
                            const ps = priorityStyle(rec.coveragePercent);
                            const hasSyllabus = rec.totalEstimatedHours > 0;
                            return (
                                <div key={rec._id} style={{
                                    padding: '1.1rem 1.25rem', borderRadius: 12,
                                    background: ps.bg, border: `1.5px solid ${ps.border}`,
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                        {/* Left: info */}
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700 }}>{rec.subjectId?.subjectName}</span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({rec.subjectId?.subjectCode})</span>
                                                <span style={{ padding: '0.15rem 0.6rem', borderRadius: 99, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {ps.label}
                                                </span>
                                            </div>
                                            {!isFaculty && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                                    {rec.facultyId?.name} · Sem {rec.semester} · {rec.section}
                                                </div>
                                            )}
                                            {rec.lastTaughtTopicName && (
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <BookOpen size={12} /> Last taught: <strong>{rec.lastTaughtTopicName}</strong>
                                                    {rec.totalTopics > 0 && <span style={{ color: 'var(--text-muted)' }}>(topic {rec.coveredTopics}/{rec.totalTopics})</span>}
                                                </div>
                                            )}
                                            {rec.notes && (
                                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{rec.notes}</p>
                                            )}
                                        </div>

                                        {/* Right: stats */}
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flexShrink: 0 }}>
                                            {/* Coverage */}
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: ps.color, lineHeight: 1 }}>{rec.coveragePercent}%</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Covered</div>
                                            </div>
                                            {hasSyllabus && (
                                                <>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{rec.coveredHours.toFixed(1)}h</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Done</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: ps.color, lineHeight: 1 }}>{rec.remainingHours.toFixed(1)}h</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Remaining</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ marginTop: '0.875rem' }}>
                                        <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${rec.coveragePercent}%`, background: `linear-gradient(90deg, ${ps.color}, ${ps.color}99)`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                                        </div>
                                        {hasSyllabus && rec.remainingHours > 0 && (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: ps.color }}>
                                                <TrendingDown size={13} />
                                                <strong>~{rec.predictedHoursToFinish.toFixed(1)} hours</strong> needed to complete syllabus
                                            </div>
                                        )}
                                        {rec.coveragePercent >= 100 && (
                                            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <CheckCircle2 size={13} /> Syllabus completed!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
