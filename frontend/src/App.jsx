import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');

  const fetchQueries = async () => {
    try {
      const res = await fetch(`${API_URL}/queries`);
      const data = await res.json();
      
      // Identify queries that have been fixed
      const hasFixSet = new Set(data.filter(q => q.is_rerun).map(q => q.parent_id));
      
      // Filter out reruns from the main list, but mark originals that have a fix
      const processed = data
        .filter(q => !q.is_rerun)
        .map(q => ({
          ...q,
          isResolved: hasFixSet.has(q.id)
        }));

      setQueries(processed);
      if (processed.length > 0 && !selectedQuery) {
        fetchQueryDetail(processed[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch queries', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const fetchQueryDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/query/${id}`);
      const data = await res.json();
      setSelectedQuery(data);
    } catch (err) {
      console.error('Failed to fetch query detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAskQuestion = async (e) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      try {
        await fetch(`${API_URL}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: search.trim() })
        });
        setSearch('');
        fetchQueries();
        fetchAnalytics();
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchQueries();
    fetchAnalytics();
  }, []);

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="logo-icon">
            <path d="M4 10L13 2L12 10H20L11 22L12 14H4L4 10Z" fill="var(--accent-purple)"/>
          </svg>
          ContextCrash
        </div>
        <nav className="nav-menu">
          <a href="#" className="nav-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Dashboard</a>
          <a href="#" className="nav-item active"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Query Logs</a>
          <a href="#" className="nav-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Failures</a>
          <a href="#" className="nav-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Analytics</a>
        </nav>
      </aside>

      {/* Main Workspace */}
      <div className="workspace">
        <header className="topbar">
          <div className="search-wrap">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search queries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleAskQuestion}
            />
          </div>
          <div className="topbar-actions">
            <div className="avatar"><img src="https://ui-avatars.com/api/?name=Admin&background=70a1ff&color=fff" alt="User Avatar" /></div>
          </div>
        </header>

        <main className="content-columns">
          {/* Left Panel: Query List */}
          <section className="panel query-list-panel">
            <h2 className="panel-title">Recent Queries</h2>
            <div className="query-list">
              {loadingList ? <div style={{color:'var(--text-muted)'}}>Loading queries...</div> : 
               queries.length === 0 ? <div style={{color:'var(--text-muted)'}}>No queries found.</div> :
               queries.map(q => {
                  let badge = 'badge-success', sb = 'Success', statusStyle = 'success';
                  if (q.status === 'failed') { 
                    if (q.isResolved) {
                      badge = 'badge-success'; sb = 'Resolved'; statusStyle = 'success';
                    } else {
                      badge = 'badge-danger'; sb = 'Failed'; statusStyle = 'failed'; 
                    }
                  }
                  if (q.status === 'suspicious') { badge = 'badge-warning'; sb = 'Suspicious'; statusStyle = 'suspicious'; }
                  const isActive = selectedQuery?.id === q.id;

                  return (
                    <div key={q.id} className={`query-item ${statusStyle} ${isActive ? 'active' : ''}`} onClick={() => fetchQueryDetail(q.id)}>
                      <div className="query-header">
                        <span className="query-time">{q.timestamp || ''}</span>
                        <span className={`badge ${badge}`}>{sb}</span>
                      </div>
                      <p className="query-text">{q.question}</p>
                    </div>
                  );
              })}
            </div>
          </section>

          {/* Center & Right Panels */}
          {loadingDetail ? (
             <div style={{color:'var(--text-main)', padding: '24px'}}>Loading details...</div>
          ) : selectedQuery ? (
             <>
               <QueryComparison query={selectedQuery} />
               <DiagnosisPanel 
                 query={selectedQuery} 
                 onRerun={async () => {
                   await fetchQueries();
                   await fetchQueryDetail(selectedQuery.id);
                   await fetchAnalytics();
                 }} 
               />
             </>
          ) : (
             <div style={{color:'var(--text-muted)', padding: '24px'}}>Select a query to view details</div>
          )}
        </main>

        <AnalyticsSection analytics={analytics} />
      </div>
    </div>
  );
}

function QueryComparison({ query }) {
  const [showFix, setShowFix] = useState(query.fix_history ? true : false);
  const data = showFix && query.fix_history ? query.fix_history : query;

  useEffect(() => {
    if (query.fix_history) setShowFix(true);
    else setShowFix(false);
  }, [query.id, query.fix_history]);

  return (
    <section className="panel query-details-panel">
      <div className="details-card">
        <div className="details-header">
          <div style={{display:'flex', alignItems:'center', gap: '12px'}}>
            <span className="label">Observed Interaction</span>
            {query.fix_history && (
              <div className="toggle-group">
                <button className={`toggle-btn ${!showFix ? 'active' : ''}`} onClick={() => setShowFix(false)}>Original Failure</button>
                <button className={`toggle-btn ${showFix ? 'active' : ''}`} onClick={() => setShowFix(true)}>Resolved State</button>
              </div>
            )}
          </div>
          <span className="time-stamp">ID: {query.id} • {data.timestamp}</span>
        </div>
        <h3 className="user-question">{query.question}</h3>
        
        <div className="section-divider"></div>

        <div className="comparison-content">
          <div className="chunks-section">
            <div className="section-title-wrap">
              <span className="label">
                {showFix ? 'Optimized Context (The Fix)' : 'Retrieved Context (The Failure)'}
              </span>
            </div>
            {data.retrieved_chunks.map((chunk, i) => (
              <div key={i} className="chunk-card">
                <div className="chunk-header">
                  <span className="chunk-name">{chunk.doc || 'Document'}</span>
                  <span className={`similarity-score ${chunk.score >= 0.7 ? 'good' : 'weak'}`}>{chunk.score} similarity</span>
                </div>
                <p className="chunk-content">{chunk.content}</p>
              </div>
            ))}
          </div>

          <div className="section-divider"></div>

          <div className="final-answer-section">
            <span className="label">{showFix ? 'Resolved Answer' : 'Failed AI Answer'}</span>
            <div className={`answer-box ${showFix ? 'resolved-glow' : 'failed-line'}`}>
              <p>{data.answer}</p>
              {!showFix && query.diagnosis?.cause && (
                <div className="hallucination-highlight">
                  <strong>Wait!</strong> {query.diagnosis.cause}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DiagnosisPanel({ query, onRerun }) {
  const [running, setRunning] = useState(false);
  const data = query.fix_history || query;
  
  if (!query?.diagnosis) return <section className="panel diagnosis-panel" style={{opacity: 0.5}}>No diagnosis available</section>;

  const { status, diagnosis, is_rerun } = data;
  const isSuccess = status === 'success' || (query.fix_history && query.fix_history.status === 'success');
  const isSuspicious = status === 'suspicious';

  let borderStyle = 'var(--accent-red)';
  let shadowStyle = '0 0 30px var(--accent-red-glow)';
  let svColor = 'var(--accent-red)';
  
  if (isSuccess) {
    borderStyle = 'var(--accent-green)';
    shadowStyle = '0 0 30px var(--accent-green-bg)';
    svColor = 'var(--accent-green)';
  } else if (isSuspicious) {
    borderStyle = 'var(--accent-warn)';
    shadowStyle = '0 0 30px var(--accent-warn-bg)';
    svColor = 'var(--accent-warn)';
  }

  const handleRerun = async () => {
    setRunning(true);
    try {
      await fetch(`${API_URL}/rerun/${query.id}`, { method: 'POST' });
      await onRerun();
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const steps = (data.diagnosis.fix || '').split('.').filter(f => f.trim() !== '');

  return (
    <section className="panel diagnosis-panel" style={{borderColor: borderStyle, boxShadow: shadowStyle}}>
      <div className="diagnosis-header">
        <h2 style={{color: svColor}}>{query.fix_history ? 'Resolution Verified' : 'Failure Diagnosis'}</h2>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={svColor} strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>

      <div className="diagnosis-content">
        <div className="diag-row">
          <span className="diag-label">Type</span>
          <span className={`diag-value type-${status}`}>{data.diagnosis.type}</span>
        </div>
        
        <div className="cause-box">
          <h4>{query.fix_history ? 'How it was Fixed' : 'Root Cause'}</h4>
          <p>{data.diagnosis.cause}</p>
        </div>

        <div className="suggested-fix">
          <h4>{query.fix_history ? 'Post-Resolution Notes' : 'Remediation Steps'}</h4>
          <ul className="fix-steps">
            {steps.length > 0 ? steps.map((s, i) => <li key={i}>{s.trim()}</li>) : <li>No action required</li>}
          </ul>
        </div>

        {!query.fix_history && !is_rerun && (
          <button className="rerun-btn" onClick={handleRerun} disabled={running}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
            {running ? 'Verifying Fix...' : 'Apply Fix & Re-run'}
          </button>
        )}
      </div>
    </section>
  );
}

function AnalyticsSection({ analytics }) {
  if (!analytics) return null;

  const total = analytics.total_queries || 0;
  const failRate = analytics.failure_rate || 0;
  const distEntries = Object.entries(analytics.failure_distribution || {}).sort((a,b) => b[1] - a[1]);
  const colors = ['rbg', 'ybg', 'pbg'];
  const totalFails = distEntries.reduce((acc, curr) => acc + curr[1], 0) || 1;

  return (
    <footer className="analytics-section">
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Queries Logged</span>
          <div className="metric-value">{total}</div>
        </div>
        <div className="metric-card">
          <span className="metric-title">Success Rate</span>
          <div className="metric-value text-green">{((1 - failRate) * 100).toFixed(0)}%</div>
        </div>
        <div className="metric-card">
          <span className="metric-title">Avg Latency</span>
          <div className="metric-value">{analytics.avg_latency || 0}s</div>
        </div>
      </div>
    </footer>
  );
}

export default App;
