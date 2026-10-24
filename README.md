# 🎙️ DeepFake Audio Analyzer

### AI-Powered Deepfake Audio Detection & Forensics System

A web-based cybersecurity project designed to analyze audio recordings and help identify potentially AI-generated or manipulated speech using machine learning and acoustic feature analysis.

**Developed as an academic project for BCA Cyber Security at Graphic Era Hill University, Dehradun.**

---

## 📌 Overview

DeepFake Audio Analyzer is an academic project that provides a web interface for audio analysis, deepfake classification, and forensic review. It combines a React frontend, Node.js backend APIs, a Python machine-learning component, and PostgreSQL database integration.

The project explores how machine learning and audio signal analysis can support the investigation of potentially synthetic or manipulated speech.

## ✨ Features

- 🎧 Audio upload and analysis workflow
- 🤖 Machine-learning-based audio classification
- 📊 Analytics dashboard and result visualization
- 🔬 Forensic analysis results and report interface
- 🗂️ Analysis history interface
- 🔐 Login and signup interfaces
- 📈 Acoustic analysis visualizations
- 🧪 Sample audio files for testing

*Feature availability and results depend on the current application configuration. Model performance should be evaluated before making accuracy claims.*

---

## 🖥️ Application Screenshots

### 1. Home Page

The landing page introduces the platform and provides access to its audio detection and analysis features.

![DeepFake Audio Analyzer Home Page](https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/home.jpeg?raw=true)

### 2. Detection Workbench

The workbench provides an interface for uploading audio recordings for analysis.

![Detection Workbench](https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/workbench.jpeg?raw=true)

### 3. Forensic Analysis Result

The results interface displays the model's classification, probability estimates, and forensic indicators. These estimates should not be treated as conclusive proof of authenticity.

![Forensic Analysis Result](https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/forensics.jpeg?raw=true)

### 4. Analytics and Database Dashboard

The dashboard presents audio analysis statistics, classification distribution, model information, and dataset metadata.

<p align="center">
  <img src="https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/dashboard.jpeg?raw=true" alt="Analytics and Database Dashboard" width="800">
</p>

### 5. Login Page

The login interface for users accessing the application.

![Login Page](https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/login.jpeg?raw=true)

### 6. Signup Page

The signup interface for new users.

![Signup Page](https://github.com/ankithexlab/deepfake-audio-analyzer/blob/main/docs/screenshots/signup.jpeg?raw=true)

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Machine Learning | Python |
| Authentication | JSON Web Token (JWT) |
| Version Control | Git, GitHub |

## 📁 Project Structure

```text
deepfake-audio-analyzer/
├── backend/
│   ├── ml/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
├── docs/
│   └── screenshots/
│       ├── home.jpeg
│       ├── workbench.jpeg
│       ├── forensics.jpeg
│       ├── dashboard.jpeg
│       ├── login.jpeg
│       └── signup.jpeg
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── .gitignore
├── README.md
├── install.cmd
└── start_project.bat
```

---

## 🚀 Getting Started

### Prerequisites

Install the following tools before setting up the project:

- Node.js and npm
- Python and pip
- PostgreSQL
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/ankithexlab/deepfake-audio-analyzer.git
cd deepfake-audio-analyzer
```

**2. Configure environment variables**

Use `backend/.env.example` as a reference to create your local `backend/.env` file. Configure your database connection and provide a strong, unique JWT secret.

Never upload your real `.env` file to GitHub.

**3. Configure PostgreSQL**

Create the required PostgreSQL database and configure the connection settings to match your local installation.

**4. Install backend dependencies**

```bash
cd backend
npm install
```

**5. Install frontend dependencies**

Open a separate terminal from the project root and run:

```bash
cd frontend
npm install
```

**6. Start the application**

On Windows, the project root includes `start_project.bat`. Follow the project's configuration requirements before running it.

Python dependencies, database initialization, and runtime ports may require additional setup depending on the current configuration.

---

## 🔒 Security

- Never commit `.env` files, passwords, JWT secrets, or access tokens.
- Keep database credentials private.
- Use a strong, unique JWT secret.
- Validate uploaded audio files and restrict upload sizes.
- Avoid uploading private or sensitive audio recordings.
- Test authentication, authorization, and API security before deployment.

## ⚠️ Limitations

Machine-learning predictions are not definitive proof that an audio recording is real or fake. Results may vary with recording quality, background noise, dataset coverage, and previously unseen synthesis techniques.

Probability estimates shown in the interface should not automatically be interpreted as calibrated confidence or verified model accuracy. Model performance and end-to-end functionality should be evaluated before making accuracy claims.

This application is an academic project and is not a substitute for independently validated forensic examination.

## 🔮 Future Improvements

- Expanded model evaluation and performance reporting
- Improved forensic visualizations
- Automated tests for frontend and backend workflows
- Deployment documentation
- Enhanced input validation and application security
- More comprehensive audio datasets and robustness testing

---

## 👨‍💻 Author

**Ankit Kumar**  
BCA — Cyber Security  
Graphic Era Hill University, Dehradun

[GitHub Profile](https://github.com/ankithexlab)

## 📄 Disclaimer

This project is intended for educational and research purposes. Its predictions should not be used as conclusive forensic evidence without independent validation.
