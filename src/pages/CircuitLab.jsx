import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, PlayCircle, Sparkles } from 'lucide-react';
import CircuitWire from '../components/CircuitWire';
import GateSelector from '../components/GateSelector';
import ResultsPanel from '../components/ResultsPanel';
import { createGate, normalizeCircuit } from '../utils/circuitUtils';
import { explainCircuit, runSimulation } from '../services/simulationService';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

function CircuitLab() {
  const { token, logout } = useAuth();
  const [qubits, setQubits] = useState(2);
  const [shots, setShots] = useState(1000);
  const [selectedGate, setSelectedGate] = useState('H');
  const [gates, setGates] = useState([]);
  const [targetQubit, setTargetQubit] = useState(0);
  const [controlQubit, setControlQubit] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [explanation, setExplanation] = useState('Add or remove gates to explore the circuit.');

  useEffect(() => {
    setGates((current) => normalizeCircuit(current, qubits));
    setTargetQubit((current) => Math.min(current, qubits - 1));
    setControlQubit((current) => Math.min(current, qubits - 1));
    setSimulation(null);
  }, [qubits]);

  const canAddGate = useMemo(() => {
    if (selectedGate === 'CNOT') {
      return targetQubit !== controlQubit && controlQubit !== undefined;
    }
    return true;
  }, [controlQubit, selectedGate, targetQubit]);

  const handleAddGate = () => {
    if (!canAddGate) {
      setError('A CNOT gate cannot use the same qubit as both control and target.');
      return;
    }

    setError('');
    setSimulation(null);
    const nextGate = createGate({
      gateType: selectedGate,
      target: Number(targetQubit),
      control: selectedGate === 'CNOT' ? Number(controlQubit) : null,
      position: gates.length,
    });

    setGates((current) => [...current, nextGate]);
  };

  const handleRemoveGate = () => {
    setGates((current) => current.slice(0, -1));
    setError('');
    setSimulation(null);
  };

  const handleReset = () => {
    setGates([]);
    setError('');
    setSimulation(null);
    setExplanation('The circuit has been reset.');
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    try {
      const next = await runSimulation({ gates, qubits, shots, token });
      setSimulation(next);
      setExplanation(next.explanation);
      try {
        await authService.recordActivity(token, {
          event_type: 'circuit_simulation',
          gates: gates.map((gate) => gate.gateType),
          qubits,
          success: true,
        });
      } catch (activityError) {
        if (activityError.status === 401) {
          logout();
          return;
        }
        setError(`Simulation succeeded, but activity could not be recorded: ${activityError.message}`);
      }
    } catch (simulationError) {
      if (simulationError.status === 401) {
        logout();
        return;
      }
      setSimulation(null);
      setError(
        simulationError.status
          ? simulationError.message
          : 'Simulation unavailable: make sure the Flask backend is running at http://127.0.0.1:5000.',
      );
      try {
        await authService.recordActivity(token, {
          event_type: 'circuit_simulation',
          gates: gates.map((gate) => gate.gateType),
          qubits,
          success: false,
        });
      } catch (activityError) {
        if (activityError.status === 401) {
          logout();
          return;
        }
        setError(`Simulation failed and its activity could not be recorded: ${activityError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = () => {
    setExplanation(explainCircuit({ gates, qubits }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <GateSelector
          selectedGate={selectedGate}
          setGateType={setSelectedGate}
          onAdd={handleAddGate}
          onRemove={handleRemoveGate}
          onReset={handleReset}
          qubits={qubits}
          setQubits={setQubits}
          shots={shots}
          setShots={setShots}
          canAdd={canAddGate}
        />

        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Circuit workspace</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{gates.length} gate(s)</span>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Target qubit
              <select
                value={targetQubit}
                onChange={(event) => setTargetQubit(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                {[...Array(qubits)].map((_, index) => (
                  <option key={index} value={index}>q{index}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Control qubit
              <select
                value={controlQubit}
                onChange={(event) => setControlQubit(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                {[...Array(qubits)].map((_, index) => (
                  <option key={index} value={index}>q{index}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {[...Array(qubits)].map((_, index) => (
              <CircuitWire key={index} wireIndex={index} gates={gates} />
            ))}
          </div>

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <ResultsPanel simulation={simulation} loading={loading} error={error} />

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Circuit explanation</h3>
              <BrainCircuit className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-sm leading-7 text-slate-700">{explanation}</p>
            <button type="button" className="primary-button mt-5" onClick={handleExplain}>
              Explain My Circuit
            </button>
          </div>

          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Run preview</h3>
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <button type="button" className="primary-button w-full gap-2" onClick={handleSimulate}>
              <PlayCircle className="h-4 w-4" />
              {loading ? 'Simulating…' : 'Run Simulation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircuitLab;
