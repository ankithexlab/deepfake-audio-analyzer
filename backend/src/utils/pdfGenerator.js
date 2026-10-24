/**
 * utils/pdfGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side PDF Report Generator using PDFKit.
 * Generates forensic analysis reports for Deep Fake Audio Analyzer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require('pdfkit');

/**
 * Builds a forensic analysis PDF report and pipes to writable stream.
 *
 * @param {Object} data
 * @param {import('stream').Writable} writeStream
 */
function generatePdfReport(data, writeStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: 'Deepfake Audio Detection and Analysis Report',
      Author: 'Deep Fake Audio Analyzer System',
      Subject: 'Forensic Audio Detection Report',
    },
  });

  doc.pipe(writeStream);

  const {
    fileRecord = {},
    analysisResult = {},
    preprocessingData = {},
  } = data;

  const isDeepfake = analysisResult.isDeepfake || analysisResult.label === 'FAKE';
  const verdictText = isDeepfake ? 'DEEPFAKE VOICE' : 'REAL VOICE';
  const confidence = (analysisResult.confidence * 100).toFixed(2);
  const fakeProb = (analysisResult.fakeProbability * 100).toFixed(2);
  const realProb = (analysisResult.realProbability * 100).toFixed(2);
  const dateStr = new Date().toUTCString();

  // 1. Header Banner
  doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');

  doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold');
  doc.text('DEEPFAKE AUDIO DETECTION AND ANALYSIS SYSTEM', 40, 20);

  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold');
  doc.text('FORENSIC AUDIO ANALYSIS REPORT', 40, 36);

  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
  doc.text(`Official Analysis Certificate | Generated: ${dateStr}`, 40, 60);

  doc.moveDown(3);

  // 2. Verdict Banner Box
  const boxTop = 100;
  const boxHeight = 65;
  const boxBg = isDeepfake ? '#fef2f2' : '#f0fdf4';
  const boxBorder = isDeepfake ? '#ef4444' : '#10b981';
  const textColor = isDeepfake ? '#b91c1c' : '#15803d';

  doc.roundedRect(40, boxTop, doc.page.width - 80, boxHeight, 6)
     .lineWidth(1.5)
     .strokeColor(boxBorder)
     .fillAndStroke(boxBg, boxBorder);

  doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold');
  doc.text('OFFICIAL ANALYSIS VERDICT:', 55, boxTop + 14);

  doc.fillColor(textColor).fontSize(20).font('Helvetica-Bold');
  doc.text(verdictText, 55, boxTop + 28);

  doc.fillColor(textColor).fontSize(10).font('Helvetica');
  doc.text(
    `Confidence Score: ${confidence}%   |   Fake Probability: ${fakeProb}%   |   Real Probability: ${realProb}%`,
    55,
    boxTop + 50
  );

  // 3. Audio Information Section
  const audioSecTop = 185;
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
  doc.text('1. Audio Asset Information', 40, audioSecTop);

  doc.rect(40, audioSecTop + 16, doc.page.width - 80, 1).fill('#e2e8f0');

  const audioDetails = [
    ['Filename:', fileRecord.originalName || 'audio.wav'],
    ['File Format:', (fileRecord.format || 'wav').toUpperCase()],
    ['File Size:', fileRecord.sizeHuman || 'N/A'],
    ['Sampling Rate:', `${preprocessingData.samplingRateHz || 16000} Hz (Mono Cleaned)`],
    ['Duration:', `${preprocessingData.cleanDurationSec || '4.00'} seconds`],
    ['Storage ID:', fileRecord.fileId || 'N/A'],
  ];

  let currentY = audioSecTop + 25;
  doc.fontSize(9).font('Helvetica');
  audioDetails.forEach(([label, val]) => {
    doc.fillColor('#475569').font('Helvetica-Bold').text(label, 45, currentY, { width: 130 });
    doc.fillColor('#0f172a').font('Helvetica').text(String(val), 180, currentY);
    currentY += 16;
  });

  // 4. Model & Inference Information Section
  currentY += 10;
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
  doc.text('2. Machine Learning Model Specifications', 40, currentY);

  doc.rect(40, currentY + 16, doc.page.width - 80, 1).fill('#e2e8f0');

  currentY += 25;
  const modelDetails = [
    ['Model Engine:', analysisResult.modelName || 'EnsembleNeuralClassifier'],
    ['Model Version:', analysisResult.modelVersion || '1.0.0'],
    ['Architecture:', (analysisResult.modelType || 'ensemble').toUpperCase()],
    ['Inference Time:', `${analysisResult.processingMs || 0} ms`],
    ['Features Vector:', '170 acoustic dimensions (MFCCs, Chroma, Contrast, ZCR, RMS, Centroid)'],
    ['Decision Threshold:', '0.50 Softmax probability boundary'],
  ];

  modelDetails.forEach(([label, val]) => {
    doc.fillColor('#475569').font('Helvetica-Bold').text(label, 45, currentY, { width: 130 });
    doc.fillColor('#0f172a').font('Helvetica').text(String(val), 180, currentY);
    currentY += 16;
  });

  // 5. Acoustic Spectral Measurements Summary
  currentY += 10;
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
  doc.text('3. Acoustic Feature Analysis Summary', 40, currentY);

  doc.rect(40, currentY + 16, doc.page.width - 80, 1).fill('#e2e8f0');

  currentY += 25;
  const featuresSummary = preprocessingData.featuresSummary || {};
  const centroidVal = featuresSummary.spectralCentroidMean ? featuresSummary.spectralCentroidMean.toFixed(1) + ' Hz' : 'N/A';
  const zcrVal = featuresSummary.zcrMean ? featuresSummary.zcrMean.toFixed(4) : 'N/A';
  const rmsVal = featuresSummary.rmsMean ? featuresSummary.rmsMean.toFixed(4) : 'N/A';

  const acousticRows = [
    ['MFCC Coefficients', '20 Bands', 'Vocal tract frequency spectrum envelope'],
    ['Spectral Centroid', centroidVal, 'Spectral energy center of mass (brightness)'],
    ['Zero Crossing Rate (ZCR)', zcrVal, 'Rate of signal sign changes (unvoiced noise)'],
    ['RMS Energy Level', rmsVal, 'Root Mean Square amplitude dynamics'],
  ];

  // Draw simple table
  doc.rect(40, currentY, doc.page.width - 80, 20).fill('#f1f5f9');
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold');
  doc.text('Feature', 50, currentY + 6);
  doc.text('Measured Value', 200, currentY + 6);
  doc.text('Diagnostic Interpretation', 330, currentY + 6);

  currentY += 22;
  doc.font('Helvetica').fontSize(8);
  acousticRows.forEach(([feat, val, desc]) => {
    doc.rect(40, currentY, doc.page.width - 80, 18).strokeColor('#f1f5f9').stroke();
    doc.fillColor('#0f172a').text(feat, 50, currentY + 5);
    doc.fillColor('#0284c7').font('Helvetica-Bold').text(val, 200, currentY + 5).font('Helvetica');
    doc.fillColor('#64748b').text(desc, 330, currentY + 5);
    currentY += 18;
  });

  // 6. Footer Disclaimer & Signature
  const footerTop = doc.page.height - 70;
  doc.rect(40, footerTop, doc.page.width - 80, 0.5).fill('#cbd5e1');

  doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
  doc.text(
    'Deepfake Audio Detection and Analysis System — Final Year Academic Project (PBL).\n' +
    'This forensic report was computed from real signal processing and AI neural inference.',
    40,
    footerTop + 10,
    { align: 'center', width: doc.page.width - 80 }
  );

  doc.end();
}

module.exports = { generatePdfReport };
