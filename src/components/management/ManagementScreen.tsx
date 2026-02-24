import { useState, useEffect } from 'react';
import { getSession } from '@/lib/auth/simpleAuth';
import { isManager } from '@/lib/auth/managers';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  buildInviteUrl,
} from '@/lib/invitations';
import type { Invitation } from '@/types/invitation';
import { UserPlus, Copy, Check, XCircle, Loader2, Users, Send, Mail } from 'lucide-react';

function statusLabel(inv: Invitation): { text: string; className: string } {
  if (inv.status === 'accepted') return { text: 'מאושר', className: 'bg-green-100 text-green-800' };
  if (inv.status === 'revoked') return { text: 'בוטל', className: 'bg-gray-100 text-gray-600' };
  if (new Date(inv.expiresAt) < new Date()) return { text: 'פג תוקף', className: 'bg-red-100 text-red-700' };
  return { text: 'ממתין', className: 'bg-amber-100 text-amber-800' };
}

function isExpired(inv: Invitation): boolean {
  return new Date(inv.expiresAt) < new Date();
}

function getRole(email: string): string {
  return isManager(email) ? 'מנהל' : 'משתמש';
}

export function ManagementScreen() {
  const session = getSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !session) return;
    setCreating(true);
    setError('');
    setSuccessMsg('');
    try {
      const inv = await createInvitation(newEmail, session.email);
      buildInviteUrl(inv.token);
      setSuccessMsg(`ההזמנה נוצרה ל-${inv.email}`);
      setNewEmail('');
      await loadInvitations();
    } catch {
      setError('שגיאה בשליחת ההזמנה.');
    }
    setCreating(false);
  }

  async function handleCopy(text: string, token: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
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
      {/* Send Invitation Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Send className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#252525]">שלח הזמנה</h3>
            <p className="text-xs text-[#716a56]">הזן כתובת אימייל ושלח קישור הזמנה למשתמש</p>
          </div>
        </div>

        <form onSubmit={handleSendInvitation} className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setError(''); setSuccessMsg(''); }}
            required
            dir="ltr"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
            placeholder="email@example.com"
          />
          <button
            type="submit"
            disabled={creating || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                שלח
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
            <p className="text-xs text-green-600 mt-1">
              העתק את קישור ההזמנה מהטבלה ושלח למשתמש.
            </p>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <Users className="h-4 w-4 text-[#716a56]" />
          <h3 className="text-sm font-semibold text-[#252525]">משתמשים</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 text-[#716a56] animate-spin mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-12 text-center">
            <UserPlus className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#716a56]">אין משתמשים עדיין. שלח הזמנה כדי להתחיל.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">שם משתמש</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">אימייל</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">סטטוס</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">תפקיד</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => {
                  const status = statusLabel(inv);
                  const canCopy = inv.status === 'pending' && !isExpired(inv);
                  const canRevoke = inv.status === 'pending';
                  const role = getRole(inv.email);

                  return (
                    <tr key={inv.token} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[#252525] text-sm">
                        {inv.userName || <span className="text-[#716a56] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#252525] font-mono text-xs" dir="ltr">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          role === 'מנהל' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {role}
                        </span>
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
