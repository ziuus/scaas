'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GraduationCap, Mail, Lock, ArrowRight, User, Shield, BookOpen, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<'email' | 'password' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const demoLogin = (role: string) => {
        const creds: Record<string, { email: string; password: string }> = {
            principal: { email: 'principal@college.edu', password: 'demo123' },
            hod: { email: 'hod.cs@college.edu', password: 'demo123' },
            faculty: { email: 'faculty1@college.edu', password: 'demo123' },
        };
        setEmail(creds[role].email);
        setPassword(creds[role].password);
    };

    const demoAccounts = [
        { role: 'principal', Icon: Shield, label: 'Principal', subtitle: 'Full system access', color: '#f472b6' },
        { role: 'hod', Icon: BookOpen, label: 'HOD', subtitle: 'Department admin', color: '#a78bfa' },
        { role: 'faculty', Icon: User, label: 'Faculty', subtitle: 'Timetable & leave', color: '#60a5fa' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative',
        }}>
            {/* Decorative floating orbs */}
            <div style={{
                position: 'fixed', top: '10%', left: '15%', width: 400, height: 400,
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none', animation: 'float1 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'fixed', bottom: '15%', right: '10%', width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none', animation: 'float2 10s ease-in-out infinite',
            }} />
            <div style={{
                position: 'fixed', top: '55%', right: '20%', width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none', animation: 'float3 6s ease-in-out infinite',
            }} />

            <style>{`
                @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
                @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
                @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,15px)} }
                @keyframes logoSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes gradient-shift {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
                {/* Logo / Hero */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '24px',
                        background: 'linear-gradient(135deg, #6366f1, #a78bfa, #f472b6)',
                        backgroundSize: '200% 200%',
                        animation: 'gradient-shift 4s ease infinite',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 0 0 1px rgba(129,140,248,0.3), 0 20px 60px rgba(99,102,241,0.4)',
                    }}>
                        <GraduationCap size={40} color="white" strokeWidth={1.5} />
                    </div>
                    <h1 style={{
                        fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
                        background: 'linear-gradient(135deg, #f0f0ff 0%, #a78bfa 50%, #f472b6 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        SmartCollege
                    </h1>
                    <p style={{ color: 'rgba(160,160,200,0.7)', marginTop: '0.4rem', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
                        Academic Automation System
                    </p>
                </div>

                {/* Login Form */}
                <div style={{
                    background: 'rgba(16, 14, 40, 0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24,
                    padding: '2rem',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                    marginBottom: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
                        <Sparkles size={16} color="#a78bfa" />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f0ff' }}>Sign In</h2>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={15} />{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#818cf8' : 'rgba(100,100,160,0.6)', transition: 'color 0.2s' }} />
                                <input
                                    className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                    placeholder="your@college.edu" required
                                    style={{ paddingLeft: 38 }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#818cf8' : 'rgba(100,100,160,0.6)', transition: 'color 0.2s' }} />
                                <input
                                    className="form-input" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    placeholder="••••••••" required
                                    style={{ paddingLeft: 38 }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn btn-primary btn-lg" type="submit" disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', gap: '0.625rem', marginTop: '0.5rem', borderRadius: 12, fontSize: '1rem' }}
                        >
                            {loading
                                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing In...</>
                                : <>Sign In <ArrowRight size={18} /></>
                            }
                        </button>
                    </form>
                </div>

                {/* Demo accounts */}
                <div style={{
                    background: 'rgba(16,14,40,0.6)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    padding: '1.25rem 1.5rem',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(100,100,160,0.8)', marginBottom: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Quick access — demo accounts
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {demoAccounts.map(({ role, Icon, label, subtitle, color }) => (
                            <button
                                key={role}
                                onClick={() => demoLogin(role)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.7rem 0.875rem', background: `rgba(${color === '#f472b6' ? '244,114,182' : color === '#a78bfa' ? '167,139,250' : '96,165,250'},0.06)`,
                                    border: `1px solid ${color}26`,
                                    borderRadius: 10, cursor: 'pointer',
                                    fontFamily: 'var(--font)', transition: 'all 0.2s ease',
                                    color: '#f0f0ff',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = `${color}12`;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${color}55`;
                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = `${color}0A`;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${color}26`;
                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: `${color}18`, borderRadius: 7 }}>
                                        <Icon size={14} color={color} />
                                    </span>
                                    {label}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'rgba(160,160,200,0.6)' }}>{subtitle}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
