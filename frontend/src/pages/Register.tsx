import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/register', { email, password });
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-surface-secondary dark:bg-inverse-surface">
      <div className="flex flex-col lg:flex-row w-full max-w-6xl h-[600px] bg-surface dark:bg-surface-variant rounded-xl shadow-lg border border-border dark:border-outline-variant overflow-hidden">
        
        {/* Left Side: Branding / Marketing */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-primary-container dark:bg-primary/10 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary dark:text-primary-fixed-dim mb-2 tracking-tight">Enterprise Scheduler</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">The definitive orchestration platform for modern cloud workloads.</p>
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary mt-1">analytics</span>
              <div>
                <h3 className="font-label-md text-label-md font-semibold text-on-surface">Global Visibility</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Monitor millions of jobs across regions with millisecond latency.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary mt-1">security</span>
              <div>
                <h3 className="font-label-md text-label-md font-semibold text-on-surface">Zero-Trust Architecture</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Enterprise-grade RBAC and audit logging built in.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <div className="text-center">
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Create an Account</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Sign up to get started.</p>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
                <span className="font-body-md text-body-md text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 font-body-md text-body-md text-on-surface transition-colors"
                  placeholder="admin@corp.com"
                  required
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 font-body-md text-body-md text-on-surface transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg px-4 py-2.5 hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            <div className="text-center font-body-md text-body-md">
              <span className="text-on-surface-variant">Already have an account? </span>
              <Link to="/login" className="text-primary hover:text-primary-fixed-dim font-medium transition-colors">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
