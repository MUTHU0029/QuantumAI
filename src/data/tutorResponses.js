export const tutorResponses = {
  default: 'Quantum concepts are easier to understand when we connect them to everyday examples. Ask me about qubits, gates, superposition, or entanglement.',
  qubit: 'A qubit is a quantum bit. It can be in a superposition of |0> and |1> before measurement, while a classical bit is always either 0 or 1.',
  hadamard: 'The Hadamard gate creates superposition by transforming |0> into (|0> + |1>) / √2 and |1> into (|0> - |1>) / √2.',
  superposition: 'Superposition means a qubit can represent multiple possibilities at once before measurement. Measurement chooses one outcome based on probability amplitudes.',
  cnot: 'A CNOT gate uses one qubit as the control and another as the target. When the control is |1>, it flips the target qubit.',
  entanglement: 'Entanglement links qubits so that their measurement outcomes are correlated. A Bell state is a classic beginner example.',
};
