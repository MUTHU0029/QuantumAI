from flask import Blueprint, current_app, jsonify, request

from ..auth_tokens import roles_required
from ..errors import api_error

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")
MAX_GATES = 100
MAX_SHOTS = 10_000


def _validate_request(payload):
    if not isinstance(payload, dict):
        return None, "A JSON object is required."

    num_qubits = payload.get("num_qubits")
    if isinstance(num_qubits, bool) or not isinstance(num_qubits, int) or not 1 <= num_qubits <= 3:
        return None, "num_qubits must be an integer from 1 to 3."

    shots = payload.get("shots", 1000)
    if isinstance(shots, bool) or not isinstance(shots, int) or not 1 <= shots <= MAX_SHOTS:
        return None, f"shots must be an integer from 1 to {MAX_SHOTS}."

    gates = payload.get("gates", [])
    if not isinstance(gates, list) or len(gates) > MAX_GATES:
        return None, f"gates must be a list containing at most {MAX_GATES} gates."

    validated_gates = []
    for index, gate in enumerate(gates):
        if not isinstance(gate, dict):
            return None, f"Gate {index + 1} must be a JSON object."
        gate_type = gate.get("type")
        if not isinstance(gate_type, str) or gate_type not in {"X", "H", "CNOT"}:
            return None, f"Gate {index + 1} has an unsupported type."
        target = gate.get("target")
        if isinstance(target, bool) or not isinstance(target, int) or not 0 <= target < num_qubits:
            return None, f"Gate {index + 1} target must identify a qubit from 0 to {num_qubits - 1}."
        validated_gate = {"type": gate_type, "target": target}
        if gate_type == "CNOT":
            control = gate.get("control")
            if isinstance(control, bool) or not isinstance(control, int) or not 0 <= control < num_qubits:
                return None, f"Gate {index + 1} control must identify a qubit from 0 to {num_qubits - 1}."
            if control == target:
                return None, f"Gate {index + 1} control and target must be different qubits."
            validated_gate["control"] = control
        elif "control" in gate:
            return None, f"Gate {index + 1} only supports control for CNOT."
        validated_gates.append(validated_gate)

    return {"num_qubits": num_qubits, "gates": validated_gates, "shots": shots}, None


def _explanation(num_qubits, gates):
    if (
        len(gates) == 2
        and gates[0]["type"] == "H"
        and gates[1]["type"] == "CNOT"
        and gates[0]["target"] == gates[1]["control"]
    ):
        control = gates[1]["control"]
        target = gates[1]["target"]
        return (
            f"H on q{control} creates an equal superposition, then CNOT uses q{control} "
            f"to flip q{target}. These two qubits form an entangled Bell state, so "
            "measurement produces matching 0/1 values for the pair. Any other qubits "
            "remain in |0⟩."
        )
    if not gates:
        return "No gates were applied. Every qubit started in |0⟩ and remains in |0⟩."

    descriptions = []
    for gate in gates:
        if gate["type"] == "H":
            descriptions.append(f"H on q{gate['target']} creates superposition.")
        elif gate["type"] == "X":
            descriptions.append(f"X on q{gate['target']} flips its |0⟩/|1⟩ state.")
        else:
            descriptions.append(
                f"CNOT uses q{gate['control']} as control and q{gate['target']} as target."
            )
    return f"{num_qubits} qubit(s) started in |0⟩. " + " ".join(descriptions)


@simulation_bp.post("/run")
@roles_required("student")
def run_simulation():
    values, error = _validate_request(request.get_json(silent=True))
    if error:
        return api_error("invalid_circuit", error, 400)

    try:
        from qiskit import QuantumCircuit
        from qiskit.primitives import StatevectorSampler
        from qiskit.quantum_info import Statevector
    except ModuleNotFoundError:
        current_app.logger.exception("Qiskit is not installed in the backend environment.")
        return api_error(
            "simulation_unavailable",
            "Qiskit is missing. Install backend requirements and restart Flask.",
            503,
        )

    num_qubits = values["num_qubits"]
    circuit = QuantumCircuit(num_qubits)
    for gate in values["gates"]:
        if gate["type"] == "X":
            circuit.x(gate["target"])
        elif gate["type"] == "H":
            circuit.h(gate["target"])
        else:
            circuit.cx(gate["control"], gate["target"])

    statevector = Statevector.from_instruction(circuit)
    measured_circuit = circuit.copy()
    measured_circuit.measure_all()
    sampler = StatevectorSampler()
    result = sampler.run([measured_circuit], shots=values["shots"]).result()[0]
    raw_counts = result.data.meas.get_counts()

    counts = {
        format(int(bitstring.replace(" ", ""), 2), f"0{num_qubits}b"): count
        for bitstring, count in raw_counts.items()
    }
    probabilities = {
        state: round(count / values["shots"] * 100, 2)
        for state, count in counts.items()
    }
    statevector_data = [
        {
            "state": format(index, f"0{num_qubits}b"),
            "real": round(float(amplitude.real), 10),
            "imaginary": round(float(amplitude.imag), 10),
        }
        for index, amplitude in enumerate(statevector.data)
        if abs(amplitude) > 1e-10
    ]

    circuit_text = measured_circuit.draw(output="text").single_string()
    return jsonify(
        {
            "success": True,
            "num_qubits": num_qubits,
            "gates": values["gates"],
            "shots": values["shots"],
            "statevector": statevector_data,
            "counts": counts,
            "probabilities": probabilities,
            "explanation": _explanation(num_qubits, values["gates"]),
            "circuit": circuit_text,
            "bit_order": "Displayed bitstrings are q(n-1) ... q1 q0, left to right; q0 is the rightmost bit.",
        }
    ), 200
