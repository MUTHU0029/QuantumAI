const previewLabels = {
  X: 'A bit-flip through the X gate',
  H: 'A superposition created with the Hadamard gate',
  CNOT: 'A controlled flip using the control and target qubits',
};

export const simulateCircuitPreview = ({ gates = [], qubits = 1, shots = 100 }) => {
  const probabilities = Array.from({ length: qubits }, (_, index) => ({
    name: `q${index}`,
    probability: 50 + (index + 1) * 12,
  }));

  const gateSummary = gates.length
    ? gates.map((gate) => `${gate.gateType} on q${gate.target}`).join(', ')
    : 'No gates configured yet';

  const counts = {
    '00': Math.max(20, Math.round(shots * 0.52)),
    '01': Math.max(15, Math.round(shots * 0.18)),
    '10': Math.max(15, Math.round(shots * 0.17)),
    '11': Math.max(15, Math.round(shots * 0.13)),
  };

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    isPreview: true,
    probabilities: probabilities.map((item, index) => ({
      name: `q${index}`,
      probability: item.probability > 100 ? 100 : item.probability,
    })),
    counts: Object.entries(counts).map(([label, value]) => ({ label, value: Math.round((value / total) * shots) })),
    summary: `Preview simulation for ${qubits} qubit${qubits > 1 ? 's' : ''} and ${gates.length} gate${gates.length === 1 ? '' : 's'}: ${gateSummary}.`,
    expectedResult: gates.length
      ? `This preview is illustrative only. The selected gates suggest an output pattern like: ${gates.map((gate) => previewLabels[gate.gateType] || 'General gate').join(' • ')}`
      : 'Add a gate to begin building the preview circuit.',
    message: 'Preview state only: this frontend demonstrates the circuit workflow and is not connected to a real quantum backend.',
  };
};

export const explainCircuit = ({ gates = [], qubits = 1 }) => {
  if (!gates.length) {
    return 'The circuit is empty. Add a gate to start describing how the system evolves.';
  }

  const details = gates
    .map((gate) => {
      if (gate.gateType === 'CNOT') {
        return `The CNOT gate uses q${gate.control} as control and q${gate.target} as the target so a flip occurs only when q${gate.control} is in the |1> state.`;
      }

      if (gate.gateType === 'H') {
        return `The H gate on q${gate.target} creates superposition and spreads the probability across the basis states.`;
      }

      return `The X gate on q${gate.target} flips the state between |0> and |1>.`;
    })
    .join(' ');

  return `This ${qubits}-qubit circuit is a frontend demonstration. ${details}`;
};

export const runSimulation = async ({ gates, qubits, shots }) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return simulateCircuitPreview({ gates, qubits, shots });
};
