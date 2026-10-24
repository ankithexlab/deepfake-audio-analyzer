import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, MessageSquare, Shield, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    category: 'academic_evaluation',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'What audio formats are supported for forensic analysis?',
      a: 'The system accepts WAV, MP3, FLAC, and OGG audio files up to 50MB. Audio files are automatically resampled to a standardized 16,000 Hz Mono PCM representation for normalized spectral feature extraction.'
    },
    {
      q: 'How does the AI ensemble determine if an audio clip is deepfake?',
      a: 'The classifier examines a 170-dimensional acoustic feature vector composed of 120-dim MFCC cepstrals, Chroma STFT pitch features, spectral contrast, Zero Crossing Rate (ZCR), and RMS energy distributions. The soft-voting ensemble computes calibrated probability scores for synthetic vs human vocal patterns.'
    },
    {
      q: 'Are uploaded audio files permanently stored or shared?',
      a: 'Audio files are processed locally on the secure backend server and stored in the PostgreSQL deepfake_db schema for audit purposes. You can permanently delete any scan record and its associated audio file from the History page at any time.'
    },
    {
      q: 'Can this tool be evaluated by external examiners or viva reviewers?',
      a: 'Yes! Examiners and reviewers can click the "Guest Demo" button on the navigation bar or login screen to immediately activate a full pre-authenticated session without needing to fill out registration forms.'
    }
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg('Please fill in your name, email address, and inquiry message.');
      return;
    }

    setIsSubmitting(true);
    // Simulate interactive transmission
    await new Promise((r) => setTimeout(r, 600));

    const receiptId = `INQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setSubmittedReceipt({
      id: receiptId,
      timestamp: new Date().toLocaleString(),
      ...formData,
    });
    setIsSubmitting(false);
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      organization: '',
      category: 'academic_evaluation',
      subject: '',
      message: '',
    });
    setSubmittedReceipt(null);
    setErrorMsg('');
  };

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div className="brand-icon">
            <Mail size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Contact & Academic Evaluation</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              DeepFake Audio Analyzer Forensic Research & Project Inquiry Desk
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
          Have questions regarding the acoustic feature extraction pipeline, machine learning model benchmarks, institutional deployment, or project viva evaluation? Submit your inquiry below.
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Contact Form Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare className="text-gradient-cyan" size={20} />
            Send an Inquiry
          </h2>

          {submittedReceipt ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginBottom: '0.5rem' }}>
                Inquiry Received Successfully!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Receipt Reference: <span className="font-mono" style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>{submittedReceipt.id}</span>
              </p>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.82rem', marginBottom: '1.5rem', border: '1px solid var(--border-glass)' }}>
                <p><strong>Sender:</strong> {submittedReceipt.name} ({submittedReceipt.email})</p>
                <p><strong>Department:</strong> {submittedReceipt.organization || 'Individual Reviewer'}</p>
                <p><strong>Subject:</strong> {submittedReceipt.subject || 'Project Inquiry'}</p>
                <p><strong>Date:</strong> {submittedReceipt.timestamp}</p>
              </div>
              <button onClick={handleResetForm} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="name">Your Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Dr. Jane Doe / Examiner Name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  placeholder="name@university.edu"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="organization">Institution / Department</label>
                <input
                  id="organization"
                  type="text"
                  name="organization"
                  placeholder="e.g. Dept of Computer Science & Engineering"
                  className="form-input"
                  value={formData.organization}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="category">Inquiry Category</label>
                <select
                  id="category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="academic_evaluation">Academic / Viva Project Evaluation</option>
                  <option value="forensic_methodology">Acoustic Feature Extraction Question</option>
                  <option value="model_metrics">Machine Learning Model Architecture</option>
                  <option value="security_disclosure">Vulnerability / Bug Report</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  name="subject"
                  placeholder="Summary of your inquiry"
                  className="form-input"
                  value={formData.subject}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  required
                  placeholder="Detailed notes or evaluation feedback..."
                  className="form-textarea"
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                <Send size={16} />
                {isSubmitting ? 'Transmitting Inquiry...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>

        {/* Contact Info & Security Guidelines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-cyan)' }}>
              <Shield size={18} /> Forensic Laboratory Desk
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              DeepFake Audio Analyzer is maintained for institutional research in audio signal processing and acoustic security.
            </p>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p>📍 <strong>Laboratory:</strong> Digital Forensics & Cyber Defense Lab</p>
              <p>🏛 <strong>Course:</strong> 5th Semester Mini Project / PBL</p>
              <p>⚡ <strong>API Base:</strong> http://localhost:5000/api/v1</p>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd' }}>
              <HelpCircle size={18} /> Frequently Asked Questions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'rgba(15, 23, 42, 0.5)'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={16} color="var(--primary-cyan)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                  </button>

                  {openFaq === idx && (
                    <div style={{ padding: '0.5rem 1rem 0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
