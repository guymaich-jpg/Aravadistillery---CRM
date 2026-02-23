import { useState } from 'react';
import { register } from '@/lib/auth/simpleAuth';
import { markInvitationUsed } from '@/lib/invitations';
import type { Invitation } from '@/types/invitation';
import { Loader2 } from 'lucide-react';

interface RegisterScreenProps {
  token: string;
  invitation: Invitation;
  onRegister: () => void;
}

export function RegisterScreen({ token, invitation, onRegister }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    setLoading(true);
    const result = await register(invitation.email, password, name);
    if (result.ok) {
      await markInvitationUsed(token).catch(() => {});
      onRegister();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl brand-gradient items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-[#252525]">Aravadistillery CRM</h1>
          <p className="text-sm text-[#716a56] mt-1">מערכת ניהול לקוחות</p>
        </div>

        {/* Registration card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-full bg-green-100 items-center justify-center mx-auto">
              <span className="text-xl text-green-600 font-bold">✓</span>
            </div>
            <h2 className="text-base font-semibold text-[#252525]">יצירת חשבון</h2>
            <p className="text-xs text-[#716a56]">הוזמנת למערכת. צור חשבון כדי להיכנס.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל</label>
              <input
                type="email"
                value={invitation.email}
                readOnly
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-[#716a56]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="שם מלא"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="מינימום 6 תווים"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">אישור סיסמה</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                dir="ltr"
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="הזן סיסמה שוב"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'צור חשבון והיכנס'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#716a56] mt-6">
          גישה מורשית בלבד · Aravadistillery CRM © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
