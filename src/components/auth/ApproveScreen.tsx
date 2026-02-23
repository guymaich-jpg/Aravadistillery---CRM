// ApproveScreen — shown to managers when they click an approve/decline link from their email.
// Validates the request, confirms the action, and updates Firestore.

import { useState, useEffect } from 'react';
import { getAccessRequest, reviewAccessRequest, type AccessRequest } from '@/lib/accessRequests';
import { getSession } from '@/lib/auth/simpleAuth';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ApproveScreenProps {
  requestId: string;
  token: string;
  action: 'approve' | 'decline';
  onDone: () => void;
}

export function ApproveScreen({ requestId, token, action, onDone }: ApproveScreenProps) {
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccessRequest(requestId)
      .then(r => {
        setRequest(r);
        setLoading(false);
      })
      .catch(() => {
        setError('שגיאה בטעינת הבקשה');
        setLoading(false);
      });
  }, [requestId]);

  async function handleAction(doAction: 'approved' | 'declined') {
    setSubmitting(true);
    const session = getSession();
    const res = await reviewAccessRequest(requestId, token, doAction, session?.email ?? '');
    setSubmitting(false);
    if (res.ok) {
      setResult({
        ok: true,
        message: doAction === 'approved'
          ? `הגישה אושרה עבור ${request?.email}`
          : `הבקשה נדחתה עבור ${request?.email}`,
      });
    } else {
      setResult({ ok: false, message: res.error });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#716a56] animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-sm text-red-600">{error || 'בקשה לא נמצאה'}</p>
          <button onClick={onDone} className="text-sm text-[#716a56] underline">
            חזור למערכת
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          {result.ok ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          ) : (
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          )}
          <p className={`text-sm font-semibold ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
            {result.message}
          </p>
          <button
            onClick={onDone}
            className="px-6 py-2.5 bg-[#2c332f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e2420] transition-all"
          >
            חזור למערכת
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl brand-gradient items-center justify-center text-white text-2xl font-bold shadow-lg">
            A
          </div>
          <h2 className="text-lg font-bold text-[#252525]">
            {action === 'approve' ? 'אישור בקשת גישה' : 'דחיית בקשת גישה'}
          </h2>
        </div>

        {/* Request details */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#716a56]">שם:</span>
            <span className="font-medium text-[#252525]">{request.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#716a56]">אימייל:</span>
            <span className="font-medium text-[#252525] dir-ltr">{request.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#716a56]">תאריך בקשה:</span>
            <span className="font-medium text-[#252525]">
              {new Date(request.createdAt).toLocaleDateString('he-IL')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#716a56]">סטטוס:</span>
            <span className={`font-medium ${
              request.status === 'pending' ? 'text-amber-600' :
              request.status === 'approved' ? 'text-green-600' : 'text-red-600'
            }`}>
              {request.status === 'pending' ? 'ממתין' :
               request.status === 'approved' ? 'אושר' : 'נדחה'}
            </span>
          </div>
        </div>

        {request.status !== 'pending' ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-[#716a56]">בקשה זו כבר טופלה.</p>
            <button onClick={onDone} className="text-sm text-[#716a56] underline">
              חזור למערכת
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approved')}
              disabled={submitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'אשר גישה'
              )}
            </button>
            <button
              onClick={() => handleAction('declined')}
              disabled={submitting}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'דחה בקשה'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
