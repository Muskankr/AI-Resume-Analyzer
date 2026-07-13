# 🚀 AI Resume Analyzer

An **AI-powered web application** that analyzes resumes and provides an **ATS (Applicant Tracking System) score**, detects **technical skills**, and gives **actionable suggestions** to improve the resume.

This project helps students and job seekers understand how well their resume performs for automated recruitment systems and how they can improve it.

---

## ✨ Features

* 📄 **Resume Upload** – Upload a resume in PDF format
* 📊 **ATS Resume Score** – Get a score out of 100 based on resume quality
* 🧠 **Skill Extraction** – Detects technical skills present in the resume
* 💡 **Improvement Suggestions** – Provides suggestions to improve the resume
* 🎨 **Modern UI** – Clean and responsive React interface
* ⚡ **Fast Analysis** – Instant resume feedback

---

## 🖼️ Project Preview

<img src="screenshots/ui.png" width="800"/>

---

## 🛠️ Tech Stack

### Frontend

* **React**
* **TypeScript**
* **Axios**
* **CSS**

### Backend

* **Django**
* **Python**
* **Django REST Framework**

---

## ⚙️ How It Works

1. User uploads a resume (PDF).
2. The file is sent to the **Django backend API**.
3. The backend analyzes the resume and extracts:

   * Skills
   * ATS score
   * Suggestions
4. The **React frontend displays the results** in a clean UI.

---

## 📂 Project Structure

```
ai-resume-analyzer
│
├── frontend
│   ├── public
│   │   ├── favicin.png
│   │   ├── icons.svg
│   ├── src
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── package.json
│
├── backend
│   ├── resume_analyzer
│   ├── api
│   └── manage.py
│
├── screenshots
│   └── ui.png
│
└── README.md
```

---

## 🚀 Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/Muskankr/ai-resume-analyzer.git
cd ai-resume-analyzer
```

---

### 2️⃣ Backend Setup (Django)

```
cd backend
pip install -r requirements.txt
python manage.py runserver
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

### 3️⃣ Frontend Setup (React)

```
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 📊 Example Output

After uploading a resume, the system provides:

* **ATS Resume Score** (0–100)
* **Detected Skills**
* **Suggestions to improve the resume**

Example:

```
ATS Resume Score: 82%

Skills Found:
Python | Django | React | SQL | Git

Suggestions:
• Add more quantified achievements
• Mention internship experience
• Include more technical projects
```

---


If you like this project, consider giving it a **star ⭐ on GitHub**!
