const state = {
  interviewId: null,
  role: null,
  questions: [],
};

const $ = (sel) => document.querySelector(sel);
const apiBaseInput = $('#apiBase');

function apiBase() {
  return apiBaseInput.value.replace(/\/$/, '');
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

function setStep(step) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${step}`).classList.add('active');

  document.querySelectorAll('#railSteps li').forEach((li) => {
    li.classList.remove('active', 'done');
  });
  const order = ['setup', 'questions', 'results'];
  const idx = order.indexOf(step);
  order.forEach((s, i) => {
    const li = document.querySelector(`#railSteps li[data-step="${s}"]`);
    if (i < idx) li.classList.add('done');
    if (i === idx) li.classList.add('active');
  });
}

// ---------------- STEP 1: SETUP ----------------
const DEFAULT_ROLES = [
  'MERN Developer', 'AI Engineer', 'Frontend Developer', 'Backend Developer',
  'HR Interview', 'Customer Support', 'Data Analyst', 'Product Manager',
];

async function loadRoles() {
  const grid = $('#roleGrid');
  let roles = DEFAULT_ROLES;
  try {
    const data = await api('/interviews/roles/list');
    if (data.roles && data.roles.length) roles = data.roles.filter((r) => r !== 'Custom');
  } catch (e) {
    // fall back silently, backend may not be running yet
  }
  grid.innerHTML = '';
  roles.forEach((role) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'role-chip';
    chip.textContent = role;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.role-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      $('input[name="role"]').value = role;
    });
    grid.appendChild(chip);
  });
}

$('#setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = $('#setupError');
  errorEl.textContent = '';

  const role = form.role.value;
  if (!role) {
    errorEl.textContent = 'Pick a role to continue.';
    return;
  }

  const btn = $('#startBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Setting the stage…';

  try {
    const payload = {
      userName: form.userName.value,
      userEmail: form.userEmail.value,
      role,
      difficulty: form.difficulty.value,
      numberOfQuestions: parseInt(form.numberOfQuestions.value, 10),
      jobDescription: form.jobDescription.value || undefined,
    };

    const interview = await api('/interviews', { method: 'POST', body: JSON.stringify(payload) });
    state.interviewId = interview.id;
    state.role = interview.role;

    const withQuestions = await api(
      `/interviews/${interview.id}/questions?count=${payload.numberOfQuestions}`,
      { method: 'POST' },
    );
    state.questions = withQuestions.questions;

    renderQuestions();
    setStep('questions');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Walk on stage';
  }
});

// ---------------- STEP 2: QUESTIONS ----------------
function renderQuestions() {
  $('#questionsRole').textContent = `${state.role} Interview`;
  const list = $('#questionsList');
  list.innerHTML = '';
  state.questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="qmeta">
        <span class="qnum">Question ${i + 1} / ${state.questions.length}</span>
        <span class="qcategory">${q.category || 'general'}</span>
      </div>
      <p class="qtext">${escapeHtml(q.text)}</p>
      <textarea data-question-id="${q.id}" placeholder="Type your answer here…"></textarea>
    `;
    list.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function collectAnswers() {
  return Array.from(document.querySelectorAll('#questionsList textarea'))
    .map((ta) => ({ questionId: ta.dataset.questionId, text: ta.value.trim() }))
    .filter((a) => a.text.length > 0);
}

async function submitAnswers() {
  const answers = collectAnswers();
  if (answers.length === 0) {
    throw new Error('Answer at least one question before submitting.');
  }
  return api(`/interviews/${state.interviewId}/answers`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

$('#saveDraftBtn').addEventListener('click', async () => {
  const errorEl = $('#questionsError');
  errorEl.textContent = '';
  errorEl.className = 'success';
  try {
    await submitAnswers();
    errorEl.textContent = 'Saved. You can keep going or finish whenever you\'re ready.';
  } catch (err) {
    errorEl.className = 'error';
    errorEl.textContent = err.message;
  }
});

$('#finishBtn').addEventListener('click', async () => {
  const errorEl = $('#questionsError');
  errorEl.className = 'error';
  errorEl.textContent = '';
  const btn = $('#finishBtn');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  try {
    await submitAnswers();
    const report = await api(`/interviews/${state.interviewId}/analyze`, { method: 'POST' });
    renderResults(report);
    setStep('results');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Finish & analyze';
  }
});

// ---------------- STEP 3: RESULTS ----------------
function scoreClass(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

function renderResults(report) {
  $('#resultsSub').textContent = `Your ${state.role} interview, scored.`;

  const cards = [
    { label: 'Overall Score', value: report.overallScore },
    { label: 'Communication', value: report.communicationScore },
    { label: 'Technical Knowledge', value: report.technicalScore },
  ];
  $('#scorecards').innerHTML = cards
    .map(
      (c) => `
      <div class="scorecard">
        <div class="score-label">${c.label}</div>
        <div class="score-value ${scoreClass(c.value)}">${c.value}<span class="score-of">/100</span></div>
      </div>`,
    )
    .join('');

  fillList('#strengthsList', report.strengths);
  fillList('#weaknessesList', report.weaknesses);
  fillList('#improvementsList', report.areasForImprovement);
  fillList('#resourcesList', report.suggestedResources);
  $('#recommendationText').textContent = report.hiringRecommendation;

  $('#emailStatus').textContent = '';
}

function fillList(selector, items) {
  const el = $(selector);
  el.innerHTML = (items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('') || '<li>—</li>';
}

$('#emailBtn').addEventListener('click', async () => {
  const statusEl = $('#emailStatus');
  statusEl.className = 'loading-inline';
  statusEl.textContent = 'Sending…';
  try {
    const result = await api(`/interviews/${state.interviewId}/send-report`, { method: 'POST' });
    statusEl.className = result.sent ? 'success' : 'error';
    statusEl.textContent = result.sent
      ? 'Report sent — check your inbox.'
      : 'Could not send email (check RESEND_API_KEY on the server).';
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = err.message;
  }
});

$('#restartBtn').addEventListener('click', () => {
  state.interviewId = null;
  state.role = null;
  state.questions = [];
  $('#setupForm').reset();
  document.querySelectorAll('.role-chip').forEach((c) => c.classList.remove('selected'));
  setStep('setup');
});

loadRoles();
