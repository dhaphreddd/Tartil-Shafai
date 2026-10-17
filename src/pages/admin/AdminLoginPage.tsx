import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin/packages', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Wait for auth context to update and redirect naturally or manually navigate
      navigate('/admin/packages');
    } catch (err: any) {
      console.error("Login error:", err);
      setError('Email atau password salah, atau Anda tidak memiliki akses.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-[320px]">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-wider mb-6 transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Kembali ke Beranda
          </Link>
          <div className="flex items-center gap-3.5 mb-4">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Logo Jalsah Qur'aniyyah Shafa'i"
              className="w-12 h-12 object-contain drop-shadow-sm"
              width="48"
              height="48"
            />
            <div>
              <h1 
                className="text-[20px] font-semibold tracking-tight leading-tight"
                style={{ color: 'var(--color-text)' }}
              >
                Akses Admin
              </h1>
              <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Tartil Shafa'i
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 text-[13px]" style={{ color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full py-2 bg-transparent text-[15px] outline-none transition-colors border-b"
              style={{ 
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sandi"
              className="w-full py-2 bg-transparent text-[15px] outline-none transition-colors border-b"
              style={{ 
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-[13px] tracking-widest uppercase transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-text)',
                color: 'var(--color-bg)'
              }}
            >
              {loading ? 'Memproses' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
