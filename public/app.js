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

// Template category sets for dropdown filtering
const CAROUSEL_TEMPLATE_IDS = new Set([
  'carousel-cover', 'carousel-detail', 'cover-default'
]);
const CAROUSEL_COVER_IDS = new Set(['carousel-cover', 'cover-default']);
const MULTI_JOB_IDS = new Set(['catalog-multi', 'search-style', 'multi-job']);

// Template gallery tab state
let templateTab = 'single';

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
      (job.location || '').toLowerCase().includes(searchQuery) ||
      (job.requestId || '').toLowerCase().includes(searchQuery) ||
      (job.requestName || '').toLowerCase().includes(searchQuery)
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

  container.innerHTML = filteredJobs.map(job => {
    const requestBadge = (job.requestId || job.requestName)
      ? `<div class="job-request-badge">${[job.requestId, job.requestName].filter(Boolean).join(' · ')}</div>`
      : '';
    return `
    <div class="job-card ${state.selectedJobs.has(job.id) ? 'selected' : ''}"
         data-id="${job.id}"
         onclick="toggleJob('${job.id}')">
      <div class="job-checkbox"></div>
      <div class="job-info">
        <div class="job-title">${job.title}</div>
        ${requestBadge}
        <div class="job-meta">
          <span class="job-salary">${job.salary || 'Salary TBD'}</span>
          <span>${job.location}</span>
          <span>${job.schedule}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');
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

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to generate carousel');
      }

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

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const msg = err.error || err.message || 'Failed to generate';
          // If AI template not found, give a clearer actionable message
          if (state.template.startsWith('ai-') && msg.toLowerCase().includes('not found')) {
            throw new Error(`AI template "${state.template}" was lost after a server restart. Please select a built-in template instead.`);
          }
          throw new Error(msg);
        }

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
    showToast(error.message || 'Failed to generate images', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Images';
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

function switchTemplateTab(tab) {
  templateTab = tab;
  document.querySelectorAll('.template-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  loadTemplates();
}

async function loadTemplates() {
  const hiddenTemplates = JSON.parse(localStorage.getItem('hiddenTemplates') || '[]');
  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  const aiHistory = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
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

  // Build AI outputType map from history
  const aiOutputTypeMap = {};
  aiHistory.forEach(h => {
    if (h.outputType) aiOutputTypeMap[h.templateId] = h.outputType;
  });

  // Sync template dropdowns with server templates (picks up AI-generated ones)
  syncTemplateDropdown(serverTemplates, aiOutputTypeMap);

  // Filter hidden
  const visibleTemplates = serverTemplates.filter(t => !hiddenTemplates.includes(t.id));

  // Categorize: carousel = known carousel IDs + multi-job IDs + AI carousel types
  const isCarousel = (t) => {
    if (CAROUSEL_TEMPLATE_IDS.has(t.id) || MULTI_JOB_IDS.has(t.id)) return true;
    const ot = aiOutputTypeMap[t.id];
    return ot === 'carousel-cover' || ot === 'carousel-slide';
  };

  const filteredTemplates = visibleTemplates.filter(t =>
    templateTab === 'single' ? !isCarousel(t) : isCarousel(t)
  );

  let html = '';

  // Saved custom templates only on single tab
  if (templateTab === 'single' && customTemplates.length > 0) {
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
    if (filteredTemplates.length > 0) {
      html += `<div class="templates-section-title" style="grid-column:1/-1; margin-top:8px;">All Templates</div>`;
    }
  }

  // Server templates
  if (filteredTemplates.length === 0) {
    html += `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
        </svg>
        <p>No ${templateTab} templates found.</p>
        ${templateTab === 'carousel' ? '<p style="font-size:13px;margin-top:8px;">Generate carousel templates in the AI Template tab.</p>' : ''}
        <button class="btn-secondary" onclick="resetTemplates()" style="margin-top:12px;">Restore Hidden</button>
      </div>
    `;
  } else {
    html += filteredTemplates.map(t => {
      const aiLabel = aiOutputTypeMap[t.id] ? `<div class="template-meta">AI · ${aiOutputTypeMap[t.id]}</div>` : '';
      const safeName = t.name.replace(/'/g, "\\'");
      return `
        <div class="template-card">
          <button class="template-delete" onclick="event.stopPropagation(); hideTemplate('${t.id}')" title="Hide template">×</button>
          <div class="template-preview" onclick="showTemplatePreview('${t.id}', '${safeName}')">
            <img src="${API_URL}/api/template-preview/${t.id}"
                 alt="${t.name}"
                 loading="lazy"
                 onerror="this.style.display='none'">
          </div>
          <div class="template-info" onclick="showTemplatePreview('${t.id}', '${safeName}')">
            ${t.name}
            ${aiLabel}
          </div>
        </div>
      `;
    }).join('');
  }

  grid.innerHTML = html;
}

// Sync template dropdowns with server templates (filtered by type)
function syncTemplateDropdown(templates, aiOutputTypeMap = {}) {
  const singleSelect = document.getElementById('templateSelect');
  const coverSelect = document.getElementById('carouselCoverSelect');
  const slideSelect = document.getElementById('carouselDetailSelect');

  templates.forEach(t => {
    const outputType = aiOutputTypeMap[t.id];

    if (outputType === 'carousel-cover' || CAROUSEL_COVER_IDS.has(t.id)) {
      // Add to cover select only
      if (coverSelect && !Array.from(coverSelect.options).some(o => o.value === t.id)) {
        coverSelect.add(new Option(`${t.name} (AI)`, t.id));
      }
    } else if (outputType === 'carousel-slide') {
      // Add to slide select only
      if (slideSelect && !Array.from(slideSelect.options).some(o => o.value === t.id)) {
        slideSelect.add(new Option(`${t.name} (AI)`, t.id));
      }
    } else if (!CAROUSEL_TEMPLATE_IDS.has(t.id) && !MULTI_JOB_IDS.has(t.id)) {
      // Single template — add to single select
      if (singleSelect && !Array.from(singleSelect.options).some(o => o.value === t.id)) {
        singleSelect.add(new Option(t.name, t.id));
      }
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

// Preview a saved custom template — uses the new preview modal
function previewCustomTemplate(id) {
  const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  const t = customTemplates.find(ct => ct.id === id);
  if (!t) return;
  // Show base64 image directly; "Use This Template" will select the original server template
  showTemplatePreview(id, t.name, t.imageBase64, t.template || id);
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

// ============================================
// TEMPLATE PREVIEW MODAL
// ============================================

let templatePreviewId = null;
let templatePreviewTitle = '';

// Modification mode state
let _modifyTemplateId = null;
let _modifyTemplateName = null;
let _modifyLogoStyle = 'dark';
let _modifyDotStyle = 'default';

// directSrc: base64/url to display directly (skip API fetch)
// useId: the template ID passed to selectTemplate on "Use This Template" (overrides id)
function showTemplatePreview(id, name, directSrc, useId) {
  templatePreviewId = useId || id;
  templatePreviewTitle = name || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  document.getElementById('templatePreviewTitle').textContent = templatePreviewTitle;

  const img = document.getElementById('templatePreviewImg');
  const spinner = document.getElementById('templatePreviewSpinner');

  img.style.display = 'none';
  img.src = '';

  if (directSrc) {
    // Use image directly (saved/custom templates with base64)
    spinner.style.display = 'none';
    img.src = directSrc;
    img.style.display = 'block';
  } else {
    spinner.style.display = 'block';
    img.onload = () => {
      img.style.display = 'block';
      spinner.style.display = 'none';
    };
    img.onerror = () => {
      spinner.innerHTML = '<p style="color:#999;font-size:14px;padding:40px;">Preview not available</p>';
    };
    img.src = `${API_URL}/api/template-preview/${id}`;
  }

  document.getElementById('templatePreviewModal').classList.add('open');
}

function closeTemplatePreview() {
  document.getElementById('templatePreviewModal').classList.remove('open');
  templatePreviewId = null;
  templatePreviewTitle = '';
}

function usePreviewTemplate() {
  if (!templatePreviewId) return;
  const id = templatePreviewId;
  closeTemplatePreview();
  selectTemplate(id);
}

function modifyWithAI() {
  // Capture before closing (closeTemplatePreview clears these)
  _modifyTemplateId = templatePreviewId;
  _modifyTemplateName = templatePreviewTitle;
  closeTemplatePreview();

  // Navigate to AI Template tab
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-page="ai-template"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-ai-template').classList.add('active');
  loadAITemplateHistory();

  // Activate modification mode UI
  showModifyMode();
}

function showModifyMode() {
  document.getElementById('modifyModeBanner').style.display = 'flex';
  document.getElementById('modifyLogoGroup').style.display = 'flex';
  document.getElementById('modifyDotGroup').style.display = 'flex';
  document.getElementById('modifyRequestGroup').style.display = 'flex';
  document.getElementById('regularFormOptions').style.display = 'none';
  document.getElementById('modifyModeTemplateName').textContent = _modifyTemplateName || _modifyTemplateId || '—';

  // Prefill template name with "-v2" suffix
  const nameInput = document.getElementById('aiTemplateName');
  if (nameInput) {
    nameInput.value = (_modifyTemplateName || _modifyTemplateId || 'modified').replace(/\s+/g, '-').toLowerCase() + '-v2';
  }

  // Reset state and active buttons for logo
  _modifyLogoStyle = 'dark';
  document.querySelectorAll('#modifyLogoGroup .logo-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.modlogo === 'dark');
    btn.onclick = () => {
      document.querySelectorAll('#modifyLogoGroup .logo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _modifyLogoStyle = btn.dataset.modlogo;
    };
  });

  // Reset state and active buttons for dot
  _modifyDotStyle = 'default';
  document.querySelectorAll('#modifyDotGroup .dot-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.moddot === 'default');
    btn.onclick = () => {
      document.querySelectorAll('#modifyDotGroup .dot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _modifyDotStyle = btn.dataset.moddot;
    };
  });

  // Clear and focus modification request
  const modReq = document.getElementById('modifyRequest');
  if (modReq) { modReq.value = ''; modReq.focus(); }
}

function cancelModifyMode() {
  _modifyTemplateId = null;
  _modifyTemplateName = null;
  _modifyLogoStyle = 'dark';
  _modifyDotStyle = 'default';
  document.getElementById('modifyModeBanner').style.display = 'none';
  document.getElementById('modifyLogoGroup').style.display = 'none';
  document.getElementById('modifyDotGroup').style.display = 'none';
  document.getElementById('modifyRequestGroup').style.display = 'none';
  document.getElementById('regularFormOptions').style.display = 'block';
  const modReq = document.getElementById('modifyRequest');
  if (modReq) modReq.value = '';
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
// AI TEMPLATE GENERATOR
// ============================================

let aiTemplatePreviewImage = null;

// Selector state
const aiSelections = {
  colorTone: 'light',
  style: 'minimal',
  emphasis: 'balanced',
  headlineFontSize: 'medium',
  headlineColor: 'dark-teal',
  headlineCustomColor: '',
  titleColor: 'auto',
  titleCustomColor: '',
  salaryColor: 'auto',
  salaryCustomColor: '',
  palette: 'classic',
  logoStyle: 'dark',
  dotStyle: 'default',
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


const OUTPUT_TYPE_PROMPTS = {
  'single':         '',
  'carousel-cover': 'OUTPUT TYPE — CAROUSEL COVER: Design this as the cover/first slide of a carousel. Show {{jobTitle}} as one example job. Use the {{responsibilities}} area to visually list multiple job openings (treat each <li> as a job title pill/row). Make it eye-catching. Do NOT include any slide numbering ("1/4"), swipe indicators, or progress dots. Keep the footer clean — only the website URL, nothing overlapping.',
  'carousel-slide': 'OUTPUT TYPE — CAROUSEL DETAIL SLIDE: Design this as a detail slide showing full details for ONE job. Show all job fields: title (large), salary, location, schedule, responsibilities and qualifications in a structured layout. Do NOT include any slide numbering ("1/4", "slide X of Y"), swipe indicators ("Swipe to explore →"), or progress dots. Keep the footer clean — only the website URL www.saganrecruitment.com/career, nothing else overlapping it.'
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

  // Dot colors — send exact hex values so Claude uses the right colors
  const dotColors = DOT_COLOR_MAP[aiSelections.dotStyle] || DOT_COLOR_MAP.default;
  const dotPrompt = dotColors.length > 0
    ? `DECORATIVE DOTS (REQUIRED): use these exact colors for {{dot1Color}} through {{dot5Color}} and any dot/circle decorations: ${dotColors.join(', ')}.`
    : 'No decorative dots.';

  // Logo variant hint
  const logoPrompt = `Logo: always use the {{logoBase64}} placeholder for the Sagan logo image.`;

  const outputTypePrompt = OUTPUT_TYPE_PROMPTS[aiSelections.outputType] || '';

  let palettePrompt;
  if (aiSelections.palette === 'custom') {
    const c1 = document.getElementById('cp1')?.value || '#25a2ff';
    const c2 = document.getElementById('cp2')?.value || '#f5b801';
    const c3 = document.getElementById('cp3')?.value || '#ff7455';
    const c4 = document.getElementById('cp4')?.value || '#093a3e';
    palettePrompt = `CUSTOM COLOR PALETTE (use ONLY these exact colors — REQUIRED): Background: ${c1}, Primary/headings: ${c2}, Accent/buttons/highlights: ${c3}, Text/body: ${c4}. Build the entire design around these specific colors. Do not substitute with other colors.`;
  } else {
    palettePrompt = `Color palette: ${PALETTE_PROMPTS[aiSelections.palette]}`;
  }

  const parts = [
    palettePrompt,
    STYLE_PROMPTS[aiSelections.style],
    EMPHASIS_PROMPTS[aiSelections.emphasis],
    dotPrompt,
    logoPrompt
  ];
  if (outputTypePrompt) parts.push(outputTypePrompt);
  if (decorationPrompt) parts.push(decorationPrompt);

  // Headline text (Carousel Cover only)
  if (aiSelections.outputType === 'carousel-cover') {
    const hlText = (document.getElementById('headlineText')?.value.trim()) || 'We are Hiring';
    const fontSizeMap = { small: '32–40px', medium: '48–58px', large: '64–74px', xlarge: '82–96px' };
    const colorMap = {
      'dark-teal': '#093a3e',
      'blue': '#25a2ff',
      'white': '#ffffff',
      'yellow': '#f5b801',
      'custom': aiSelections.headlineCustomColor || '#093a3e'
    };
    const hlColor = colorMap[aiSelections.headlineColor] || '#093a3e';
    const hlSize = fontSizeMap[aiSelections.headlineFontSize] || '48–58px';
    parts.push(`HEADLINE TEXT (REQUIRED): Display the text "${hlText}" very prominently near the top of the design. Font-size: ${hlSize}. Color: ${hlColor}. Use PP Mori SemiBold (font-weight 600). This is the main attention-grabbing heading of the carousel cover.`);
  }

  // Job Title & Salary color
  if (aiSelections.titleColor === 'auto' && aiSelections.salaryColor === 'auto') {
    parts.push(`JOB TITLE and SALARY colors: analyze the background and palette, then automatically choose the most readable and visually striking colors for each. Prioritize strong contrast and brand consistency.`);
  } else {
    const titleHex  = aiSelections.titleColor  === 'custom' ? (aiSelections.titleCustomColor  || '#ffffff') : null;
    const salaryHex = aiSelections.salaryColor === 'custom' ? (aiSelections.salaryCustomColor || '#ffffff') : null;
    const titlePart  = titleHex  ? `JOB TITLE ({{jobTitle}}) must use color ${titleHex}.`  : `JOB TITLE color: auto-choose the best readable color for the design.`;
    const salaryPart = salaryHex ? `SALARY VALUE ({{salary}}) must use color ${salaryHex}.` : `SALARY color: auto-choose the best readable color for the design.`;
    parts.push(`${titlePart} ${salaryPart}`);
  }

  if (extraNote) parts.push(`Additional request: ${extraNote}`);
  return parts.join(' ');
}

function syncTitleColor(value, source) {
  aiSelections.titleCustomColor = value;
  if (source === 'picker') {
    document.getElementById('titleColorText').value = value;
  } else if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    document.getElementById('titleColorPicker').value = value;
  }
}

function syncSalaryColor(value, source) {
  aiSelections.salaryCustomColor = value;
  if (source === 'picker') {
    document.getElementById('salaryColorText').value = value;
  } else if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    document.getElementById('salaryColorPicker').value = value;
  }
}

function syncHeadlineColor(value, source) {
  aiSelections.headlineCustomColor = value;
  if (source === 'picker') {
    document.getElementById('headlineColorText').value = value;
  } else if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    document.getElementById('headlineColorPicker').value = value;
  }
}

function updateCustomPalette() {
  const c1 = document.getElementById('cp1')?.value || '#25a2ff';
  const c2 = document.getElementById('cp2')?.value || '#f5b801';
  const c3 = document.getElementById('cp3')?.value || '#ff7455';
  const c4 = document.getElementById('cp4')?.value || '#093a3e';
  // Sync swatches on the Custom card
  const s = (id, color) => { const el = document.getElementById(id); if (el) el.style.background = color; };
  s('customPalSwatch1', c1);
  s('customPalSwatch2', c2);
  s('customPalSwatch3', c3);
  s('customPalSwatch4', c4);
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

      // Show/hide headline text section for Carousel Cover
      if (group === 'outputType') {
        const hlGroup = document.getElementById('headlineTextGroup');
        if (hlGroup) hlGroup.style.display = btn.dataset.value === 'carousel-cover' ? 'flex' : 'none';
      }

      // Show/hide headline custom color picker
      if (group === 'headlineColor') {
        const row = document.getElementById('headlineColorPickerRow');
        if (row) row.style.display = btn.dataset.value === 'custom' ? 'flex' : 'none';
      }

      // Show/hide title/salary custom color pickers
      if (group === 'titleColor') {
        const row = document.getElementById('titleColorPickerRow');
        if (row) row.style.display = btn.dataset.value === 'custom' ? 'flex' : 'none';
      }
      if (group === 'salaryColor') {
        const row = document.getElementById('salaryColorPickerRow');
        if (row) row.style.display = btn.dataset.value === 'custom' ? 'flex' : 'none';
      }
    });
  });

  // Palette cards
  document.querySelectorAll('.palette-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      aiSelections.palette = card.dataset.palette;
      const row = document.getElementById('customPaletteRow');
      if (row) row.style.display = card.dataset.palette === 'custom' ? 'flex' : 'none';
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

// Create a small JPEG thumbnail from a base64 image (for localStorage storage)
function createThumbnail(base64, maxSize = 800) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

async function generateAITemplate() {
  const nameInput = document.getElementById('aiTemplateName').value.trim();
  const isModify = !!_modifyTemplateId;
  const modReqText = isModify ? document.getElementById('modifyRequest').value.trim() : '';

  // If modification mode with empty textarea AND no special changes needed → just re-preview
  // Exception: if dotStyle=none, we need AI to actually remove dot elements from HTML
  if (isModify && !modReqText && _modifyDotStyle !== 'none') {
    const previewWrap = document.getElementById('aiTemplatePreviewWrap');
    previewWrap.innerHTML = `<div class="loading" style="padding:80px 24px;"><div class="spinner"></div><p>Applying changes...</p></div>`;
    try {
      const previewResponse = await fetch(`${API_URL}/api/template-preview/${_modifyTemplateId}?dotStyle=${_modifyDotStyle}&logoStyle=${_modifyLogoStyle}`);
      if (previewResponse.ok) {
        const blob = await previewResponse.blob();
        const reader = new FileReader();
        reader.onload = () => {
          aiTemplatePreviewImage = reader.result;
          previewWrap.innerHTML = `<img src="${aiTemplatePreviewImage}" alt="Preview" style="width:100%;border-radius:8px;">`;
          document.getElementById('aiTemplatePreviewActions').style.display = 'flex';
        };
        reader.readAsDataURL(blob);
      } else {
        previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Preview failed — this template may have been removed after a server restart.</div>`;
      }
    } catch (err) {
      previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Preview failed: ${err.message}</div>`;
    }
    return;
  }

  const prompt = isModify ? '' : buildAIPrompt();
  if (!isModify && !prompt) {
    showToast('Please describe your template', 'error');
    return;
  }

  const templateName = nameInput || (isModify ? (_modifyTemplateId + '-v2') : ('ai-' + Date.now()));
  const btn = document.getElementById('aiTemplateGenBtn');
  btn.disabled = true;
  btn.textContent = isModify ? 'Applying changes...' : 'Generating with AI...';

  const previewWrap = document.getElementById('aiTemplatePreviewWrap');
  previewWrap.innerHTML = `<div class="loading" style="padding:80px 24px;"><div class="spinner"></div><p>${isModify ? 'AI is modifying your template...' : 'AI is creating your template...'}</p></div>`;

  // If none dots selected in modify mode, append removal instruction to Claude
  let finalModReq = modReqText;
  if (isModify && _modifyDotStyle === 'none') {
    const dotRemoval = 'Remove all decorative dot and circle elements from the design completely (set their display to none or delete them from the HTML).';
    finalModReq = finalModReq ? `${finalModReq}. ${dotRemoval}` : dotRemoval;
  }

  const requestBody = isModify
    ? {
        prompt: '',
        templateName,
        baseTemplateId: _modifyTemplateId,
        modificationRequest: finalModReq
      }
    : { prompt, templateName };

  try {
    const response = await fetch(`${API_URL}/api/ai-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json();
      // If original template was lost after server restart, exit modification mode
      // and explain what happened so user can generate fresh
      if (response.status === 404 && isModify) {
        cancelModifyMode();
        previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">
          <strong>Template lost after server restart</strong><br><br>
          The original template is no longer available on the server.<br>
          Use the form below to generate a fresh template with your desired design.
        </div>`;
        showToast('Original template is gone — generate fresh', 'error');
        btn.disabled = false;
        btn.textContent = '✨ Generate with AI';
        return;
      }
      throw new Error(err.message || err.error || 'Generation failed');
    }

    const data = await response.json();
    showToast(`Template "${data.templateId}" created!`, 'success');

    // Add to correct dropdown based on output type
    const label = templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (aiSelections.outputType === 'carousel-cover') {
      const coverSel = document.getElementById('carouselCoverSelect');
      if (coverSel && !Array.from(coverSel.options).some(o => o.value === data.templateId)) {
        coverSel.add(new Option(`${label} (AI)`, data.templateId));
      }
    } else if (aiSelections.outputType === 'carousel-slide') {
      const slideSel = document.getElementById('carouselDetailSelect');
      if (slideSel && !Array.from(slideSel.options).some(o => o.value === data.templateId)) {
        slideSel.add(new Option(`${label} (AI)`, data.templateId));
      }
    } else {
      const singleSel = document.getElementById('templateSelect');
      if (singleSel && !Array.from(singleSel.options).some(o => o.value === data.templateId)) {
        singleSel.add(new Option(`${label} (AI)`, data.templateId));
      }
    }

    // Preview with selected logo/dot style
    const dotStyle = isModify ? _modifyDotStyle : aiSelections.dotStyle;
    const logoStyle = isModify ? _modifyLogoStyle : aiSelections.logoStyle;
    const previewResponse = await fetch(`${API_URL}/api/template-preview/${data.templateId}?dotStyle=${dotStyle}&logoStyle=${logoStyle}`);
    if (previewResponse.ok) {
      const blob = await previewResponse.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        aiTemplatePreviewImage = reader.result;
        previewWrap.innerHTML = `<img src="${aiTemplatePreviewImage}" alt="Generated Template" style="width:100%;border-radius:8px;">`;
        document.getElementById('aiTemplatePreviewActions').style.display = 'flex';

        const thumb = await createThumbnail(aiTemplatePreviewImage, 800);
        saveAITemplateHistory(data.templateId, prompt, aiSelections.outputType, thumb);
        loadAITemplateHistory();
      };
      reader.readAsDataURL(blob);
    } else {
      previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">Template saved as <strong>${data.templateId}</strong>.<br>View it in the Templates gallery.</div>`;
      saveAITemplateHistory(data.templateId, prompt, aiSelections.outputType, null);
      loadAITemplateHistory();
    }

    // Clear input + exit modification mode on success
    document.getElementById('aiTemplateName').value = '';
    if (isModify) cancelModifyMode();

  } catch (error) {
    console.error('AI template error:', error);
    previewWrap.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Error: ${error.message}</div>`;
    showToast('Failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate with AI';
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

function saveAITemplateHistory(templateId, prompt, outputType, previewImage) {
  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  history.unshift({
    templateId,
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    createdAt: new Date().toLocaleDateString('en-US'),
    outputType: outputType || 'single',
    previewImage: previewImage || null   // stored thumbnail so preview works after server restart
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

  container.innerHTML = history.map((h, i) => `
    <div class="ai-history-item" onclick="previewHistoryTemplate('${h.templateId}')">
      ${h.previewImage
        ? `<img class="ai-history-thumb" src="${h.previewImage}" alt="">`
        : `<div class="ai-history-thumb-placeholder"></div>`}
      <div class="ai-history-content">
        <div class="ai-history-top">
          <div>
            <div class="ai-history-name">${h.templateId}</div>
            <div class="ai-history-date">${h.createdAt}${h.outputType ? ' · ' + h.outputType : ''}</div>
          </div>
          <button class="ai-history-delete" onclick="event.stopPropagation(); deleteAIHistoryItem(${i})" title="Remove">×</button>
        </div>
        <div class="ai-history-prompt">${h.prompt}</div>
      </div>
    </div>
  `).join('');
}

function deleteAIHistoryItem(index) {
  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  history.splice(index, 1);
  localStorage.setItem('aiTemplateHistory', JSON.stringify(history));
  loadAITemplateHistory();
  showToast('Removed from history');
}

function previewHistoryTemplate(templateId) {
  const history = JSON.parse(localStorage.getItem('aiTemplateHistory') || '[]');
  const item = history.find(h => h.templateId === templateId);
  const name = templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  // Use stored thumbnail if available — works even after server restarts
  showTemplatePreview(templateId, name, item?.previewImage || null);
}

function useHistoryTemplate(templateId) {
  previewHistoryTemplate(templateId);
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
window.hideTemplate = hideTemplate;
window.resetTemplates = resetTemplates;
window.filterJobs = filterJobs;
window.clearAllSelections = clearAllSelections;
window.saveToTemplates = saveToTemplates;
window.deleteCustomTemplate = deleteCustomTemplate;
window.previewCustomTemplate = previewCustomTemplate;
window.postToLinkedIn = postToLinkedIn;
window.generateAITemplate = generateAITemplate;
window.downloadAITemplatePreview = downloadAITemplatePreview;
window.fillExample = fillExample;
window.syncHeadlineColor = syncHeadlineColor;
window.syncTitleColor = syncTitleColor;
window.syncSalaryColor = syncSalaryColor;
window.updateCustomPalette = updateCustomPalette;
window.saveAITemplateToGallery = saveAITemplateToGallery;
window.useHistoryTemplate = useHistoryTemplate;
window.switchTemplateTab = switchTemplateTab;
window.showTemplatePreview = showTemplatePreview;
window.closeTemplatePreview = closeTemplatePreview;
window.usePreviewTemplate = usePreviewTemplate;
window.modifyWithAI = modifyWithAI;
window.cancelModifyMode = cancelModifyMode;
window.deleteAIHistoryItem = deleteAIHistoryItem;
window.previewHistoryTemplate = previewHistoryTemplate;
