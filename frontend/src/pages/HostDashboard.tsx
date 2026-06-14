import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getHostedHangouts, respondToJoin, type HangoutDetail, type JoinRecord } from '../api/wango.api';
import { useNavigate } from 'react-router-dom';

export function HostDashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [hangouts, setHangouts] = useState<HangoutDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await getHostedHangouts(token);
      setHangouts(res.data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDashboard();
    }
  }, [isLoaded, isSignedIn]);

  const handleRespond = async (joinId: number, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const token = await getToken();
      if (!token) return;
      await respondToJoin(joinId, status, token);
      // Optimistically update
      setHangouts((prev) =>
        prev.map((h) => ({
          ...h,
          joins: h.joins.map((j) => (j.id === joinId ? { ...j, status } : j)),
        }))
      );
    } catch (err: any) {
      alert(err.message ?? 'Failed to respond.');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ color: 'var(--color-danger)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '80px 20px 40px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
        Host Dashboard
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        Manage your hangouts and join requests.
      </p>

      {hangouts.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏕️</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No hangouts yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            You haven't posted any hangouts. Create one to invite people!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/post')}>
            Post a Hangout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {hangouts.map((h) => (
            <div key={h.id} className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                      {h.title}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      {new Date(h.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--glass-border)',
                  }}>
                    {h.status}
                  </div>
                </div>
              </div>

              <div style={{ padding: 20, background: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Join Requests ({h.joins.length})
                </h3>
                {h.joins.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No requests yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {h.joins.map((j: JoinRecord) => (
                      <div key={j.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 12, borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: j.user.avatarColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: '#fff', fontWeight: 700
                          }}>
                            {j.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600 }}>{j.user.name}</p>
                            {j.message && (
                              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>"{j.message}"</p>
                            )}
                          </div>
                        </div>

                        {j.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn"
                              style={{ padding: '6px 12px', fontSize: 12, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                              onClick={() => handleRespond(j.id, 'DECLINED')}
                            >
                              Decline
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              onClick={() => handleRespond(j.id, 'ACCEPTED')}
                            >
                              Accept
                            </button>
                          </div>
                        ) : (
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: j.status === 'ACCEPTED' ? 'var(--color-success)' : 'var(--color-danger)'
                          }}>
                            {j.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
