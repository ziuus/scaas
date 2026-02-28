'use client';
import { useState, useRef } from 'react';
import { useAuth, apiFetch } from '@/lib/auth-context';
import Papa from 'papaparse';

type RecordRow = Record<string, string>;

export default function ImportPage() {
    const { user } = useAuth();
    const [type, setType] = useState<'faculty' | 'subjects'>('faculty');
    const [records, setRecords] = useState<RecordRow[]>([]);
    const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
    const [msg, setMsg] = useState('');
    const [importing, setImporting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMsg(''); setErrors([]);
        if (file.name.endsWith('.json')) {
            file.text().then(txt => { try { setRecords(JSON.parse(txt)); } catch { setMsg('❌ Invalid JSON file'); } });
        } else {
            Papa.parse<RecordRow>(file, {
                header: true, skipEmptyLines: true,
                complete: result => setRecords(result.data),
                error: () => setMsg('❌ Could not parse CSV'),
            });
        }
    };

    const doImport = async () => {
        setImporting(true); setMsg(''); setErrors([]);
        const r = await apiFetch('/api/import', { method: 'POST', body: JSON.stringify({ type, records }) });
        const d = await r.json();
        if (d.success) {
            setMsg(`✅ Imported ${d.inserted} records out of ${d.total}!`);
            setErrors(d.errors || []);
        } else setMsg('❌ ' + d.error);
        setImporting(false);
    };

    const sampleFaculty = `faculty_id,faculty_name,email,department,designation,max_weekly_load
FAC001,Dr. Alice Kumar,alice@college.edu,DEPT_ID,Associate Professor,16
FAC002,Prof. Bob Singh,bob@college.edu,DEPT_ID,Assistant Professor,18`;

    const sampleSubject = `subject_code,subject_name,department,semester,section,subject_type,hours_per_week
CS301,Data Structures,DEPT_ID,3,A,theory,4
CS302,Database Management,DEPT_ID,3,A,theory,3`;

    if (!['hod', 'principal'].includes(user?.role || '')) {
        return <div className="page-header"><div><h1 className="page-title">Access Denied</h1><p className="text-muted">Only HOD and Principal can import data.</p></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Bulk Import</h1>
                    <p className="page-subtitle">Upload CSV or JSON files to import faculty or subject data</p>
                </div>
            </div>

            {/* Type selector */}
            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                <button className={`tab ${type === 'faculty' ? 'active' : ''}`} onClick={() => { setType('faculty'); setRecords([]); }}>👩‍🏫 Faculty Data</button>
                <button className={`tab ${type === 'subjects' ? 'active' : ''}`} onClick={() => { setType('subjects'); setRecords([]); }}>📚 Subject Data</button>
            </div>

            {/* Sample format */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>📋 Sample CSV Format</h3>
                <pre style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
                    {type === 'faculty' ? sampleFaculty : sampleSubject}
                </pre>
            </div>

            {/* Upload zone */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ marginBottom: '1rem' }}>📥 Upload File</h3>
                <div
                    style={{
                        border: '2px dashed var(--border-accent)', borderRadius: 'var(--radius)', padding: '3rem',
                        textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)',
                    }}
                    onClick={() => fileRef.current?.click()}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
                    <p className="font-bold">Click to select CSV or JSON file</p>
                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Supports: .csv, .json</p>
                    <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleFile} />
                </div>
                {records.length > 0 && (
                    <p className="text-sm text-success" style={{ marginTop: '0.75rem' }}>
                        ✅ {records.length} records loaded. Review below before importing.
                    </p>
                )}
            </div>

            {/* Preview table */}
            {records.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <h3 className="section-title">Data Preview ({records.length} rows)</h3>
                        <button className="btn btn-primary" onClick={doImport} disabled={importing}>
                            {importing ? '⏳ Importing...' : '📤 Confirm Import'}
                        </button>
                    </div>
                    {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{msg}</div>}
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    {Object.keys(records[0] || {}).map(k => <th key={k}>{k}</th>)}
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.slice(0, 20).map((row, i) => {
                                    const err = errors.find(e => e.row === i + 1);
                                    return (
                                        <tr key={i}>
                                            {Object.values(row).map((v, j) => <td key={j} className="text-sm">{String(v)}</td>)}
                                            <td>{err ? <span className="badge badge-rejected" title={err.error}>❌ Error</span> : <span className="badge badge-approved">✅ OK</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {records.length > 20 && <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Showing first 20 of {records.length} rows.</p>}
                    {errors.length > 0 && (
                        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                            <div>
                                <strong>Row Errors ({errors.length}):</strong>
                                {errors.map(e => <div key={e.row} className="text-sm">Row {e.row}: {e.error}</div>)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
