import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, ArrowRight, AlertCircle, Lock, User, FileBadge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [licenseId, setLicenseId] = useState('');
    const [error, setError] = useState('');

    const { login, signup, resetPassword, isLoading } = useAuth();
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            if (isSignUp) {
                if (!name || !licenseId) {
                    throw new Error('Please provide Name and Medical License ID.');
                }
                await signup(email, password, name, licenseId);
            } else if (isResetMode) {
                await resetPassword(email);
                setResetSent(true);
                setIsResetMode(false);
            } else {
                await login(email, password);
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            let msg = 'Authentication failed.';
            if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            else if (err.code === 'auth/email-already-in-use') msg = 'Email is already registered.';
            else if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
            else if (err.code === 'auth/operation-not-allowed') msg = 'Email/Password sign-in not enabled in Firebase Console.';
            else if (err.code === 'permission-denied') msg = 'Firestore permission denied. Check Rules.';
            else msg = err.message || msg;

            setError(msg);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
            {/* Background Aurora */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] bg-purple-500/20 rounded-full blur-[120px] mix-blend-screen animate-blob" />
                <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-2000" />
                <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            {/* Left Panel: Visuals (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center p-12 xl:p-24 relative z-10 text-white bg-black/5 backdrop-blur-[2px]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-8 border border-primary/5 p-3">
                        <img src="/logo.png" alt="O_Dtect Logo" className="w-full h-full object-contain" />
                    </div>

                    <h1 className="text-5xl font-bold font-heading leading-tight tracking-tight">
                        {isSignUp ? 'Join the Future' : 'Welcome Back'} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
                            {isSignUp ? 'of Diagnostics' : 'Clinical Excellence'}
                        </span>
                    </h1>

                    <p className="text-lg text-blue-100/90 leading-relaxed max-w-lg">
                        {isSignUp
                            ? 'Create your specialist account to access advanced AI-driven oral lesion analysis tools.'
                            : 'Securely access the world\'s most advanced oral lesion analysis engine. Designed for precision.'
                        }
                    </p>
                </motion.div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10 glass">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={isSignUp ? 'signup' : 'login'}
                    className="w-full max-w-md space-y-8 glass-card p-8 sm:p-12 shadow-2xl border-white/20 relative overflow-hidden"
                >
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold font-heading text-foreground">
                            {isSignUp ? 'Create Account' : 'Doctor Portal'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {isResetMode
                                ? 'Enter your email to reset password'
                                : isSignUp ? 'Register for clinical access' : 'Authenticate to access clinical tools'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence>
                            {resetSent && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm p-3 rounded-lg flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    Password reset email sent! Please check your inbox.
                                </motion.div>
                            )}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-4">
                            {!isResetMode && isSignUp && (
                                <motion.div
                                    key="signup-fields"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <div className="relative group">
                                            <Input
                                                id="name"
                                                placeholder="Dr. Jane Doe"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-10"
                                                required={isSignUp}
                                            />
                                            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="license">Medical License ID</Label>
                                        <div className="relative group">
                                            <Input
                                                id="license"
                                                placeholder="MED-XX-12345"
                                                value={licenseId}
                                                onChange={(e) => setLicenseId(e.target.value)}
                                                className="pl-10"
                                                required={isSignUp}
                                            />
                                            <FileBadge className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative group">
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="doctor@hospital.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                    />
                                    <Stethoscope className="w-4 h-4 text-muted-foreground absolute left-3 top-3 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>

                            {!isResetMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="********"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10"
                                        />
                                        <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    {!isSignUp && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => { setIsResetMode(true); setError(''); setResetSent(false); }}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {isResetMode ? 'Send Reset Link' : isSignUp ? 'Register Account' : 'Secure Login'}
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="text-center pt-4 border-t border-border/40 space-y-2">
                        {isResetMode ? (
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(false); setError(''); }}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Back to Login
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setError(''); setResetSent(false); }}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Register Here'}
                            </button>
                        )}
                    </div>

                </motion.div >
            </div >
        </div >
    );
}
