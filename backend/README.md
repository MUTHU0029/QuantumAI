# QuantumLearn backend

Standalone Flask API for the existing React/Vite application. This backend
provides MongoDB connectivity, password-based authentication, JWTs, and
role-protected dashboard endpoints.

## Windows PowerShell setup

From the repository root:

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend\.env` with the MongoDB Atlas connection URI, database name, and a
random JWT secret of at least 32 bytes. Do not commit `.env`. For example, make
a development secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

To enable the Gemini-powered AI Tutor, set `GEMINI_API_KEY` in
`backend\.env` to a valid API key and set `ROUTER_MODEL=gemini-3.1-flash-lite`.
Keep the key in this backend-only file; never put it in a Vite/frontend
environment variable. Restart Flask after changing `.env`.

Start the API:

```powershell
python run.py
```

The API listens on `http://127.0.0.1:5000`. The health endpoint pings the
configured MongoDB database and returns HTTP 503 if MongoDB is unreachable.
CORS is limited to the single origin configured in `FRONTEND_ORIGIN` (the Vite
default is `http://localhost:5173`).
The frontend defaults to `http://127.0.0.1:5000/api`; if the backend runs
elsewhere, set `VITE_API_BASE_URL` in a Vite `.env.local` file at the repository
root and restart the Vite server.

## Local Qiskit circuit simulation

`POST /api/simulation/run` runs locally with Qiskit's `Statevector` and
`StatevectorSampler`; it does not use an API key, paid service, or cloud
quantum computer. The endpoint requires a student bearer token, accepts 1–3
qubits and up to 10,000 shots, and supports X, H, and CNOT gates. The Circuit
Lab sends the request automatically when **Run Simulation** is selected.

Example request body:

```json
{
  "num_qubits": 2,
  "gates": [
    { "type": "H", "target": 0 },
    { "type": "CNOT", "control": 0, "target": 1 }
  ],
  "shots": 1000
}
```

The response contains the measured circuit, final statevector amplitudes,
shot counts, measured probabilities, and an explanation. Count labels are
ordered `q(n-1) ... q1 q0` from left to right, following Qiskit's classical
bitstring convention (q0 is the rightmost bit).

The simulator dependency is installed by the existing backend dependency
command, from the repository root:

```powershell
Set-Location .\backend
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python run.py
```

Create the one initial administrator from a local terminal, after configuring
`.env` and installing the dependencies:

```powershell
flask --app run create-admin
```

The command prompts for an email, name, and password (hidden with confirmation)
and refuses to create another administrator if one already exists. There is no
public administrator-registration endpoint.

Seed the original sample lessons and exercises into MongoDB once so the
existing student learning pages continue to work with live published content:

```powershell
flask --app run seed-content
```

This command inserts the starter documents only when the corresponding
collection is empty; it does not overwrite administrator-managed content.

## Authentication endpoints

- `POST /api/auth/register`: accepts `name`, `email`, and `password`; roles are
  assigned by the server as `student`.
- `POST /api/auth/login`: returns a signed, short-lived bearer token and
  password-free user profile.
- `GET /api/auth/me`: requires `Authorization: Bearer <token>`.
- `GET /api/student/dashboard`: requires a student token.
- `GET /api/admin/dashboard`: requires an administrator token.
- `/api/admin/students`, `/api/admin/lessons`, `/api/admin/exercises`,
  `/api/admin/analytics`, `/api/admin/circuits`, and `/api/admin/tutor`:
  administrator-only dashboard operations.
- `GET /api/student/lessons` and `/api/student/exercises`: return published
  learning content; correct exercise answers are never sent to students.
- `POST /api/student/tutor/chat`: requires a student bearer token and asks the
  configured Gemini model to generate a quantum-learning answer. The question
  is sent to Google Gemini and full tutor conversations are not persisted.
- `POST /api/student/activity` and `POST /api/student/exercises/<id>/submit`:
  record completion, score, circuit gate counts, tutor topic counts, and
  opt-in explanation reports without saving full tutor conversations or circuit
  gate sequences.

The API returns HTTP 401 for a missing or invalid token, HTTP 403 for a
role mismatch, HTTP 409 for duplicate registration, and structured JSON errors.

Run the API tests from the `backend` directory with:

```powershell
python -m unittest discover -s tests -v
```

## Manual API checks (PowerShell)

In a second PowerShell window, run the initial-admin command once and start
student registration:

```powershell
Set-Location .\backend
.\.venv\Scripts\Activate.ps1
flask --app run create-admin
```

With the API running in the first window:

```powershell
$studentBody = @{
  name = "Sample Student"
  email = "student@example.com"
  password = "student-password-123"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5000/api/auth/register `
  -ContentType "application/json" -Body $studentBody

$studentLogin = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:5000/api/auth/login `
  -ContentType "application/json" `
  -Body (@{ email = "student@example.com"; password = "student-password-123" } | ConvertTo-Json)
$studentToken = $studentLogin.token
```

Use the email and password entered into `create-admin` to check administrator
login, and verify authorization with both tokens:

```powershell
$adminLogin = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:5000/api/auth/login `
  -ContentType "application/json" `
  -Body (@{ email = "your-admin-email"; password = "your-admin-password" } | ConvertTo-Json)
$adminToken = $adminLogin.token

Invoke-RestMethod -Uri http://127.0.0.1:5000/api/student/dashboard `
  -Headers @{ Authorization = "Bearer $studentToken" }
Invoke-RestMethod -Uri http://127.0.0.1:5000/api/admin/dashboard `
  -Headers @{ Authorization = "Bearer $adminToken" }
```

The student token must receive HTTP 403 from the admin dashboard. Requests to
either dashboard without an `Authorization` header must receive HTTP 401.
`/api/auth/register` also rejects a supplied `role` field, even if its value is
`admin`.
