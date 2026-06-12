import React, { useState, useRef, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

/* ─── Constants ─────────────────────────────────────── */
const AGENT_META = [
  { key: 'material_flow',     name: 'Material Flow Analyst', icon: '🔄', desc: 'Maps inputs → waste streams', color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)' },
  { key: 'lca',               name: 'LCA Scorer',            icon: '🌍', desc: 'ISO 14044 carbon footprint', color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)' },
  { key: 'circularity',       name: 'Circularity Gap',       icon: '♻️', desc: '10R hierarchy gap analysis', color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)' },
  { key: 'industrial_ecology',name: 'Industrial Ecology',    icon: '🏭', desc: 'Symbiosis matching engine', color: '#fb7185', glow: 'rgba(251,113,133,0.15)' },
  { key: 'iso_14000',         name: 'ISO 14000 Compliance',  icon: '📋', desc: 'EMS conformance checker',   color: '#fb7185', glow: 'rgba(251,113,133,0.15)' },
  { key: 'sdg_policy',        name: 'SDG Policy',            icon: '🎯', desc: 'SDG mapping + CCTS credits', color: '#fb7185', glow: 'rgba(251,113,133,0.15)' },
];

const EXAMPLES = [
  'E-waste recycling facility in Bangalore',
  'PET bottle manufacturing supply chain',
  'Agricultural waste from rice milling in Karnataka',
  'Lithium-ion battery production plant',
];

/* ─── Helpers ────────────────────────────────────────── */
function gradeColor(grade) {
  return { A: '#2dd4bf', B: '#60efff', C: '#fbbf24', D: '#fb7185', F: '#f43f5e' }[grade] || '#94a3b8';
}

function scoreColor(score) {
  if (score >= 75) return '#2dd4bf';
  if (score >= 50) return '#60efff';
  if (score >= 30) return '#fbbf24';
  return '#fb7185';
}

function rScoreColor(score) {
  if (score >= 8) return { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf' };
  if (score >= 5) return { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' };
  return { bg: 'rgba(251,113,133,0.15)', text: '#fb7185' };
}

function clauseClass(status) {
  return { compliant: 'clause-compliant', partial: 'clause-partial', 'non-compliant': 'clause-non-compliant', unknown: 'clause-unknown' }[status] || 'clause-unknown';
}

function clauseDotColor(status) {
  return { compliant: '#2dd4bf', partial: '#fbbf24', 'non-compliant': '#fb7185', unknown: '#4a5568' }[status] || '#4a5568';
}

function impactTag(impact) {
  const m = { high: 'tag-high', medium: 'tag-medium', low: 'tag-low' };
  return m[(impact || '').toLowerCase()] || 'tag-low';
}

function timelineTag(t) {
  if (!t) return 'tag-agent';
  const tl = t.toLowerCase();
  if (tl.includes('immediate')) return 'tag-immediate';
  if (tl.includes('short')) return 'tag-short';
  return 'tag-long';
}

/* ─── ScoreOrb ───────────────────────────────────────── */
function ScoreOrb({ score, grade }) {
  const R = 88;
  const circ = 2 * Math.PI * R;
  const pct = Math.min(score / 100, 1);
  const dash = pct * circ;
  const color = gradeColor(grade);

  return (
    <div className="score-orb">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="100" cy="100" r={R} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 12px ${color}80)`, transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="score-orb-inner">
        <div className="score-number" style={{ color }}>{Math.round(score)}</div>
        <div className="score-grade" style={{ color }}>{grade}</div>
        <div className="score-label">MACEA Score</div>
      </div>
    </div>
  );
}

/* ─── ScoreBar ───────────────────────────────────────── */
function ScoreBar({ label, value, color }) {
  return (
    <div className="score-bar-item">
      <div className="score-bar-meta">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${Math.min(value, 100)}%`, '--bar-color': color }} />
      </div>
    </div>
  );
}

/* ─── AgentCard ──────────────────────────────────────── */
function AgentCard({ meta, status, result }) {
  const cardClass = `agent-card ${status}`;

  let preview = null;
  if (status === 'done' && result) {
    const text = result.summary || result.agent || '';
    preview = <div className="agent-preview">{text.slice(0, 160)}{text.length > 160 ? '…' : ''}</div>;
  }
  if (status === 'error') {
    preview = <div className="agent-preview" style={{ color: '#fb7185' }}>Agent error — check API key or retry.</div>;
  }

  return (
    <div
      className={cardClass}
      style={{ '--agent-color': meta.color, '--agent-glow': meta.glow }}
    >
      <div className="agent-card-header">
        <div className="agent-icon-wrap">{meta.icon}</div>
        <div>
          <div className="agent-name">{meta.name}</div>
          <div className="agent-desc">{meta.desc}</div>
        </div>
        <div className={`agent-status-badge status-${status}`}>
          {status === 'running' && <div className="spinner" />}
          {status === 'done'    && '✓'}
          {status === 'error'   && '✕'}
          {status === 'idle'    && '—'}
          {status === 'running' ? 'Analyzing' : status === 'done' ? 'Done' : status === 'error' ? 'Error' : 'Idle'}
        </div>
      </div>
      {preview}
    </div>
  );
}

/* ─── RadarPanel ─────────────────────────────────────── */
function RadarPanel({ data }) {
  const radarData = [
    { subject: 'Circularity', value: data.circularity || 0 },
    { subject: 'LCA (inv)', value: data.lca_inverted || 0 },
    { subject: 'ISO', value: data.iso_compliance || 0 },
    { subject: 'Symbiosis', value: data.symbiosis || 0 },
    { subject: 'SDG', value: data.sdg_alignment || 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={radarData} outerRadius={90}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} />
        <Radar dataKey="value" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.12}
          strokeWidth={2} dot={{ fill: '#2dd4bf', r: 3 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ─── BarPanel ───────────────────────────────────────── */
function LcaBarPanel({ stages }) {
  const data = Object.entries(stages || {}).map(([k, v]) => ({
    name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    score: v.carbon_score || 0,
    impact: v.impact_level,
  }));
  const colors = data.map(d => d.score > 65 ? '#fb7185' : d.score > 40 ? '#fbbf24' : '#2dd4bf');
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 20 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" />
        <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#141d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}
          labelStyle={{ color: '#f0f4ff' }}
          itemStyle={{ color: '#94a3b8' }}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Main App ───────────────────────────────────────── */
export default function App() {
  const [product, setProduct] = useState('');
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentResults, setAgentResults] = useState({});
  const [synthesis, setSynthesis] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef(null);

  const resetAll = () => {
    setAgentStatuses({});
    setAgentResults({});
    setSynthesis(null);
    setError('');
    setShowResults(false);
  };

  const keyMap = {
    'Material Flow Analyst': 'material_flow',
    'LCA Scorer': 'lca',
    'Circularity Gap': 'circularity',
    'Industrial Ecology': 'industrial_ecology',
    'ISO 14000': 'iso_14000',
    'SDG Policy': 'sdg_policy',
    'Synthesis': 'synthesis',
  };

  const runAudit = useCallback(async () => {
    if (!product.trim()) return;
    resetAll();
    setRunning(true);

    try {
      const response = await fetch('/audit/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: product.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'agent_start') {
                const k = keyMap[data.agent] || data.agent;
                setAgentStatuses(prev => ({ ...prev, [k]: 'running' }));
              } else if (currentEvent === 'agent_done') {
                const k = data.key || keyMap[data.agent] || data.agent;
                setAgentStatuses(prev => ({ ...prev, [k]: 'done' }));
                setAgentResults(prev => ({ ...prev, [k]: data.result }));
              } else if (currentEvent === 'agent_error') {
                const k = keyMap[data.agent] || data.agent;
                setAgentStatuses(prev => ({ ...prev, [k]: 'error' }));
                setError(`Agent "${data.agent}" failed: ${data.error}`);
              } else if (currentEvent === 'synthesis_done') {
                setAgentStatuses(prev => ({ ...prev, synthesis: 'done' }));
                setSynthesis(data.result);
                setShowResults(true);
                setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              } else if (currentEvent === 'complete') {
                setShowResults(true);
              }
            } catch { /* skip malformed lines */ }
          }
          if (line === '') currentEvent = '';
        }
      }
    } catch (e) {
      setError(e.message || 'Connection failed. Is the backend running on port 8000?');
    } finally {
      setRunning(false);
    }
  }, [product]);

  const hasAnyActivity = Object.keys(agentStatuses).length > 0;

  /* ── Render ── */
  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-icon">♻️</div>
          <div>
            <div className="brand-name">MACEA</div>
            <div className="brand-subtitle">Multi-Agent Circular Economy Auditor</div>
          </div>
        </div>
        <div className="header-badge">
          <div className="dot" />
          Gemini 2.0 Flash · 6 Agents · ISO 14000
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Hero */}
        <section className="hero">
          <div className="hero-eyebrow">
            <span>✦</span> AI-Powered Circular Economy Analysis
          </div>
          <h1 className="hero-title">
            Audit Any Product's<br />
            <span>Circular Economy Footprint</span>
          </h1>
          <p className="hero-desc">
            Six specialized AI agents debate, analyze, and synthesize a full circularity audit —
            with 9R gap analysis, ISO 14000 compliance, industrial symbiosis, and carbon credit estimates.
          </p>
        </section>

        {/* Input Card */}
        <div className="input-card">
          <div className="input-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Describe your product, supply chain, or industrial process
          </div>
          <textarea
            id="product-input"
            className="input-textarea"
            placeholder="e.g. E-waste recycling facility in Bangalore that processes smartphones, laptops, and PCBs. Materials include lithium batteries, copper, plastics, and rare earth elements. Current disposal: landfill for non-metallic residues."
            value={product}
            onChange={e => setProduct(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) runAudit(); }}
            disabled={running}
          />
          <div className="input-row">
            <div className="example-chips">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  className="example-chip"
                  onClick={() => setProduct(ex)}
                  disabled={running}
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              id="run-audit-btn"
              className="btn-audit"
              onClick={runAudit}
              disabled={running || !product.trim()}
            >
              {running ? (
                <><div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Auditing…</>
              ) : (
                <>⚡ Run Audit</>
              )}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Agent Pipeline */}
        {hasAnyActivity && (
          <section className="pipeline-section fade-in-up">
            <div className="section-title">
              Agent Pipeline <div className="line" />
            </div>
            <div className="agents-grid">
              {AGENT_META.map(meta => (
                <AgentCard
                  key={meta.key}
                  meta={meta}
                  status={agentStatuses[meta.key] || 'idle'}
                  result={agentResults[meta.key]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {showResults && synthesis && (
          <div ref={resultsRef} className="fade-in-up">

            {/* Score Hero */}
            <div className="score-hero">
              <ScoreOrb score={synthesis.macea_score} grade={synthesis.grade} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Certification: {synthesis.certification_path?.slice(0, 80)}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="exec-summary">{synthesis.executive_summary}</div>

            {/* Score Breakdown + Radar */}
            <div className="results-grid" style={{ marginBottom: 24 }}>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(45,212,191,0.1)' }}>📊</div>
                  <div className="panel-title">Score Breakdown</div>
                </div>
                <div className="panel-body">
                  <div className="score-bars">
                    {synthesis.score_breakdown && <>
                      <ScoreBar label="Circularity (30%)"  value={synthesis.score_breakdown.circularity}    color={scoreColor(synthesis.score_breakdown.circularity)} />
                      <ScoreBar label="LCA Inverted (25%)" value={synthesis.score_breakdown.lca_inverted}   color={scoreColor(synthesis.score_breakdown.lca_inverted)} />
                      <ScoreBar label="ISO Compliance (20%)" value={synthesis.score_breakdown.iso_compliance} color={scoreColor(synthesis.score_breakdown.iso_compliance)} />
                      <ScoreBar label="Symbiosis (15%)"    value={synthesis.score_breakdown.symbiosis}      color={scoreColor(synthesis.score_breakdown.symbiosis)} />
                      <ScoreBar label="SDG Alignment (10%)" value={synthesis.score_breakdown.sdg_alignment}  color={scoreColor(synthesis.score_breakdown.sdg_alignment)} />
                    </>}
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>🕸</div>
                  <div className="panel-title">Performance Radar</div>
                </div>
                <div className="panel-body">
                  {synthesis.score_breakdown && <RadarPanel data={synthesis.score_breakdown} />}
                </div>
              </div>
            </div>

            {/* Top 10 Interventions */}
            {synthesis.top_10_interventions?.length > 0 && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(45,212,191,0.1)' }}>⚡</div>
                  <div className="panel-title">Top Intervention Recommendations</div>
                  <div className="panel-subtitle">{synthesis.top_10_interventions.length} actions</div>
                </div>
                <div className="panel-body">
                  <div className="interventions-list">
                    {synthesis.top_10_interventions.map((item, i) => (
                      <div className="intervention-item" key={i}>
                        <div className="intervention-rank">{item.rank || i + 1}</div>
                        <div className="intervention-body">
                          <div className="intervention-action">{item.action}</div>
                          <div className="intervention-meta">
                            <span className={`tag ${impactTag(item.impact)}`}>{item.impact} impact</span>
                            <span className={`tag ${timelineTag(item.timeline)}`}>{item.timeline}</span>
                            {item.source_agent && <span className="tag tag-agent">{item.source_agent}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 10R Analysis + LCA Stages */}
            <div className="results-grid" style={{ marginBottom: 24 }}>
              {agentResults.circularity?.r_scores && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'rgba(45,212,191,0.1)' }}>♻️</div>
                    <div className="panel-title">10R Circularity Analysis</div>
                    <div className="panel-subtitle">
                      Score: {agentResults.circularity.overall_circularity_score}/100 · Grade {agentResults.circularity.circularity_grade}
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="r-grid">
                      {agentResults.circularity.r_scores.map((r, i) => {
                        const { bg, text } = rScoreColor(r.score);
                        return (
                          <div className="r-item" key={i} title={r.gap}>
                            <div className="r-badge" style={{ background: bg, color: text }}>R{i + 1}</div>
                            <div className="r-info">
                              <div className="r-name">{r.r}</div>
                              <div className="r-status">{r.current_status}</div>
                            </div>
                            <div className="r-score-pill" style={{ background: bg, color: text }}>{r.score}/10</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {agentResults.lca?.lifecycle_stages && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'rgba(251,113,133,0.1)' }}>🌍</div>
                    <div className="panel-title">LCA Carbon Scores by Stage</div>
                    <div className="panel-subtitle">{agentResults.lca.carbon_footprint_estimate_kg_co2}</div>
                  </div>
                  <div className="panel-body">
                    <LcaBarPanel stages={agentResults.lca.lifecycle_stages} />
                    {agentResults.lca.hotspots?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>⚠ Hotspots</div>
                        {agentResults.lca.hotspots.map((h, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#fb7185', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>• {h}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Industrial Symbiosis + ISO */}
            <div className="results-grid" style={{ marginBottom: 24 }}>
              {agentResults.industrial_ecology?.matched_symbiosis && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'rgba(251,113,133,0.1)' }}>🏭</div>
                    <div className="panel-title">Industrial Symbiosis Matches</div>
                    <div className="panel-subtitle">Score: {agentResults.industrial_ecology.symbiosis_score}/100</div>
                  </div>
                  <div className="panel-body">
                    <div className="symbiosis-list">
                      {agentResults.industrial_ecology.matched_symbiosis.map((s, i) => (
                        <div className="symbiosis-item" key={i}>
                          <div>
                            <div className="symbiosis-pair">
                              <span>{s.waste_stream}</span> → {s.partner_industry}
                            </div>
                            <div className="symbiosis-use">{s.use_case}</div>
                            <div style={{ marginTop: 4 }}>
                              <span className={`tag ${s.feasibility === 'high' ? 'tag-low' : s.feasibility === 'medium' ? 'tag-medium' : 'tag-high'}`}>
                                {s.feasibility} feasibility
                              </span>
                              {s.source === 'knowledge_base' && (
                                <span className="tag tag-agent" style={{ marginLeft: 4 }}>KB Match</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="symbiosis-saving">{(s.carbon_saving_kg_per_tonne || 0).toLocaleString()}</div>
                            <div className="symbiosis-saving-label">kg CO₂/t</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {agentResults.industrial_ecology.total_potential_carbon_saving_kg > 0 && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13, color: 'var(--teal-400)', fontFamily: 'var(--font-mono)' }}>
                        Total saving: {agentResults.industrial_ecology.total_potential_carbon_saving_kg.toLocaleString()} kg CO₂
                      </div>
                    )}
                  </div>
                </div>
              )}

              {agentResults.iso_14000?.clause_assessments && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'rgba(251,113,133,0.1)' }}>📋</div>
                    <div className="panel-title">ISO 14001 Compliance</div>
                    <div className="panel-subtitle">
                      {agentResults.iso_14000.certification_readiness} · {agentResults.iso_14000.estimated_months_to_certification}mo
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="clause-list">
                      {agentResults.iso_14000.clause_assessments.map((c, i) => (
                        <div className={`clause-item ${clauseClass(c.status)}`} key={i} title={c.finding}>
                          <div className="clause-status-dot" style={{ background: clauseDotColor(c.status) }} />
                          <div className="clause-name">{c.clause}</div>
                          <div className="clause-status" style={{ color: clauseDotColor(c.status) }}>{c.status}</div>
                        </div>
                      ))}
                    </div>
                    {agentResults.iso_14000.priority_actions?.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Priority Actions</div>
                        {agentResults.iso_14000.priority_actions.map((a, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>→ {a}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SDG Mapping + Carbon Credits */}
            <div className="results-grid" style={{ marginBottom: 24 }}>
              {agentResults.sdg_policy?.sdg_mapping && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>🎯</div>
                    <div className="panel-title">SDG Alignment</div>
                    <div className="panel-subtitle">Overall: {agentResults.sdg_policy.overall_sdg_score}/100</div>
                  </div>
                  <div className="panel-body">
                    <div className="sdg-grid">
                      {agentResults.sdg_policy.sdg_mapping.map((sdg, i) => {
                        const colors = ['#2dd4bf', '#a78bfa', '#fb7185'];
                        const c = colors[i % colors.length];
                        return (
                          <div className="sdg-card" key={i}>
                            <div className="sdg-number" style={{ color: c }}>{sdg.sdg}</div>
                            <div className="sdg-name">{
                              sdg.sdg === 'SDG 11' ? 'Sustainable Cities' :
                              sdg.sdg === 'SDG 12' ? 'Responsible Consumption' :
                              'Climate Action'
                            }</div>
                            <div className="sdg-score-ring">
                              <div className="sdg-ring-bar">
                                <div className="sdg-ring-fill" style={{ width: `${sdg.alignment_score || 0}%`, background: c }} />
                              </div>
                              <div className="sdg-score-val" style={{ color: c }}>{sdg.alignment_score}</div>
                            </div>
                            {sdg.target_actions?.slice(0, 2).map((a, j) => (
                              <div key={j} style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>→ {a}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(45,212,191,0.1)' }}>💰</div>
                  <div className="panel-title">Carbon Credit Opportunity</div>
                  <div className="panel-subtitle">India CCTS 2023</div>
                </div>
                <div className="panel-body">
                  {agentResults.sdg_policy?.carbon_credits && (
                    <>
                      <div className="credit-box" style={{ marginBottom: 16 }}>
                        <div className="credit-icon">🌱</div>
                        <div className="credit-info">
                          <div className="credit-label">Estimated Annual Value</div>
                          <div className="credit-value">
                            ₹{(agentResults.sdg_policy.carbon_credits.estimated_annual_value_inr || 0).toLocaleString()}
                          </div>
                          <div className="credit-sub">
                            {agentResults.sdg_policy.carbon_credits.estimated_annual_credits} credits/year · Eligible: {agentResults.sdg_policy.carbon_credits.eligible ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                      {agentResults.sdg_policy.carbon_credits.eligible_interventions?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Eligible Interventions</div>
                          {agentResults.sdg_policy.carbon_credits.eligible_interventions.map((ei, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>→ {ei}</div>
                          ))}
                        </div>
                      )}
                      {agentResults.sdg_policy.bangalore_specific?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Bangalore/Karnataka Specific</div>
                          {agentResults.sdg_policy.bangalore_specific.map((b, i) => (
                            <div key={i} style={{ fontSize: 12, color: '#a78bfa', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>→ {b}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Roadmap */}
            {synthesis.roadmap && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(251,191,36,0.1)' }}>🗺</div>
                  <div className="panel-title">Implementation Roadmap</div>
                </div>
                <div className="panel-body">
                  <div className="roadmap-grid">
                    <div className="roadmap-phase" style={{ borderTopColor: '#fb7185' }}>
                      <div className="roadmap-phase-label" style={{ color: '#fb7185' }}>0–3 Months</div>
                      <div className="roadmap-items">
                        {(synthesis.roadmap.immediate_0_3_months || []).map((a, i) => (
                          <div className="roadmap-item" key={i} style={{ color: '#fb7185' }}>{a}</div>
                        ))}
                      </div>
                    </div>
                    <div className="roadmap-phase" style={{ borderTopColor: '#fbbf24' }}>
                      <div className="roadmap-phase-label" style={{ color: '#fbbf24' }}>3–12 Months</div>
                      <div className="roadmap-items">
                        {(synthesis.roadmap.short_term_3_12_months || []).map((a, i) => (
                          <div className="roadmap-item" key={i} style={{ color: '#fbbf24' }}>{a}</div>
                        ))}
                      </div>
                    </div>
                    <div className="roadmap-phase" style={{ borderTopColor: '#2dd4bf' }}>
                      <div className="roadmap-phase-label" style={{ color: '#2dd4bf' }}>1–3 Years</div>
                      <div className="roadmap-items">
                        {(synthesis.roadmap.long_term_1_3_years || []).map((a, i) => (
                          <div className="roadmap-item" key={i} style={{ color: '#2dd4bf' }}>{a}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conflicts */}
            {synthesis.conflicts_detected?.length > 0 && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(251,191,36,0.1)' }}>⚡</div>
                  <div className="panel-title">Agent Conflicts & Resolutions</div>
                  <div className="panel-subtitle">{synthesis.conflicts_detected.length} detected</div>
                </div>
                <div className="panel-body">
                  <div className="conflict-list">
                    {synthesis.conflicts_detected.map((c, i) => (
                      <div className="conflict-item" key={i}>
                        <div className="conflict-header">
                          <span>⚠️</span>
                          <div className="conflict-title">{c.type?.replace(/_/g, ' ')}</div>
                        </div>
                        <div className="conflict-body">{c.description}</div>
                        {c.resolution && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#2dd4bf' }}>✓ Resolution: {c.resolution}</div>
                        )}
                      </div>
                    ))}
                    {synthesis.conflict_resolutions?.map((cr, i) => (
                      <div className="conflict-item" key={`cr-${i}`}>
                        <div className="conflict-header">
                          <span>🔀</span>
                          <div className="conflict-title">{cr.conflict}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#2dd4bf', marginTop: 6 }}>✓ {cr.resolution}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Empty state (before any run) */}
        {!hasAnyActivity && !error && (
          <div className="empty-state">
            <div className="empty-icon">🌿</div>
            <div className="empty-title">Ready to Audit</div>
            <div className="empty-desc">Describe a product or supply chain above and hit Run Audit.<br />Six AI agents will analyze it in real time.</div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>MACEA</span>
        <span>·</span>
        <span>Multi-Agent Circular Economy Auditor</span>
        <span>·</span>
        <span>CSITSS 2026</span>
        <span>·</span>
        <span style={{ color: 'var(--teal-400)' }}>ISO 14000 · SDG 11/12/13 · 10R Framework</span>
      </footer>
    </div>
  );
}
