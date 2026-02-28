'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GraduationCap, Mail, Lock, ArrowRight, User, Shield, BookOpen, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';

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
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Logo / Hero */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="text-center mb-10"
                >
                    <div style={{
                        width: 80, height: 80, borderRadius: '24px',
                        background: 'var(--accent-gradient)',
                        backgroundSize: '200% 200%',
                        animation: 'gradient-shift 4s ease infinite',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 0 0 1px var(--border-glass), var(--shadow)',
                    }}>
                        <GraduationCap size={40} color="white" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{
                        background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-2) 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        SmartCollege
                    </h1>
                    <p className="text-secondary mt-2 font-medium opacity-80" style={{ color: 'var(--text-secondary)' }}>
                        Academic Automation System
                    </p>
                </motion.div>

                {/* Login Form */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '2.5rem',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        boxShadow: 'var(--shadow)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <div className="flex items-center gap-2 mb-8">
                        <Sparkles size={16} color="var(--accent-2)" />
                        <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Sign In</h2>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="alert alert-error mb-6"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Shield size={15} />{error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="form-group">
                            <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-70" style={{ color: 'var(--text-primary)' }}>Email Address</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" 
                                    style={{ color: focused === 'email' ? 'var(--accent)' : 'var(--text-muted)' }} 
                                />
                                <input
                                    className="form-input w-full" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                    placeholder="your@college.edu" required
                                    style={{ paddingLeft: '2.75rem', height: '3.5rem' }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-70" style={{ color: 'var(--text-primary)' }}>Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: focused === 'password' ? 'var(--accent)' : 'var(--text-muted)' }}
                                />
                                <input
                                    className="form-input w-full" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    placeholder="••••••••" required
                                    style={{ paddingLeft: '2.75rem', height: '3.5rem' }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn btn-primary w-full mt-2" 
                            type="submit" disabled={loading}
                            style={{ 
                                justifyContent: 'center', gap: '0.75rem', height: '3.5rem', 
                                fontSize: '1rem', fontWeight: 700, borderRadius: '12px' 
                            }}
                        >
                            {loading
                                ? <><span className="spinner" style={{ width: '1.25rem', height: '1.25rem', border: '2px solid white', borderTopColor: 'transparent' }} /> Signing In...</>
                                : <>Sign In <ArrowRight size={18} /></>
                            }
                        </button>
                    </form>
                </motion.div>

                {/* Demo accounts */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 20,
                        padding: '1.5rem',
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'var(--shadow)',
                    }}
                >
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-4 opacity-60" style={{ color: 'var(--text-muted)' }}>
                        Quick access — demo accounts
                    </p>
                    <div className="flex flex-col gap-2.5">
                        {demoAccounts.map(({ role, Icon, label, subtitle, color }) => (
                            <motion.button
                                whileHover={{ x: 5, backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: color }}
                                key={role}
                                onClick={() => demoLogin(role)}
                                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all"
                                style={{
                                    fontFamily: 'var(--font)',
                                    background: 'var(--bg-glass)',
                                    border: '1px solid var(--border-glass)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                }}
                            >
                                <span className="flex items-center gap-3 text-sm font-bold">
                                    <span style={{ background: `${color}15`, border: `1px solid ${color}30`, width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                                        <Icon size={14} color={color} />
                                    </span>
                                    {label}
                                </span>
                                <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{subtitle}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            <style jsx global>{`
                @keyframes gradient-shift {
                    0% { background-position: 0% 50% }
                    50% { background-position: 100% 50% }
                    100% { background-position: 0% 50% }
                }
            `}</style>
        </div>
    );
}
