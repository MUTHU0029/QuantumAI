export const gateMeta = {
  X: { label: 'X', description: 'Flips a qubit state between |0> and |1>.' },
  H: { label: 'H', description: 'Creates a superposition from a basis state.' },
  CNOT: { label: 'CNOT', description: 'Uses a control qubit to flip a target qubit when the control is |1>.' },
};

export const createGate = ({ gateType, target, control = null, position = 0 }) => ({
  id: `${gateType}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
  gateType,
  target,
  control,
  position,
});

export const normalizeCircuit = (gates, qubits) => {
  return gates.filter((gate) => {
    const targetValid = Number(gate.target) >= 0 && Number(gate.target) < qubits;
    const controlValid = gate.control === null || (Number(gate.control) >= 0 && Number(gate.control) < qubits);
    return targetValid && controlValid;
  });
};

export const explainSelectedGate = (gateType) => gateMeta[gateType]?.description || 'No explanation available yet.';
