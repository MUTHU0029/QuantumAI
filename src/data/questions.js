export const questions = [
  {
    id: 'qubit-basics',
    question: 'Which statement best describes a qubit?',
    options: [
      'A qubit is always either 0 or 1 at every step.',
      'A qubit can be in a superposition before measurement.',
      'A qubit only exists in a classical computing system.',
      'A qubit cannot be manipulated by gates.',
    ],
    answer: 1,
    explanation: 'A qubit can exist in a superposition of basis states before measurement, which is a fundamental difference from a classical bit.',
  },
  {
    id: 'x-gate',
    question: 'What does the X gate do to a qubit?',
    options: [
      'It rotates the qubit by 90 degrees.',
      'It flips the state between |0> and |1>.',
      'It measures the qubit instantly.',
      'It applies a control dependency to another qubit.',
    ],
    answer: 1,
    explanation: 'The X gate acts like a quantum NOT. It flips the state of a qubit from |0> to |1> and vice versa.',
  },
  {
    id: 'hadamard',
    question: 'Why is the Hadamard gate important?',
    options: [
      'It creates superposition when applied to a basis state.',
      'It always turns a qubit into |1>.',
      'It only works on two-qubit circuits.',
      'It removes entanglement from the system.',
    ],
    answer: 0,
    explanation: 'The Hadamard gate maps a basis state into a superposition state so that measurement outcomes can be probabilistic.',
  },
  {
    id: 'entanglement',
    question: 'What happens in a Bell state?',
    options: [
      'The qubits are independent and separate.',
      'Measuring one qubit does not affect the other.',
      'The pair is entangled and their measurement outcomes are correlated.',
      'Only one qubit exists in the system.',
    ],
    answer: 2,
    explanation: 'Bell states are entangled states where the qubits share correlated information, producing dependent outcomes when measured.',
  },
];
