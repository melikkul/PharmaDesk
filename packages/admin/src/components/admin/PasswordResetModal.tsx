'use client';

import React, { useState } from 'react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetData: {
    resetToken: string;
    resetLink: string;
    userEmail: string;
    expiresAt: string;
  } | null;
}

export default function PasswordResetModal({ isOpen, onClose, resetData }: PasswordResetModalProps) {
  const [copied, setCopied] = useState<'token' | 'link' | null>(null);

  if (!isOpen || !resetData) return null;

  const handleCopy = async (text: string, type: 'token' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">
              🔑
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Şifre Sıfırlama</h2>
              <p className="text-slate-500 text-sm">{resetData.userEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm">
              <strong>⚠️ Dikkat:</strong> Bu token 24 saat geçerlidir. Kullanıcıya güvenli bir şekilde iletiniz.
            </p>
            <p className="text-amber-700 text-xs mt-1">
              Geçerlilik: {formatDate(resetData.expiresAt)}
            </p>
          </div>

          {/* Reset Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sıfırlama Token&apos;ı
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={resetData.resetToken}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
              />
              <button
                onClick={() => handleCopy(resetData.resetToken, 'token')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  copied === 'token'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied === 'token' ? '✓ Kopyalandı' : '📋 Kopyala'}
              </button>
            </div>
          </div>

          {/* Reset Link */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sıfırlama Linki
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={resetData.resetLink}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
              />
              <button
                onClick={() => handleCopy(resetData.resetLink, 'link')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  copied === 'link'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied === 'link' ? '✓ Kopyalandı' : '📋 Kopyala'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
