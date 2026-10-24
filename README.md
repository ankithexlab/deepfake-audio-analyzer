# 🎙️ DeepFake Audio Analyzer

### AI-Powered Deepfake Audio Detection & Forensics System

A web-based cybersecurity project designed to analyze audio recordings and help identify potentially AI-generated or manipulated speech using machine learning.

**Developed as an academic project for BCA Cyber Security.**

---

## 📌 Overview

DeepFake Audio Analyzer aims to provide an interface for audio analysis, prediction results, and forensic review. It combines a web frontend, backend APIs, a machine-learning model, and database integration.

## ✨ Features

- 🎧 Audio upload and analysis workflow
- 🤖 Machine-learning-based audio classification
- 📊 Analysis dashboard and result visualization
- 🔬 Forensics interface and report views
- 🗂️ Analysis history interface
- 🔐 Login and signup interfaces
- 🧪 Sample audio files for testing

*Feature availability depends on the current application configuration.*

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Machine Learning | Python |
| Authentication | JSON Web Token (JWT) |
| Version Control | Git, GitHub |

## 🖥️ Screenshots

Screenshots of the running application will be added here.

<!-- Add screenshots under docs/screenshots/ and link them here. -->

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
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── .gitignore
├── install.cmd
└── start_project.bat
```

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Python and pip
- PostgreSQL
- Git

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/ankithexlab/deepfake-audio-analyzer.git
   cd deepfake-audio-analyzer
   ```

2. Configure the backend environment variables using `backend/.env.example` as a reference. Create your local `backend/.env` file and provide your own database configuration and a strong JWT secret.

3. Create the required PostgreSQL database and configure its connection settings.

4. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

5. Install frontend dependencies in a separate terminal:

   ```bash
   cd frontend
   npm install
   ```

6. Follow the project's configuration requirements and run the application using the provided startup scripts. On Windows, `start_project.bat` is available in the project root.

*Exact database setup, Python dependencies, and runtime ports depend on the current configuration.*

## 🔒 Security

- Never commit `.env` files, passwords, JWT secrets, or access tokens.
- Keep database credentials private.
- Use a strong, unique JWT secret.
- Avoid uploading private or sensitive audio recordings.

## ⚠️ Limitations

Machine-learning predictions are not definitive proof that an audio recording is real or fake. Performance can vary with audio quality, dataset coverage, and unseen synthesis methods. Model performance and end-to-end functionality should be evaluated before making accuracy claims.

## 🔮 Future Improvements

- Expanded model evaluation and performance reporting
- Improved forensic visualizations
- More automated tests
- Deployment documentation
- Enhanced validation and application security

## 👨‍💻 Author

**Ankit Kumar**  
BCA — Cyber Security  
Graphic Era Hill University, Dehradun

[GitHub Profile](https://github.com/ankithexlab)

## 📄 Disclaimer

This project is intended for educational and research purposes. Its predictions should not be used as conclusive forensic evidence without independent validation.
