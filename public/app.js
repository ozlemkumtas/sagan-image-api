// Sagan Image Generator - App

const API_URL = window.location.origin;

// State
let state = {
  jobs: [],
  selectedJobs: new Set(),
  template: 'catalog-1',
  dotStyle: 'default',
  outputType: 'single',
  generatedImages: [],
  aiTemplateHtml: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initToggle();
  initDotStyle();
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
      updateSelectedInfo();
    });
  });
}

// Dot Style
function initDotStyle() {
  document.querySelectorAll('.dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dotStyle = btn.dataset.style;
    });
  });
}

// Template Select
function initTemplateSelect() {
  const select = document.getElementById('templateSelect');
  select.addEventListener('change', () => {
    state.template = select.value;
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
      // Load demo data
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
      responsibilities: ['Manage AR/AP processes', 'Handle invoicing'],
      qualifications: ['2+ years experience', 'Detail-oriented']
    },
    {
      id: '2',
      title: 'Marketing Manager',
      jobCode: 'HR37375',
      salary: '$2,500 - $3,500',
      location: '100% Remote',
      schedule: 'M-F, 9AM-5PM EST',
      responsibilities: ['Lead marketing campaigns', 'Manage team'],
      qualifications: ['5+ years experience', 'MBA preferred']
    },
    {
      id: '3',
      title: 'Video Editor',
      jobCode: 'HR37376',
      salary: '$1,200 - $1,800',
      location: '100% Remote',
      schedule: 'Flexible',
      responsibilities: ['Edit promotional videos', 'Create content'],
      qualifications: ['Adobe Premiere Pro', 'Portfolio required']
    },
    {
      id: '4',
      title: 'Senior Executive Assistant',
      jobCode: 'HR37377',
      salary: '$2,500 - $3,000',
      location: '100% Remote',
      schedule: 'M-F, 8AM-5PM PST',
      responsibilities: ['Calendar management', 'Travel coordination'],
      qualifications: ['3+ years EA experience', 'Excellent communication']
    },
    {
      id: '5',
      title: 'Payroll Specialist',
      jobCode: 'HR37378',
      salary: '$1,500 - $2,000',
      location: '100% Remote',
      schedule: 'M-F, 9AM-6PM EST',
      responsibilities: ['Process payroll', 'Tax filings'],
      qualifications: ['Payroll experience', 'Attention to detail']
    }
  ];
}

// Render Jobs
function renderJobs() {
  const container = document.getElementById('jobsList');

  if (state.jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No jobs found. Add jobs in Airtable.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.jobs.map(job => `
    <div class="job-card ${state.selectedJobs.has(job.id) ? 'selected' : ''}"
         data-id="${job.id}"
         onclick="toggleJob('${job.id}')">
      <div class="job-checkbox"></div>
      <div class="job-info">
        <div class="job-title">${job.title}</div>
        <div class="job-meta">
          <span class="job-salary">${job.salary}</span>
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

  // Update UI
  document.querySelectorAll('.job-card').forEach(card => {
    card.classList.toggle('selected', state.selectedJobs.has(card.dataset.id));
  });

  updateSelectedInfo();
}

// Update Selected Info
function updateSelectedInfo() {
  const count = state.selectedJobs.size;
  const info = document.getElementById('selectedInfo');
  const btn = document.getElementById('generateBtn');

  if (count === 0) {
    info.textContent = 'Select jobs to generate images';
    btn.disabled = true;
    btn.textContent = 'Generate Images';
  } else if (state.outputType === 'carousel' && count < 2) {
    info.textContent = `${count} job selected - Need 2+ for carousel`;
    btn.disabled = true;
    btn.textContent = 'Select 2+ jobs for carousel';
  } else {
    const type = state.outputType === 'carousel' ? 'Carousel' : `${count} Image${count > 1 ? 's' : ''}`;
    info.textContent = `${count} job${count > 1 ? 's' : ''} selected`;
    btn.disabled = false;
    btn.textContent = `Generate ${type}`;
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
      // Generate carousel
      const response = await fetch(`${API_URL}/generate-carousel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: selectedJobData,
          dotStyle: state.dotStyle
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
      // Generate single images
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
            dotStyle: state.dotStyle
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

  body.innerHTML = state.generatedImages.map((img, i) => `
    <div class="image-item">
      <img src="${img}" alt="Generated image ${i + 1}">
      <button class="image-download" onclick="downloadImage(${i})">Download</button>
    </div>
  `).join('');

  modal.classList.add('open');
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

// Load Templates
function loadTemplates() {
  // Get hidden templates from localStorage
  const hiddenTemplates = JSON.parse(localStorage.getItem('hiddenTemplates') || '[]');

  const allTemplates = [
    { id: 'catalog-1', name: 'Catalog 1' },
    { id: 'catalog-2', name: 'Catalog 2' },
    { id: 'catalog-3', name: 'Catalog 3' },
    { id: 'modern-clean', name: 'Modern Clean' },
    { id: 'diagonal', name: 'Diagonal' },
    { id: 'waves', name: 'Waves' },
    { id: 'bold-gradient', name: 'Bold Gradient' },
    { id: 'split-screen', name: 'Split Screen' }
  ];

  // Filter out hidden templates
  const templates = allTemplates.filter(t => !hiddenTemplates.includes(t.id));

  const grid = document.getElementById('templatesGrid');

  if (templates.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
        </svg>
        <p>All templates hidden</p>
        <button class="btn-secondary" onclick="resetTemplates()" style="margin-top:12px;">Restore All</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = templates.map(t => `
    <div class="template-card">
      <button class="template-delete" onclick="event.stopPropagation(); hideTemplate('${t.id}')" title="Hide template">×</button>
      <div class="template-preview" onclick="selectTemplate('${t.id}')">
        <img src="${API_URL}/api/template-preview/${t.id}"
             alt="${t.name}"
             onerror="this.style.display='none'">
      </div>
      <div class="template-info" onclick="selectTemplate('${t.id}')">${t.name}</div>
    </div>
  `).join('');
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
  document.getElementById('templateSelect').value = id;
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

// AI Template Generation
const aiPromptEl = document.getElementById('aiPrompt');
const aiGenerateBtn = document.getElementById('aiGenerateBtn');

// Enable AI button when there's text and a job selected
aiPromptEl.addEventListener('input', updateAIButton);

function updateAIButton() {
  const hasPrompt = aiPromptEl.value.trim().length > 10;
  const hasJob = state.selectedJobs.size > 0;
  aiGenerateBtn.disabled = !(hasPrompt && hasJob);
}

// Also update when job selection changes
const originalUpdateSelectedInfo = updateSelectedInfo;
updateSelectedInfo = function() {
  originalUpdateSelectedInfo();
  updateAIButton();
};

aiGenerateBtn.addEventListener('click', generateAITemplate);

async function generateAITemplate() {
  const prompt = aiPromptEl.value.trim();
  const selectedJobData = state.jobs.filter(job => state.selectedJobs.has(job.id));

  if (!prompt || selectedJobData.length === 0) return;

  const job = selectedJobData[0]; // Use first selected job for preview

  aiGenerateBtn.disabled = true;
  aiGenerateBtn.textContent = '✨ Generating...';

  document.getElementById('aiPreview').innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>AI is creating your template...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_URL}/api/ai-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        job,
        dotStyle: state.dotStyle
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate');
    }

    const data = await response.json();

    if (data.image) {
      state.aiTemplateHtml = data.html;
      const previewEl = document.getElementById('aiPreview');
      previewEl.classList.add('has-image');
      previewEl.innerHTML = `
        <img src="data:image/png;base64,${data.image}" alt="AI Generated Template">
      `;
      document.getElementById('aiActions').style.display = 'flex';
      showToast('Design generated!', 'success');
    } else {
      throw new Error('No image returned');
    }

  } catch (error) {
    console.error('AI Error:', error);
    document.getElementById('aiPreview').innerHTML = `
      <div class="ai-placeholder">
        <span>⚠️</span>
        <p>${error.message || 'Failed to generate. Try again.'}</p>
      </div>
    `;
    showToast('AI generation failed', 'error');
  } finally {
    aiGenerateBtn.disabled = false;
    aiGenerateBtn.textContent = '✨ Generate Custom Template';
    updateAIButton();
  }
}

function regenerateAI() {
  generateAITemplate();
}

function useAITemplate() {
  if (!state.aiTemplateHtml) return;

  // For now, just download the generated image
  const img = document.querySelector('#aiPreview img');
  if (img) {
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'sagan-custom-template.png';
    link.click();
    showToast('Template downloaded!', 'success');
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
