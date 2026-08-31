import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '../Button';
import './AtsSimulator.css';

interface Profile {
  id: string;
  name: string;
  description: string;
}

interface SimulationResult {
  platform: string;
  description: string;
  compatibility_score: number;
  detected_sections: string[];
  warnings: string[];
  recommendations: string[];
  is_approximation: boolean;
}

interface AtsSimulatorProps {
  analysisId: number;
}

export const AtsSimulator: React.FC<AtsSimulatorProps> = ({ analysisId }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ profiles: Profile[] }>('/api/ats-simulator/profiles/')
      .then(res => {
        setProfiles(res.data.profiles);
        // Pre-select all by default
        setSelectedProfiles(new Set(res.data.profiles.map(p => p.id)));
      })
      .catch(err => {
        setError('Failed to load ATS profiles.');
      })
      .finally(() => setLoadingProfiles(false));
  }, []);

  const toggleProfile = (id: string) => {
    const newSet = new Set(selectedProfiles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedProfiles(newSet);
  };

  const runSimulation = () => {
    if (selectedProfiles.size === 0) {
      setError('Please select at least one platform to simulate.');
      return;
    }
    
    setError('');
    setRunning(true);
    setSimulations([]);
    
    const query = Array.from(selectedProfiles).join(',');
    
    api.get<{ simulations: SimulationResult[] }>(`/api/history/${analysisId}/ats-simulate/?platforms=${query}`)
      .then(res => {
        setSimulations(res.data.simulations);
      })
      .catch(err => {
        setError('Simulation failed to run. Please try again.');
      })
      .finally(() => setRunning(false));
  };

  if (loadingProfiles) return <div className="ats-sim-loading">Loading Simulator Engine...</div>;

  return (
    <div className="ats-simulator-container">
      <div className="ats-sim-header">
        <h3>ATS Simulator Mode <span>(Approximation)</span></h3>
        <p>This tool simulates how different enterprise ATS platforms might parse your resume based on documented behaviors. <strong>These are not official guarantees.</strong></p>
      </div>
      
      {error && <div className="ats-sim-error">{error}</div>}
      
      <div className="ats-sim-controls">
        <h4>Select Platforms to Simulate:</h4>
        <div className="ats-sim-profiles">
          {profiles.map(p => (
            <label key={p.id} className="ats-profile-checkbox">
              <input 
                type="checkbox" 
                checked={selectedProfiles.has(p.id)} 
                onChange={() => toggleProfile(p.id)} 
              />
              <div className="ats-profile-info">
                <strong>{p.name}</strong>
                <span>{p.description}</span>
              </div>
            </label>
          ))}
        </div>
        
        <Button onClick={runSimulation} disabled={running || selectedProfiles.size === 0}>
          {running ? 'Running Simulations...' : 'Run Simulation'}
        </Button>
      </div>

      {simulations.length > 0 && (
        <div className="ats-sim-results">
          <h4>Simulation Results</h4>
          <div className="ats-sim-results-grid">
            {simulations.map((sim, idx) => (
              <div key={idx} className="ats-sim-card">
                <div className="ats-sim-card-header">
                  <h5>{sim.platform}</h5>
                  <div className={`ats-sim-score ${sim.compatibility_score >= 80 ? 'high' : sim.compatibility_score >= 50 ? 'medium' : 'low'}`}>
                    {sim.compatibility_score}% Compatible
                  </div>
                </div>
                
                <div className="ats-sim-section">
                  <h6>Detected Sections</h6>
                  <ul>
                    {sim.detected_sections.map((s, i) => <li key={i}>{s}</li>)}
                    {sim.detected_sections.length === 0 && <li className="empty-li">None clearly detected</li>}
                  </ul>
                </div>
                
                {sim.warnings.length > 0 && (
                  <div className="ats-sim-section warnings">
                    <h6>Parsing Issues</h6>
                    <ul>
                      {sim.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                
                {sim.recommendations.length > 0 && (
                  <div className="ats-sim-section recommendations">
                    <h6>Recommendations</h6>
                    <ul>
                      {sim.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                <div className="ats-sim-disclaimer">
                  * Based on publicly documented parsing quirks.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
