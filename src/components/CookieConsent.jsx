import React, { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';

export const CONSENT_KEY = 'cookie-consent';

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'declined' | null
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
  window.dispatchEvent(new CustomEvent('invoix:consent', { detail: value }));
}

export function useConsent() {
  const [consent, setConsentState] = useState(getConsent);
  useEffect(() => {
    const onChange = (e) => setConsentState(e.detail || getConsent());
    window.addEventListener('invoix:consent', onChange);
    return () => window.removeEventListener('invoix:consent', onChange);
  }, []);
  return consent;
}

export default function CookieConsent() {
  const consent = useConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (consent === null) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [consent]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 2000,
        maxWidth: 560, margin: '0 auto',
        background: 'var(--ink)', color: '#fdfcf8',
        border: '1px solid #2a2a28', borderRadius: 14, padding: '16px 18px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}
    >
      <Cookie size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--oxide)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>A note on cookies</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#c9c4bb' }}>
          Sign-in sessions live in your own browser. Google sign-in loads Google scripts that may set their own cookies.
          Read the <a href="/privacy" style={{ color: '#fdfcf8', textDecoration: 'underline' }}>Privacy Policy</a>.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" style={{ background: 'var(--oxide)', color: 'var(--ink)', borderRadius: 10, fontWeight: 700 }} onClick={() => setConsent('accepted')}>
            Accept
          </button>
          <button type="button" className="btn btn-sm" style={{ background: 'transparent', color: '#fdfcf8', border: '1px solid rgba(253,252,248,0.3)', borderRadius: 10 }} onClick={() => setConsent('declined')}>
            Decline Google cookies
          </button>
        </div>
      </div>
    </div>
  );
}
