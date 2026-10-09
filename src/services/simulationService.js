import { apiRequest } from './authService';

export const runSimulation = ({ gates, qubits, shots, token }) => apiRequest('/simulation/run', {
  method: 'POST',
  token,
  body: JSON.stringify({
    num_qubits: qubits,
    gates: gates.map(({ gateType, control, target }) => ({
      type: gateType,
      ...(gateType === 'CNOT' ? { control } : {}),
      target,
    })),
    shots,
  }),
});

export const explainCircuit = ({ gates = [], qubits = 1 }) => {
  if (!gates.length) {
    return 'The circuit is empty. All qubits are initialized to |0⟩. Add a gate to change the state.';
  }

  const details = gates.map((gate) => {
    if (gate.gateType === 'CNOT') {
      return `CNOT uses q${gate.control} as control and q${gate.target} as target.`;
    }
    if (gate.gateType === 'H') {
      return `H on q${gate.target} creates superposition.`;
    }
    return `X on q${gate.target} flips its |0⟩/|1⟩ state.`;
  }).join(' ');

  return `This ${qubits}-qubit circuit applies the gates in order. ${details}`;
};
