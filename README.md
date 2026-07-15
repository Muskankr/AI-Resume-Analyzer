<div align="center">

# AI Resume Analyzer

### *An enterprise-grade automated platform to parse resumes, evaluate ATS scores, extract technical skills, and generate contextual recommendations.*

[![GitHub license](https://img.shields.io/github/license/Muskankr/AI-Resume-Analyzer?style=for-the-badge&color=34d399)](https://github.com/Muskankr/AI-Resume-Analyzer/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Muskankr/AI-Resume-Analyzer?style=for-the-badge&color=f43f5e)](https://github.com/Muskankr/AI-Resume-Analyzer/issues)
[![GitHub stars](https://img.shields.io/github/stars/Muskankr/AI-Resume-Analyzer?style=for-the-badge&color=fbbf24)](https://github.com/Muskankr/AI-Resume-Analyzer/stargazers)
[![GitHub contributors](https://img.shields.io/github/contributors/Muskankr/AI-Resume-Analyzer?style=for-the-badge&color=818cf8)](https://github.com/Muskankr/AI-Resume-Analyzer/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge&color=38bdf8)](https://github.com/Muskankr/AI-Resume-Analyzer/pulls)
[![ECSoC'26](https://img.shields.io/badge/Program-ECSoC'26-orange?style=for-the-badge)](https://github.com/Muskankr/AI-Resume-Analyzer)

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#project-preview">Project Preview</a> •
  <a href="#architecture--data-flow">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation--setup">Installation & Setup</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#contributors">Contributors</a>
</p>
</div>

---

## Key Features

- **Flexible Multi-Format Parsing** — Instant text extraction from PDF resumes (`pdfplumber`) and Word `.docx` resumes (`python-docx`), all fed through the same     downstream analysis pipeline.
- **ATS Optimizer & Scoring Engine** — High-performance scoring algorithm that parses resumes against technical standard keywords.
- **Contextual Skill Extraction** — Detects core programming languages, frameworks, developer tools, database engines, and libraries.
- **Dynamic Feedback Generation** — Yields smart suggestions recommending targeted certifications, technologies, and formatting changes.
- **Premium Glassmorphic UI** — Fully responsive, beautiful interface with active state indicators, hover metrics, and smooth transitions built using Bootstrap 5.

---

## Project Preview

<div align="center">
  <img src="client/public/ui.png" alt="Application Interface Preview" width="850" style="border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);"/>
</div>

---

## Architecture & Data Flow

```text
 ┌──────────────┐         POST /api/upload/         ┌─────────────────┐
 │              │ ────────────────────────────────> │                 │
 │ React Client │                                   │ Django Backend  │
 │  (Bootstrap) │ <──────────────────────────────── │   (REST API)    │
 └──────────────┘           Analysis JSON           └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ PDF / DOCX Parser│
                                                    └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ Keyword Matches │
                                                    │   & ATS Engine  │
                                                    └─────────────────┘
```

---

## Tech Stack

### Client (Frontend)
* **Framework**: React 19 (Vite boilerplate)
* **Language**: TypeScript
* **Styling**: Bootstrap 5 + Vanilla CSS Variables (Glassmorphism theme)
* **API Handler**: Axios

### Server (Backend)
* **Framework**: Django REST Framework (DRF)
* **Language**: Python 3.10+
* **CORS Management**: django-cors-headers
* **Text Extractors**: PDFPlumber (PDF) + python-docx (DOCX)

---

## Project Structure

```text
ai-resume-analyzer/
├── client/                 # React frontend application
│   ├── public/             # Static public assets (ui.png, favicon, etc.)
│   ├── src/
│   │   ├── assets/         # Images, logos, and Vite assets
│   │   ├── App.css         # Component layout configurations
│   │   ├── App.tsx         # Application entry view & core client logic
│   │   ├── index.css       # Core stylesheets and variables
│   │   └── main.tsx        # DOM Renderer
│   ├── package.json        # Node modules and dependency matrix
│   └── tsconfig.json       # TypeScript compiler settings
│
├── server/                 # Django REST API backend
│   ├── resume_analyzer/    # Main settings, routing, and configurations
│   ├── analyzer/           # App endpoints, models, viewsets, and migrations
│   │   ├── migrations/     # Database migration schema
│   │   ├── models.py       # Resume database models
│   │   ├── serializers.py  # Django REST serialization maps
│   │   ├── urls.py         # Endpoint routes
│   │   └── views.py        # Resume parsing & scoring logic
│   ├── resumes/            # Storage path for processed resumes
│   ├── requirements.txt    # Python dependencies list
│   └── manage.py           # Django command utility
│
└── README.md
```

---

## Installation & Setup

### Prerequisites

Ensure you have the following packages installed on your local development machine:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Git**

---

### Clone the Repository

```bash
git clone https://github.com/Muskankr/AI-Resume-Analyzer.git
```

---

### Server Setup (Django)

We recommend installing dependencies inside a secure Python virtual environment:

```bash
# Navigate to server directory
cd server

# Initialize a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Create local environment configuration from the example
# Windows:
copy .env.example .env
# macOS/Linux:
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Execute database migrations
python manage.py migrate

# Spin up Django development server
python manage.py runserver
```
The API server starts on: `http://127.0.0.1:8000/`

#### Server Environment Variables
| Variable | Description | Default / Placeholder |
| :--- | :--- | :--- |
| `SECRET_KEY` | Secret key for Django cryptographic signing | `django-insecure-local-development-secret-key-change-me` |
| `DEBUG` | Set to `True` for development, `False` for production | `True` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed host/domain names | `localhost,127.0.0.1,127.0.0.1:8000` |

---

### Client Setup (React)

```bash
# Open a new terminal instance and navigate to client directory
cd client

# Create local environment configuration from the example
# Windows:
copy .env.example .env
# macOS/Linux:
cp .env.example .env

# Install packages
npm install

# Run the local Vite web server
npm run dev
```
The client application will run at: `http://localhost:5173/`

#### Client Environment Variables
| Variable | Description | Default / Placeholder |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | The URL of the Django backend REST API server | `http://127.0.0.1:8000` |

---

## API Reference

### Parse Resume File

Validates and parses an uploaded resume, matches standard technical keywords, calculates scores, and returns suggestions.

- **Endpoint:** `/api/upload/`
- **Method:** `POST`
- **Payload Format:** `multipart/form-data`

#### Parameters
| Name | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `file` | `binary (PDF)` | **Yes** | The document to analyze |

#### Sample Success JSON Response (`200 OK`)
```json
{
  "score": 80,
  "skills_found": [
    "python",
    "django",
    "react",
    "git"
  ],
  "suggestions": [
    "Mention Django experience",
    "Add frontend skills like React"
  ]
}
```

---

## Rate Limiting

The resume upload endpoint (`POST /api/upload/`) is throttled per client IP using DRF's `SimpleRateThrottle`.

| Setting | Default | Description |
| :--- | :--- | :--- |
| `RESUME_UPLOAD_RATE` | `10/hour` | Max requests per IP. Format: `<n>/hour`, `<n>/day`, `<n>/min` |

To change the limit, set `RESUME_UPLOAD_RATE` in your `server/.env`:

```env
RESUME_UPLOAD_RATE=20/hour
```

When the limit is exceeded, the API returns:

```json
// HTTP 429 Too Many Requests
// Retry-After: <seconds>
{ "detail": "Request was throttled. Expected available in <N> seconds." }
```

---

## Roadmap

- [x] **DOCX Document Parsing** — Integrate `python-docx` to support Word resume parser pipelines. #29
- [ ] **Dark Mode Toggle** — Implement user-theme selections with CSS theme tokens persisted in `localStorage`.
- [ ] **Target Job Role Comparison** — Match resume skill outputs directly against selectable target job roles.
- [ ] **Persistent User Dashboard** — Save and render a timeline history of past scores using client-side indexing.
- [ ] **Upload Interactive States** — Dash borders and overlay drop indicators to make file uploads feel extremely natural.

---

## Contributing

We welcome contributions of all levels under the **ECSoC'26** program!

1. **Fork** the repository on GitHub.
2. Clone your fork and create a checkout branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes with standard semantic commit messages (e.g. `feat: ...`, `fix: ...`).
4. Push changes to your fork and create a **Pull Request (PR)** targeting the upstream `main` branch.

Please review active issues before creating duplicates, and always link open issues to your Pull Request!

---

## Contributors

### Maintainer
- **Muskan Kumari** ([@Muskankr](https://github.com/Muskankr)) — Project Creator & Lead Maintainer

### Active Contributors Grid
A huge thanks to all the developers who have contributed code, fixed bugs, and improved documentation!

<a href="https://github.com/Muskankr/AI-Resume-Analyzer/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Muskankr/AI-Resume-Analyzer" alt="Contributors Avatars Grid" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 5px; background: rgba(255, 255, 255, 0.03);"/>
</a>

---

<div align="center">
  Show your support by leaving a ⭐ on this repository!
</div>
