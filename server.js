const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Files check
if (!fs.existsSync('users.json')) fs.writeFileSync('users.json', '[]');
if (!fs.existsSync('papers.json')) fs.writeFileSync('papers.json', '[]');
if (!fs.existsSync('public')) fs.mkdirSync('public');

// Signup
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  let users = JSON.parse(fs.readFileSync('users.json'));
  if (users.find(u => u.username === username)) {
    return res.json({ success: false, msg: 'User already exists' });
  }
  users.push({ username, password });
  fs.writeFileSync('users.json', JSON.stringify(users));
  res.json({ success: true });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  let users = JSON.parse(fs.readFileSync('users.json'));
  let user = users.find(u => u.username === username && u.password === password);
  if (user) res.json({ success: true, username });
  else res.json({ success: false, msg: 'Wrong username or password' });
});

// Generate Paper 
app.post('/api/generate-paper', (req, res) => {
  const { username, college, subject, className, time, maxMarks, questions, examTitle } = req.body;
  const fileName = `paper_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, 'public', fileName);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(fs.createWriteStream(filePath));
  
  // Header
doc.fontSize(11).font('Helvetica-Bold').text(college.toUpperCase(), { align: 'center' });
doc.moveDown(0.3);
doc.text(`${examTitle || 'FIRST SESSIONAL EXAMINATION - 2026'}`, { align: 'center' });
doc.moveDown(0.5);

// Roll No. add kiya hai yaha
doc.font('Helvetica').fontSize(11).text(`Roll No: ____________________`, { align: 'right' });
doc.moveDown(0.3);

doc.font('Helvetica').fontSize(10).text(`Class: ${className}`, { align: 'center' });
doc.text(`Subject: ${subject}`, { align: 'center' });
doc.moveDown(0.5);
doc.text(`Time: ${time}`, { width: 250, continued: true });
doc.text(`Maximum Marks: ${maxMarks}`, { align: 'right' });
doc.moveDown(0.5);
doc.text(`General Instructions: Attempt all questions.`);
doc.moveDown(0.2);
doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
doc.moveDown(1);

  // Questions
  questions.forEach((q, i) => {
    doc.font('Helvetica-Bold').fontSize(11).text(`Q${i+1}. ${q.title} ${q.marks ? `(${q.marks})` : ''}`);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    q.subs.forEach((s, j) => {
      let letter = String.fromCharCode(97 + j); // a, b, c...
      doc.text(`   ${letter}) ${s}`, { width: 480 });
      doc.moveDown(0.2);
    });
    doc.moveDown(0.8);
  });

  doc.end();

  let papers = JSON.parse(fs.readFileSync('papers.json'));
  papers.push({
    username,
    college,
    subject,
    exam: className,
    date: new Date().toLocaleDateString(),
    file: '/' + fileName,
    deleted: false
  });
  fs.writeFileSync('papers.json', JSON.stringify(papers));
  res.json({ success: true, file: '/' + fileName });
});

// My Papers
app.get('/api/my-papers/:username', (req, res) => {
  let papers = JSON.parse(fs.readFileSync('papers.json'));
  let myPapers = papers.filter(p => p.username === req.params.username && !p.deleted);
  res.json(myPapers.reverse());
});

// Recycle Bin
app.get('/api/recycle-bin/:username', (req, res) => {
  let papers = JSON.parse(fs.readFileSync('papers.json'));
  let myPapers = papers.filter(p => p.username === req.params.username && p.deleted);
  res.json(myPapers.reverse());
});

// Delete -> Recycle Bin
app.post('/api/delete-paper', (req, res) => {
  const { username, file } = req.body;
  let papers = JSON.parse(fs.readFileSync('papers.json'));
  let paper = papers.find(p => p.username === username && p.file === file);
  if (paper) {
    paper.deleted = true;
    paper.deletedAt = new Date().toLocaleString();
  }
  fs.writeFileSync('papers.json', JSON.stringify(papers));
  res.json({ success: true });
});

// Restore
app.post('/api/restore-paper', (req, res) => {
  const { username, file } = req.body;
  let papers = JSON.parse(fs.readFileSync('papers.json'));
  let paper = papers.find(p => p.username === username && p.file === file);
  if (paper) {
    paper.deleted = false;
    delete paper.deletedAt;
  }
  fs.writeFileSync('papers.json', JSON.stringify(papers));
  res.json({ success: true });
});

// Permanent Delete
app.post('/api/permanent-delete', (req, res) => {
  const { username, file } = req.body;
  let papers = JSON.parse(fs.readFileSync('papers.json'));
  papers = papers.filter(p => !(p.username === username && p.file === file));
  fs.writeFileSync('papers.json', JSON.stringify(papers));
  try {
    let fileName = file.replace('/', '');
    let filePath = path.join(__dirname, 'public', fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {}
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000/login.html'));