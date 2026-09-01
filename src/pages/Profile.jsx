import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Building2, MapPin, ShieldCheck, CheckCircle2, AlertCircle, Clock, Send } from 'lucide-react';
import { api } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [edit, setEdit] = useState({ name: '', phone: '', businessName: '', address: '', city: '', email: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.getProfile();
      setProfile(res.user);
      setEdit({
        name: res.user.name || '',
        phone: res.user.phone || '',
        businessName: res.user.businessName || '',
        address: res.user.address || '',
        city: res.user.city || '',
        email: res.user.email || '',
      });
      const appr = await api.getProfileApprovals();
      setApprovals(appr.approvals || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const requestVerification = async () => {
    if (!profile) return;
    setError(''); setOk('');
    try {
      const res = await api.requestEmailVerification(profile.userId);
      setOk(res.message || 'Code sent to ' + profile.email);
      setVerifying(true);
    } catch (e) { setError(e.message); }
  };

  const confirmVerification = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    try {
      const res = await api.confirmEmailVerification(profile.userId, verifyCode);
      if (res.token) api.setSession(res.token, res.user);
      setOk('Email verified! You can now use password reset and sync.');
      setVerifying(false);
      setVerifyCode('');
      load();
    } catch (e) { setError(e.message); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    const changes = {};
    for (const k of ['name', 'phone', 'businessName', 'address', 'city', 'email']) {
      if (edit[k] !== (profile[k] || '')) changes[k] = edit[k];
    }
    if (Object.keys(changes).length === 0) { setError('No changes to save'); return; }
    setSaving(true);
    try {
      const res = await api.requestProfileChange(changes);
      setOk('Changes sent for approval. Open the desktop app → Approvals to verify, then it will sync to the web.');
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, color: 'var(--stone)' }}>Loading profile…</div>;
  if (!profile) return <div style={{ padding: 32 }}><div className="err-box">{error || 'Could not load profile'}</div></div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><User size={22} /> Profile</h1>
        <div style={{ fontSize: 13, color: 'var(--stone)', marginTop: 4 }}>Manage your business identity. Email must be verified for password reset. Changes require approval in the desktop app and will sync to the web.</div>
      </div>

      {error && <div className="err-box" style={{ marginBottom: 12 }}>{error}</div>}
      {ok && <div className="ok-box" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <ShieldCheck size={18} color={profile.emailVerified ? 'var(--success)' : 'var(--oxide)'} />
          <span style={{ fontWeight: 600 }}>Email verification</span>
          {profile.emailVerified ? <span className="badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Verified</span> : <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}><AlertCircle size={12} style={{ marginRight: 4 }} /> Not verified</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8 }}>Registered email: <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{profile.email || '—'}</b> {profile.google && <span style={{ fontSize: 11, color: 'var(--stone-light)' }}>(Google account — auto-verified)</span>}</div>
        {!profile.emailVerified && (
          <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 8, padding: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Your email is not verified. Verify to enable password reset and sync.</div>
            {!verifying ? (
              <button className="btn btn-primary btn-sm" onClick={requestVerification}><Send size={14} /> Send verification code</button>
            ) : (
              <form onSubmit={confirmVerification} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" placeholder="6-digit code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} style={{ width: 160, letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }} />
                <button className="btn btn-primary btn-sm" type="submit"><CheckCircle2 size={14} /> Verify</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={requestVerification}>Resend</button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Edit details</h2>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label><User size={12} style={{ marginRight: 4 }} /> Display name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Your name" /></div>
            <div className="field"><label><Phone size={12} style={{ marginRight: 4 }} /> Phone</label><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Phone" /></div>
            <div className="field"><label><Building2 size={12} style={{ marginRight: 4 }} /> Business name</label><input className="input" value={edit.businessName} onChange={(e) => setEdit({ ...edit, businessName: e.target.value })} placeholder="Mehta Fabrics" /></div>
            <div className="field"><label><Mail size={12} style={{ marginRight: 4 }} /> Email</label><input className="input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label><MapPin size={12} style={{ marginRight: 4 }} /> Address</label><input className="input" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} placeholder="Street, area" /></div>
            <div className="field"><label>City</label><input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Surat" /></div>
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}><div style={{ fontSize: 11, color: 'var(--stone-light)', lineHeight: 1.4 }}>Changing email will require re-verification. All changes are held for approval in the desktop app → <b>Approvals</b>.</div></div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={saving}>{saving ? 'Sending…' : 'Request approval for changes'}</button>
        </form>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} /> Recent approvals</h2>
        {approvals.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--stone)' }}>No pending approvals. When you request a change, it appears here and in the desktop app’s Approvals.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {approvals.map((a) => (
              <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, background: a.status === 'pending' ? '#fffbeb' : '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--stone)' }}>{new Date(a.createdAt).toLocaleString()}</span>
                  <span className="badge" style={{ background: a.status === 'approved' ? '#dcfce7' : a.status === 'rejected' ? '#fee2e2' : '#fef3c7', color: a.status === 'approved' ? '#166534' : a.status === 'rejected' ? '#991b1b' : '#92400e', border: '1px solid var(--line)' }}>{a.status}</span>
                </div>
                <div style={{ fontSize: 13 }}>
                  {Object.entries(a.changes).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ color: 'var(--stone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{k}</span>
                      <span><span style={{ color: 'var(--stone-light)', textDecoration: 'line-through', marginRight: 8, fontSize: 12 }}>{String(a.current[k] || '—')}</span><span style={{ fontWeight: 600 }}>{String(v)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
