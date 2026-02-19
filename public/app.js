// Sagan Image Generator - App

const API_URL = window.location.origin;

// State
let state = {
  jobs: [],
  selectedJobs: new Set(),
  template: 'catalog-1',
  carouselCoverTemplate: 'cover-default',
  carouselDetailTemplate: 'carousel-detail',
  dotStyle: 'default',
  logoStyle: 'dark',
  outputType: 'single',
  generatedImages: [],
  aiTemplateHtml: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initToggle();
  initDotStyle();
  initLogoStyle();
  initTemplateSelect();
  loadJobs();
  loadTemplates();
});

// Navigation
function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`).classList.add('active');

      if (page === 'templates') {
        loadTemplates();
      }
      if (page === 'ai-template') {
        loadAITemplateHistory();
      }
    });
  });
}

// Output Type Toggle
function initToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.outputType = btn.dataset.type;
      updateTemplateVisibility();
      updateSelectedInfo();
    });
  });
}

function updateTemplateVisibility() {
  const isCarousel = state.outputType === 'carousel';
  document.getElementById('singleTemplateGroup').style.display = isCarousel ? 'none' : 'block';
  document.getElementById('carouselTemplateGroup').style.display = isCarousel ? 'block' : 'none';
}

// Dot Style (Generate tab only — AI Template tab has its own handler)
function initDotStyle() {
  document.querySelectorAll('#page-generate .dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-generate .dot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dotStyle = btn.dataset.style;
    });
  });
}

// Logo Style (Generate tab only — AI Template tab has its own handler)
function initLogoStyle() {
  document.querySelectorAll('#page-generate .logo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-generate .logo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.logoStyle = btn.dataset.logo;
    });
  });
}

// Template Select
function initTemplateSelect() {
  document.getElementById('templateSelect').addEventListener('change', (e) => {
    state.template = e.target.value;
  });
  document.getElementById('carouselCoverSelect').addEventListener('change', (e) => {
    state.carouselCoverTemplate = e.target.value;
  });
  document.getElementById('carouselDetailSelect').addEventListener('change', (e) => {
    state.carouselDetailTemplate = e.target.value;
  });
}

// Load Jobs
async function loadJobs() {
  const container = document.getElementById('jobsList');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading jobs...</p></div>';

  try {
    const response = await fetch(`${API_URL}/api/airtable/jobs`);
    const data = await response.json();

    if (data.jobs && data.jobs.length > 0) {
      state.jobs = data.jobs;
      renderJobs();
    } else {
      state.jobs = getDemoJobs();
      renderJobs();
      showToast('Using demo data. Configure Airtable for live jobs.', 'warning');
    }
  } catch (error) {
    console.error('Error:', error);
    state.jobs = getDemoJobs();
    renderJobs();
  }
}

// Demo Jobs
function getDemoJobs() {
  return [
    {
      id: '1',
      title: 'AR/AP Specialist',
      jobCode: 'HR37374',
      salary: '$1,300 - $1,600',
      location: '100% Remote',
      schedule: 'M-F, 9AM-6PM PST',
      responsibilities: ['Manage AR/AP processes', 'Handle invoicing', 'Reconcile accounts'],
      qualifications: ['2+ years experience', 'Detail-oriented', 'QuickBooks knowledge']
    },
    {
      id: '2',
      title: 'Marketing Manager',
      jobCode: 'HR37375',
      salary: '$2,500 - $3,500',
      location: '100% Remote',
      schedule: 'M-F, 9AM-5PM EST',
      responsibilities: ['Lead marketing campaigns', 'Manage team', 'Analyze performance'],
      qualifications: ['5+ years experience', 'MBA preferred', 'Digital marketing skills']
    },
    {
      id: '3',
      title: 'Video Editor',
      jobCode: 'HR37376',
      salary: '$1,200 - $1,800',
      location: '100% Remote',
      schedule: 'Flexible',
      responsibilities: ['Edit promotional videos', 'Create content', 'Color grading'],
      qualifications: ['Adobe Premiere Pro', 'Portfolio required', 'Motion graphics a plus']
    },
    {
      id: '4',
      title: 'Senior Executive Assistant',
      jobCode: 'HR37377',
      salary: '$2,500 - $3,000',
      location: '100% Remote',
      schedule: 'M-F, 8AM-5PM PST',
      responsibilities: ['Calendar management', 'Travel coordination', 'Meeting prep'],
      qualifications: ['3+ years EA experience', 'Excellent communication', 'Discretion']
    },
    {
      id: '5',
      title: 'Payroll Specialist',
      jobCode: 'HR37378',
      salary: '$1,500 - $2,000',
      location: '100% Remote',
      schedule: 'M-F, 9AM-6PM EST',
      responsibilities: ['Process payroll', 'Tax filings', 'Benefits administration'],
      qualifications: ['Payroll experience', 'Attention to detail', 'ADP or Gusto preferred']
    }
  ];
}

// Filter Jobs by search
function filterJobs() {
  const query = document.getElementById('jobSearch').value.toLowerCase().trim();
  renderJobs(query);
}

// Render Jobs
function renderJobs(searchQuery = '') {
  const container = document.getElementById('jobsList');

  let filteredJobs = state.jobs;
  if (searchQuery) {
    filteredJobs = state.jobs.filter(job =>
      job.title.toLowerCase().includes(searchQuery) ||
      (job.salary || '').toLowerCase().includes(searchQuery) ||
      (job.location || '').toLowerCase().includes(searchQuery)
    );
  }

  if (filteredJobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>${searchQuery ? 'No matching jobs found.' : 'No jobs found. Add jobs in Airtable.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredJobs.map(job => `
    <div class="job-card ${state.selectedJobs.has(job.id) ? 'selected' : ''}"
         data-id="${job.id}"
         onclick="toggleJob('${job.id}')">
      <div class="job-checkbox"></div>
      <div class="job-info">
        <div class="job-title">${job.title}</div>
        <div class="job-meta">
          <span class="job-salary">${job.salary || 'Salary TBD'}</span>
          <span>${job.location}</span>
          <span>${job.schedule}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle Job Selection
function toggleJob(id) {
  if (state.selectedJobs.has(id)) {
    state.selectedJobs.delete(id);
  } else {
    state.selectedJobs.add(id);
  }

  document.querySelectorAll('.job-card').forEach(card => {
    card.classList.toggle('selected', state.selectedJobs.has(card.dataset.id));
  });

  updateSelectedInfo();
  renderSelectedChips();
}

// Clear all selections
function clearAllSelections() {
  state.selectedJobs.clear();
  document.querySelectorAll('.job-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateSelectedInfo();
  renderSelectedChips();
}

// Render selected jobs chips
function renderSelectedChips() {
  const bar = document.getElementById('selectedJobsBar');
  const chips = document.getElementById('selectedJobsChips');
  const count = document.getElementById('selectedJobsCount');

  if (state.selectedJobs.size === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';
  count.textContent = `${state.selectedJobs.size} selected`;

  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));
  chips.innerHTML = selectedJobData.map(job => `
    <div class="selected-chip">
      <span>${job.title}</span>
      <button class="chip-remove" onclick="event.stopPropagation(); toggleJob('${job.id}')" title="Remove">×</button>
    </div>
  `).join('');
}

// Update Selected Info
function updateSelectedInfo() {
  const count = state.selectedJobs.size;
  const info = document.getElementById('selectedInfo');
  const btn = document.getElementById('generateBtn');
  const linkedinBtn = document.getElementById('linkedinBtn');
  const sendBtn = document.getElementById('aiSendBtn');

  if (sendBtn) sendBtn.disabled = count === 0;

  if (count === 0) {
    info.textContent = 'Select jobs to generate images';
    btn.disabled = true;
    btn.textContent = 'Generate Images';
    linkedinBtn.disabled = true;
  } else if (state.outputType === 'carousel' && count < 2) {
    info.textContent = `${count} job selected - Need 2+ for carousel`;
    btn.disabled = true;
    btn.textContent = 'Select 2+ jobs for carousel';
    linkedinBtn.disabled = true;
  } else {
    const type = state.outputType === 'carousel' ? 'Carousel' : `${count} Image${count > 1 ? 's' : ''}`;
    info.textContent = `${count} job${count > 1 ? 's' : ''} selected`;
    btn.disabled = false;
    btn.textContent = `Generate ${type}`;
    linkedinBtn.disabled = false;
  }
}

// Generate Images
document.getElementById('generateBtn').addEventListener('click', generateImages);

async function generateImages() {
  const btn = document.getElementById('generateBtn');
  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));

  if (selectedJobData.length === 0) return;

  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    if (state.outputType === 'carousel') {
      const response = await fetch(`${API_URL}/generate-carousel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: selectedJobData,
          dotStyle: state.dotStyle,
          logoStyle: state.logoStyle,
          coverTemplate: state.carouselCoverTemplate,
          detailTemplate: state.carouselDetailTemplate
        })
      });

      if (!response.ok) throw new Error('Failed to generate');

      const data = await response.json();
      state.generatedImages = [
        'data:image/png;base64,' + data.images.cover,
        ...data.images.details.map(img => 'data:image/png;base64,' + img)
      ];

      showModal();
      showToast(`Generated ${state.generatedImages.length} images!`, 'success');

    } else {
      state.generatedImages = [];

      for (const job of selectedJobData) {
        const response = await fetch(`${API_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            salary: job.salary,
            location: job.location,
            schedule: job.schedule,
            responsibilities: job.responsibilities || [],
            qualifications: job.qualifications || [],
            jobCode: job.jobCode || '',
            template: state.template,
            dotStyle: state.dotStyle,
            logoStyle: state.logoStyle
          })
        });

        if (!response.ok) throw new Error('Failed to generate');

        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise(resolve => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        state.generatedImages.push(base64);
      }

      showModal();
      showToast(`Generated ${state.generatedImages.length} image(s)!`, 'success');
    }

  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to generate images', 'error');
  } finally {
    updateSelectedInfo();
  }
}

// Show Modal with Images
function showModal() {
  const modal = document.getElementById('resultModal');
  const body = document.getElementById('modalBody');

  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));
  const jobName = selectedJobData.length === 1 ? selectedJobData[0].title : `${selectedJobData.length} Jobs`;

  body.innerHTML = state.generatedImages.map((img, i) => `
    <div class="image-item">
      <img src="${img}" alt="Generated image ${i + 1}">
      <div class="image-actions">
        <button class="image-download" onclick="downloadImage(${i})">Download</button>
        <button class="image-save" onclick="saveToTemplates(${i}, '${jobName.replace(/'/g, "\\'")}')">+ Save</button>
      </div>
    </div>
  `).join('');

  modal.classList.add('open');
}

// Save generated image to custom templates
function saveToTemplates(index, jobName) {
  const image = state.generatedImages[index];
  if (!image) return;

  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');

  const newTemplate = {
    id: 'custom_' + Date.now(),
    name: jobName || 'Custom Template',
    imageBase64: image,
    savedAt: new Date().toLocaleDateString('en-US'),
    template: state.template,
    dotStyle: state.dotStyle,
    logoStyle: state.logoStyle
  };

  customTemplates.unshift(newTemplate);
  localStorage.setItem('customTemplates', JSON.stringify(customTemplates));

  showToast('Saved to Templates!', 'success');

  if (document.getElementById('page-templates').classList.contains('active')) {
    loadTemplates();
  }
}

function closeModal() {
  document.getElementById('resultModal').classList.remove('open');
}

// Download
function downloadImage(index) {
  const link = document.createElement('a');
  link.href = state.generatedImages[index];
  link.download = `sagan-job-${index + 1}.png`;
  link.click();
}

function downloadAll() {
  state.generatedImages.forEach((img, i) => {
    setTimeout(() => downloadImage(i), i * 300);
  });
  showToast('Downloading all images...', 'success');
}

// ============================================
// TEMPLATE GALLERY
// ============================================

async function loadTemplates() {
  const hiddenTemplates = JSON.parse(localStorage.getItem('hiddenTemplates') || '[]');
  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  const grid = document.getElementById('templatesGrid');

  // Load templates from server
  let serverTemplates = [];
  try {
    const resp = await fetch(`${API_URL}/api/templates`);
    const data = await resp.json();
    serverTemplates = data.templates || [];
  } catch (e) {
    // Fallback list
    serverTemplates = [
      { id: 'catalog-1', name: 'Catalog 1' },
      { id: 'catalog-2', name: 'Catalog 2' },
      { id: 'catalog-3', name: 'Catalog 3' },
      { id: 'modern-clean', name: 'Modern Clean' },
      { id: 'diagonal', name: 'Diagonal' },
      { id: 'waves', name: 'Waves' },
      { id: 'bold-gradient', name: 'Bold Gradient' },
      { id: 'split-screen', name: 'Split Screen' }
    ];
  }

  const templates = serverTemplates.filter(t => !hiddenTemplates.includes(t.id));

  // Sync template dropdown with server templates (picks up AI-generated ones)
  syncTemplateDropdown(serverTemplates);

  let html = '';

  // Saved custom templates section
  if (customTemplates.length > 0) {
    html += `<div class="templates-section-title" style="grid-column:1/-1;">Saved Templates</div>`;
    html += customTemplates.map(t => `
      <div class="template-card">
        <div class="template-custom-badge">Saved</div>
        <button class="template-delete" onclick="event.stopPropagation(); deleteCustomTemplate('${t.id}')" title="Delete">×</button>
        <div class="template-preview" onclick="previewCustomTemplate('${t.id}')">
          <img src="${t.imageBase64}" alt="${t.name}">
        </div>
        <div class="template-info" onclick="previewCustomTemplate('${t.id}')">
          <div>${t.name}</div>
          <div class="template-meta">${t.savedAt} · ${t.template} · ${t.dotStyle}</div>
        </div>
      </div>
    `).join('');
    html += `<div class="templates-section-title" style="grid-column:1/-1; margin-top:8px;">All Templates</div>`;
  }

  // Server templates
  if (templates.length === 0) {
    html += `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
        </svg>
        <p>All templates hidden</p>
        <button class="btn-secondary" onclick="resetTemplates()" style="margin-top:12px;">Restore All</button>
      </div>
    `;
  } else {
    html += templates.map(t => `
      <div class="template-card">
        <button class="template-delete" onclick="event.stopPropagation(); hideTemplate('${t.id}')" title="Hide template">×</button>
        <div class="template-preview" onclick="selectTemplate('${t.id}')">
          <img src="${API_URL}/api/template-preview/${t.id}"
               alt="${t.name}"
               loading="lazy"
               onerror="this.style.display='none'">
        </div>
        <div class="template-info" onclick="selectTemplate('${t.id}')">${t.name}</div>
      </div>
    `).join('');
  }

  grid.innerHTML = html;
}

// Add any missing templates to the #templateSelect dropdown
function syncTemplateDropdown(templates) {
  const select = document.getElementById('templateSelect');
  if (!select) return;
  templates.forEach(t => {
    const exists = Array.from(select.options).some(o => o.value === t.id);
    if (!exists) {
      select.add(new Option(t.name, t.id));
    }
  });
}

// Delete a saved custom template
function deleteCustomTemplate(id) {
  let customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  customTemplates = customTemplates.filter(t => t.id !== id);
  localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
  loadTemplates();
  showToast('Template deleted');
}

// Preview a saved custom template
function previewCustomTemplate(id) {
  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  const t = customTemplates.find(t => t.id === id);
  if (!t) return;

  state.generatedImages = [t.imageBase64];
  showModal();
}

// Hide template
function hideTemplate(id) {
  const hiddenTemplates = JSON.parse(localStorage.getItem('hiddenTemplates') || '[]');
  if (!hiddenTemplates.includes(id)) {
    hiddenTemplates.push(id);
    localStorage.setItem('hiddenTemplates', JSON.stringify(hiddenTemplates));
  }
  loadTemplates();
  showToast('Template hidden');
}

// Reset all templates
function resetTemplates() {
  localStorage.removeItem('hiddenTemplates');
  loadTemplates();
  showToast('All templates restored');
}

function selectTemplate(id) {
  state.template = id;
  const select = document.getElementById('templateSelect');
  if (select) {
    // Add option if not present
    const exists = Array.from(select.options).some(o => o.value === id);
    if (!exists) {
      const option = new Option(id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), id);
      select.add(option);
    }
    select.value = id;
  }
  showToast(`Template "${id}" selected`);

  // Switch to generate page
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-page="generate"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-generate').classList.add('active');
}

// Toast
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// AI CHATBOT DESIGN ASSISTANT
// ============================================

let aiChatHistory = [];
let aiCurrentDesign = null;
let aiCurrentImage = null;

function handleAIChatKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendAIMessage();
  }
}

async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const message = input.value.trim();
  if (!message) return;

  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));
  if (selectedJobData.length === 0) {
    showToast('Please select a job first', 'error');
    return;
  }

  const job = selectedJobData[0];
  input.value = '';

  addChatBubble(message, 'user');

  document.getElementById('aiSendBtn').disabled = true;
  addChatBubble('...', 'ai', 'ai-typing');

  try {
    const response = await fetch(`${API_URL}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: aiChatHistory,
        job,
        dotStyle: state.dotStyle,
        currentDesign: aiCurrentDesign
      })
    });

    const typing = document.querySelector('.ai-typing');
    if (typing) typing.remove();

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || err.error || 'AI error');
    }

    const data = await response.json();

    aiChatHistory.push({ role: 'user', content: message });
    aiChatHistory.push({ role: 'assistant', content: data.reply });

    addChatBubble(data.reply, 'ai');

    if (data.image) {
      aiCurrentDesign = data.appliedColors;
      aiCurrentImage = 'data:image/png;base64,' + data.image;

      const previewEl = document.getElementById('aiPreview');
      previewEl.classList.add('has-image');
      previewEl.innerHTML = `<img src="${aiCurrentImage}" alt="AI Design">`;
      document.getElementById('aiActions').style.display = 'flex';
    }

  } catch (error) {
    const typing = document.querySelector('.ai-typing');
    if (typing) typing.remove();
    addChatBubble('An error occurred: ' + error.message, 'ai');
    console.error('AI chat error:', error);
  } finally {
    document.getElementById('aiSendBtn').disabled = state.selectedJobs.size === 0;
  }
}

function addChatBubble(text, sender, extraClass = '') {
  const messages = document.getElementById('aiChatMessages');
  const bubble = document.createElement('div');
  bubble.className = `ai-chat-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'} ${extraClass}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function resetAIChat() {
  aiChatHistory = [];
  aiCurrentDesign = null;
  aiCurrentImage = null;

  document.getElementById('aiChatMessages').innerHTML = `
    <div class="ai-chat-bubble ai-bubble">
      Hello! Select a job and tell me what you want for the design. For example: <em>"Dark blue background, yellow salary"</em> or <em>"More minimal look"</em>
    </div>
  `;

  const previewEl = document.getElementById('aiPreview');
  previewEl.classList.remove('has-image');
  previewEl.innerHTML = `
    <div class="ai-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p>Select a job and describe your design</p>
    </div>
  `;
  document.getElementById('aiActions').style.display = 'none';
}

function downloadAIImage() {
  if (!aiCurrentImage) return;
  const link = document.createElement('a');
  link.href = aiCurrentImage;
  link.download = 'sagan-ai-design.png';
  link.click();
  showToast('Downloaded!', 'success');
}

function saveAIToTemplates() {
  if (!aiCurrentImage) return;
  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));
  const jobName = selectedJobData.length > 0 ? selectedJobData[0].title + ' (AI)' : 'AI Design';

  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  customTemplates.unshift({
    id: 'custom_' + Date.now(),
    name: jobName,
    imageBase64: aiCurrentImage,
    savedAt: new Date().toLocaleDateString('en-US'),
    template: 'ai-chat',
    dotStyle: state.dotStyle,
    logoStyle: state.logoStyle
  });
  localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
  showToast('Added to Templates!', 'success');
}

// Regenerate current AI design (re-sends last message)
function regenerateAI() {
  if (aiChatHistory.length < 2) return;
  const lastUserMsg = [...aiChatHistory].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) return;

  // Remove last exchange
  aiChatHistory = aiChatHistory.slice(0, -2);

  const input = document.getElementById('aiChatInput');
  input.value = lastUserMsg.content;
  sendAIMessage();
}

// Use the current AI template as base template for generation
function useAITemplate() {
  if (!aiCurrentImage) return;

  // Save to local templates
  saveAIToTemplates();
  showToast('AI design saved to templates', 'success');
}

// ============================================
// AI TEMPLATE GENERATOR
// ============================================

let aiTemplatePreviewImage = null;

// Selector state
const aiSelections = {
  colorTone: 'light',
  style: 'minimal',
  emphasis: 'balanced',
  palette: 'classic',
  logoStyle: 'dark',
  dotStyle: 'default',
  background: 'cream',
  decoration: 'none',
  outputType: 'single'
};

// Palette descriptions for prompt building
const PALETTE_PROMPTS = {
  'classic':    'cream background (#ede9e5), dark teal headings (#093a3e), Sagan blue (#25a2ff) accents, yellow (#f5b801) highlights',
  'dark':       'dark teal background (#093a3e), Sagan blue (#25a2ff) accents, white text, yellow (#f5b801) CTA button',
  'gold':       'very dark near-black background (#1a1a1a), gold/yellow (#f5b801) as primary accent, white text, blue (#25a2ff) secondary',
  'coral':      'cream background (#ede9e5), coral (#ff7455) as main accent, dark teal (#093a3e) text, yellow (#f5b801) highlights',
  'mint':       'very light mint background (#e8f8f0), mint green (#73e491) accents, dark teal (#093a3e) text, Sagan blue (#25a2ff)',
  'purple':     'very dark purple-navy background (#1a1040), purple (#796aff) as main accent, white text, gold (#f5b801) highlights',
  'blue-white': 'clean white background, Sagan blue (#25a2ff) as main color, dark teal (#093a3e) text, yellow (#f5b801) accents',
  'vibrant':    'cream background (#ede9e5), purple (#796aff) and coral (#ff7455) as lively accents, mint green (#73e491) touches'
};

const COLOR_TONE_PROMPTS = {
  'light':    'Light, airy feel with a pale or cream background. Bright and welcoming.',
  'dark':     'Dark, premium feel with a very dark background. Sophisticated and bold.',
  'colorful': 'Vibrant and energetic. Use multiple Sagan brand colors together. Eye-catching.'
};

const STYLE_PROMPTS = {
  'minimal':   'Clean, minimalist layout with lots of white space. Simple shapes, no clutter.',
  'bold':      'Bold, high-impact design. Large typography, strong contrast, confident layout.',
  'corporate': 'Professional, corporate look. Structured layout, clean sections, trustworthy feel.',
  'modern':    'Modern and contemporary. Geometric elements, dynamic layout, fresh design.'
};

const EMPHASIS_PROMPTS = {
  'balanced': 'Job title and salary are equally prominent.',
  'salary':   'The salary range should be the most visually dominant element — very large, highlighted.',
  'title':    'The job title should be the most visually dominant element — very large, full-width.'
};

const DOT_COLOR_MAP = {
  'default': ['#f5b801', '#73e491', '#25a2ff', '#ff7455', '#9e988f'],
  'vibrant': ['#796aff', '#25a2ff', '#73e491', '#ff7455', '#f5b801'],
  'warm':    ['#ff7455', '#f5b801', '#611f2c', '#9e988f', '#cac1b4'],
  'cool':    ['#796aff', '#25a2ff', '#093a3e', '#73e491', '#9e988f'],
  'none':    []
};

const BACKGROUND_PROMPTS = {
  'cream': 'BACKGROUND (REQUIRED — overrides palette): body background MUST be #ede9e5 (Sagan warm cream). Use dark text.',
  'white': 'BACKGROUND (REQUIRED — overrides palette): body background MUST be #ffffff (white). Use dark text.',
  'dark':  'BACKGROUND (REQUIRED — overrides palette): body background MUST be #093a3e (Sagan dark teal). Use white/light text throughout.',
  'blue':  'BACKGROUND (REQUIRED — overrides palette): body background MUST be #25a2ff (Sagan blue). Use white text and dark teal (#093a3e) accents throughout. Do NOT use a dark or black background.'
};

const OUTPUT_TYPE_PROMPTS = {
  'single':         '',
  'carousel-cover': 'OUTPUT TYPE — CAROUSEL COVER: Design this as the FIRST slide of a carousel series. Include a bold "We Are Hiring" or "Now Hiring" headline. Show {{jobTitle}} as one example job. Use the {{responsibilities}} area to visually list multiple job openings (treat each <li> as a job title pill/row). Make it eye-catching — it must grab attention as the cover slide. Less text detail, more visual impact.',
  'carousel-slide': 'OUTPUT TYPE — CAROUSEL DETAIL SLIDE: Design this as a mid-carousel slide showing full details for ONE job. Show all job fields: title (large), salary, location, schedule, responsibilities and qualifications in a structured layout. Add a subtle "slide X of Y" or swipe indicator visual cue at the bottom if it fits. Should feel like a continuation of a carousel series.'
};

const DECORATION_PROMPTS = {
  'none':           '',
  'side-blocks':    'RIGHT SIDE DECORATION (important): Absolutely position 4–5 tall rounded pill shapes (border-radius: 40px) stacked vertically on the right edge of the poster, each about 75px wide and 190px tall. Use these Sagan colors in order: #73e491, #25a2ff, #ff7455, #f5b801, #796aff. Let them overlap the right edge slightly (right: -20px). This is a signature Sagan visual element — make it prominent.',
  'corner-circles': 'CORNER DECORATION (important): Place 3–4 large colored circles (120–160px diameter) in the top-right corner, partially overlapping each other and the poster edge. Use Sagan brand colors: #73e491, #f5b801, #25a2ff, #ff7455. Also place 2–3 smaller circles (60–80px) in the bottom-right corner. Use absolute positioning.',
  'color-bar':      'BOTTOM BAR DECORATION (important): Add a full-width solid colored bar at the very bottom of the poster, about 90px tall. Use Sagan blue (#25a2ff) or yellow (#f5b801). Place the website URL and "Apply Now →" button inside this bar on a single row.',
  'watermark':      'BACKGROUND WATERMARK (important): Place the word "SAGAN" as a very large (300–400px font-size) watermark text in the background behind all content. Use a very low opacity (0.05–0.08) version of the primary color. Rotate it slightly (-15deg) or place it vertically along one side.'
};

function buildAIPrompt() {
  const extraNote = document.getElementById('aiTemplatePrompt').value.trim();
  const decorationPrompt = DECORATION_PROMPTS[aiSelections.decoration];

  let bgPrompt;
  if (aiSelections.background === 'custom') {
    const textVal = document.getElementById('customBgText').value.trim();
    const pickerVal = document.getElementById('customBgPicker').value;
    const customColor = textVal || pickerVal || '#ffffff';
    bgPrompt = `BACKGROUND (REQUIRED — overrides palette): body background MUST be ${customColor}. Choose text colors with strong contrast against this background.`;
  } else {
    bgPrompt = BACKGROUND_PROMPTS[aiSelections.background];
  }

  // Dot colors — send exact hex values so Claude uses the right colors
  const dotColors = DOT_COLOR_MAP[aiSelections.dotStyle] || DOT_COLOR_MAP.default;
  const dotPrompt = dotColors.length > 0
    ? `DECORATIVE DOTS (REQUIRED): use these exact colors for {{dot1Color}} through {{dot5Color}} and any dot/circle decorations: ${dotColors.join(', ')}.`
    : 'No decorative dots.';

  // Logo variant hint
  const logoPrompt = `Logo: always use the {{logoBase64}} placeholder for the Sagan logo image.`;

  const outputTypePrompt = OUTPUT_TYPE_PROMPTS[aiSelections.outputType] || '';
  const parts = [
    `Color palette: ${PALETTE_PROMPTS[aiSelections.palette]}`,
    bgPrompt,
    STYLE_PROMPTS[aiSelections.style],
    EMPHASIS_PROMPTS[aiSelections.emphasis],
    dotPrompt,
    logoPrompt
  ];
  if (outputTypePrompt) parts.push(outputTypePrompt);
  if (decorationPrompt) parts.push(decorationPrompt);
  if (extraNote) parts.push(`Additional request: ${extraNote}`);
  return parts.join(' ');
}

function syncCustomBg(value, source) {
  if (source === 'picker') {
    document.getElementById('customBgText').value = value;
  } else if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    document.getElementById('customBgPicker').value = value;
  }
}

// Init selector buttons
document.addEventListener('DOMContentLoaded', () => {
  // Selector buttons (color tone, style, emphasis, background, decoration)
  document.querySelectorAll('.sel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      document.querySelectorAll(`.sel-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiSelections[group] = btn.dataset.value;

      // Show/hide custom background input
      if (group === 'background') {
        const customRow = document.getElementById('customBgRow');
        if (customRow) customRow.style.display = btn.dataset.value === 'custom' ? 'flex' : 'none';
      }
    });
  });

  // Palette cards
  document.querySelectorAll('.palette-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      aiSelections.palette = card.dataset.palette;
    });
  });

  // AI Template logo buttons (separate from Generate tab)
  document.querySelectorAll('#page-ai-template .logo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-ai-template .logo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiSelections.logoStyle = btn.dataset.logo;
    });
  });

  // AI Template dot buttons (separate from Generate tab)
  document.querySelectorAll('#page-ai-template .dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-ai-template .dot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiSelections.dotStyle = btn.dataset.style;
    });
  });
});

function fillExample(text) {
  document.getElementById('aiTemplatePrompt').value = text;
}

async function generateAITemplate() {
  const prompt = buildAIPrompt();
  const nameInput = document.getElementById('aiTemplateName').value.trim();

  if (!prompt) {
    showToast('Please describe your template', 'error');
    return;
  }

  const templateName = nameInput || ('ai-' + Date.now());
  const btn = document.getElementById('aiTemplateGenBtn');
  btn.disabled = true;
  btn.textContent = 'Generating with AI...';

  const previewWrap = document.getElementById('aiTemplatePreviewWrap');
  previewWrap.innerHTML = `<div class="loading" style="padding:80px 24px;"><div class="spinner"></div><p>AI is creating your template...</p></div>`;

  try {
    const response = await fetch(`${API_URL}/api/ai-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, templateName })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || err.error || 'Generation failed');
    }

    const data = await response.json();
    showToast(`Template "${data.templateId}" created!`, 'success');

    // Now preview it (pass dot/logo style so preview matches selections)
    const previewResponse = await fetch(`${API_URL}/api/template-preview/${data.templateId}?dotStyle=${aiSelections.dotStyle}&logoStyle=${aiSelections.logoStyle}`);
    if (previewResponse.ok) {
      const blob = await previewResponse.blob();
      const reader = new FileReader();
      reader.onload = () => {
        aiTemplatePreviewImage = reader.result;
        previewWrap.innerHTML = `<img src="${aiTemplatePreviewImage}" alt="Generated Template" style="width:100%;border-radius:8px;">`;
        document.getElementById('aiTemplatePreviewActions').style.display = 'flex';
      };
      reader.readAsDataURL(blob);
    } else {
      previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">Template saved as <strong>${data.templateId}</strong>.<br>View it in the Templates gallery.</div>`;
    }

    // Save to history
    saveAITemplateHistory(data.templateId, prompt);

    // Add to template dropdown immediately (so it's usable in Generate Images tab)
    const select = document.getElementById('templateSelect');
    if (select) {
      const exists = Array.from(select.options).some(o => o.value === data.templateId);
      if (!exists) {
        const label = templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        select.add(new Option(`${label} (AI)`, data.templateId));
      }
    }

    // Refresh template gallery history
    loadAITemplateHistory();

    // Clear input
    document.getElementById('aiTemplateName').value = '';

  } catch (error) {
    console.error('AI template error:', error);
    previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Error: ${error.message}</div>`;
    showToast('Failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Template with AI';
  }
}

function downloadAITemplatePreview() {
  if (!aiTemplatePreviewImage) return;
  const link = document.createElement('a');
  link.href = aiTemplatePreviewImage;
  link.download = 'sagan-ai-template.png';
  link.click();
  showToast('Downloaded!', 'success');
}

function saveAITemplateToGallery() {
  if (!aiTemplatePreviewImage) return;

  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  const latest = history[0];
  const name = latest ? latest.templateId : ('AI Template ' + new Date().toLocaleDateString('en-US'));

  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  customTemplates.unshift({
    id: 'custom_' + Date.now(),
    name,
    imageBase64: aiTemplatePreviewImage,
    savedAt: new Date().toLocaleDateString('en-US'),
    template: latest ? latest.templateId : 'ai-template',
    dotStyle: aiSelections.dotStyle,
    logoStyle: aiSelections.logoStyle
  });
  localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
  showToast('Saved to Template Gallery!', 'success');
}

function saveAITemplateHistory(templateId, prompt) {
  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  history.unshift({
    templateId,
    prompt: prompt.substring(0, 80) + (prompt.length > 80 ? '...' : ''),
    createdAt: new Date().toLocaleDateString('en-US')
  });
  // Keep only last 10
  localStorage.setItem('aiTemplateHistory', JSON.stringify(history.slice(0, 10)));
}

function loadAITemplateHistory() {
  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  const container = document.getElementById('aiTemplateHistory');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<div style="padding:24px;color:#999;font-size:14px;text-align:center;">No templates generated yet</div>';
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="ai-history-item" onclick="useHistoryTemplate('${h.templateId}')">
      <div class="ai-history-name">${h.templateId}</div>
      <div class="ai-history-prompt">${h.prompt}</div>
      <div class="ai-history-date">${h.createdAt}</div>
    </div>
  `).join('');
}

function useHistoryTemplate(templateId) {
  selectTemplate(templateId);
  showToast(`Template "${templateId}" selected for generation`);
}

// Post to LinkedIn via Make webhook
async function postToLinkedIn() {
  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));
  if (selectedJobData.length === 0) return;

  const linkedinBtn = document.getElementById('linkedinBtn');
  linkedinBtn.disabled = true;
  linkedinBtn.textContent = 'Sending to Make...';

  try {
    const response = await fetch(`${API_URL}/api/webhook/linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs: selectedJobData,
        template: state.template,
        dotStyle: state.dotStyle,
        logoStyle: state.logoStyle,
        outputType: state.outputType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send');
    }

    showToast('Sent to LinkedIn automation!', 'success');
  } catch (error) {
    console.error('LinkedIn error:', error);
    showToast('Failed to send: ' + error.message, 'error');
  } finally {
    linkedinBtn.disabled = false;
    linkedinBtn.textContent = 'Post to LinkedIn';
    updateSelectedInfo();
  }
}

// Expose to global
window.toggleJob = toggleJob;
window.selectTemplate = selectTemplate;
window.downloadImage = downloadImage;
window.downloadAll = downloadAll;
window.closeModal = closeModal;
window.loadJobs = loadJobs;
window.regenerateAI = regenerateAI;
window.useAITemplate = useAITemplate;
window.hideTemplate = hideTemplate;
window.resetTemplates = resetTemplates;
window.filterJobs = filterJobs;
window.clearAllSelections = clearAllSelections;
window.saveToTemplates = saveToTemplates;
window.deleteCustomTemplate = deleteCustomTemplate;
window.previewCustomTemplate = previewCustomTemplate;
window.postToLinkedIn = postToLinkedIn;
window.sendAIMessage = sendAIMessage;
window.handleAIChatKey = handleAIChatKey;
window.resetAIChat = resetAIChat;
window.downloadAIImage = downloadAIImage;
window.saveAIToTemplates = saveAIToTemplates;
window.generateAITemplate = generateAITemplate;
window.downloadAITemplatePreview = downloadAITemplatePreview;
window.fillExample = fillExample;
window.syncCustomBg = syncCustomBg;
window.saveAITemplateToGallery = saveAITemplateToGallery;
window.useHistoryTemplate = useHistoryTemplate;
