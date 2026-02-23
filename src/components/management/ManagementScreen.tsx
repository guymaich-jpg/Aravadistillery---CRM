import { useState, useEffect } from 'react';
import { getSession } from '@/lib/auth/simpleAuth';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  buildInviteUrl,
} from '@/lib/invitations';
import type { Invitation } from '@/types/invitation';
import { UserPlus, Copy, Check, XCircle, Loader2, Link2 } from 'lucide-react';

function statusLabel(inv: Invitation): { text: string; className: string } {
  if (inv.status === 'used') return { text: 'מומשה', className: 'bg-green-100 text-green-800' };
  if (inv.status === 'revoked') return { text: 'בוטלה', className: 'bg-gray-100 text-gray-600' };
  if (new Date(inv.expiresAt) < new Date()) return { text: 'פגה', className: 'bg-red-100 text-red-700' };
  return { text: 'ממתינה', className: 'bg-amber-100 text-amber-800' };
}

function isExpired(inv: Invitation): boolean {
  return new Date(inv.expiresAt) < new Date();
}

export function ManagementScreen() {
  const session = getSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    setLoading(true);
    try {
      const items = await listInvitations();
      setInvitations(items);
    } catch {
      setError('שגיאה בטעינת ההזמנות.');
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !session) return;
    setCreating(true);
    setError('');
    setCreatedUrl('');
    try {
      const inv = await createInvitation(newEmail, session.email);
      const url = buildInviteUrl(inv.token);
      setCreatedUrl(url);
      setNewEmail('');
      await loadInvitations();
    } catch {
      setError('שגיאה ביצירת הזמנה.');
    }
    setCreating(false);
  }

  async function handleCopy(text: string, token: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  }

  async function handleRevoke(token: string) {
    try {
      await revokeInvitation(token);
      await loadInvitations();
    } catch {
      setError('שגיאה בביטול ההזמנה.');
    }
  }

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      {/* Invite New User */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#252525]">הזמן משתמש חדש</h3>
            <p className="text-xs text-[#716a56]">צור קישור הזמנה ושלח למשתמש</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setError(''); }}
            required
            dir="ltr"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
            placeholder="email@example.com"
          />
          <button
            type="submit"
            disabled={creating || !newEmail.trim()}
            className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'צור הזמנה'
            )}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {createdUrl && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-green-700">ההזמנה נוצרה בהצלחה!</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={createdUrl}
                readOnly
                dir="ltr"
                className="flex-1 px-3 py-2 border border-green-200 rounded-lg text-xs bg-white text-[#252525] font-mono"
              />
              <button
                onClick={() => handleCopy(createdUrl, 'new')}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-all whitespace-nowrap"
              >
                {copiedToken === 'new' ? (
                  <><Check className="w-3.5 h-3.5" /> הועתק</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> העתק קישור</>
                )}
              </button>
            </div>
            <p className="text-xs text-green-600">שלח קישור זה למשתמש. הקישור תקף ל-7 ימים.</p>
          </div>
        )}
      </div>

      {/* Existing Invitations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#252525]">הזמנות קיימות</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 text-[#716a56] animate-spin mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-12 text-center">
            <Link2 className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#716a56]">אין הזמנות עדיין</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">אימייל</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">סטטוס</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right hidden sm:table-cell">נוצר</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right hidden sm:table-cell">תוקף</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => {
                  const status = statusLabel(inv);
                  const canCopy = inv.status === 'pending' && !isExpired(inv);
                  const canRevoke = inv.status === 'pending';

                  return (
                    <tr key={inv.token} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[#252525] font-mono text-xs" dir="ltr">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#716a56] hidden sm:table-cell">
                        {new Date(inv.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#716a56] hidden sm:table-cell">
                        {new Date(inv.expiresAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canCopy && (
                            <button
                              onClick={() => handleCopy(buildInviteUrl(inv.token), inv.token)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#716a56] hover:text-[#252525] hover:bg-gray-100 rounded-lg transition-colors"
                              title="העתק קישור"
                            >
                              {copiedToken === inv.token ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {canRevoke && (
                            <button
                              onClick={() => handleRevoke(inv.token)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="בטל הזמנה"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!canCopy && !canRevoke && (
                            <span className="text-xs text-[#716a56]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
