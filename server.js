const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Available templates
const TEMPLATES = ['catalog-1', 'catalog-2', 'catalog-3', 'catalog-multi', 'diagonal', 'spotlight', 'waves', 'modern-clean', 'split-screen', 'search-style', 'multi-job'];

// Stock person photos (professional people with laptops)
const PERSON_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face'
];

// Color themes - Sagan branding (#23A3FE)
const THEMES = {
  sagan: {
    primary: '#23A3FE',      // Sagan mavi - ANA RENK
    secondary: '#1E3A5F',    // Koyu mavi (başlıklar)
    background: '#EBF5FF',   // Açık mavi arka plan
    accent: '#23A3FE'        // Sagan mavi
  },
  saganLight: {
    primary: '#23A3FE',      // Sagan mavi
    secondary: '#1E3A5F',    // Koyu mavi
    background: '#F8FAFC',   // Neredeyse beyaz
    accent: '#60B8FF'        // Açık sagan mavi
  },
  saganDark: {
    primary: '#23A3FE',      // Sagan mavi
    secondary: '#FFFFFF',    // Beyaz yazı (koyu arka plan için)
    background: '#1E3A5F',   // Koyu mavi arka plan
    accent: '#60B8FF'        // Açık mavi vurgu
  },
  saganWarm: {
    primary: '#23A3FE',      // Sagan mavi
    secondary: '#1E3A5F',    // Koyu mavi
    background: '#FDF8F3',   // Sıcak bej/krem (görsel 2'deki gibi)
    accent: '#23A3FE'        // Sagan mavi
  }
};

const THEME_NAMES = Object.keys(THEMES);
const BULLET_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Load logos
function loadLogos() {
  const assetsPath = path.join(__dirname, 'assets');
  const logos = {};

  try {
    logos.dark = fs.readFileSync(path.join(assetsPath, 'logo-dark.png')).toString('base64');
  } catch (e) {
    console.warn('logo-dark.png not found');
  }

  try {
    logos.light = fs.readFileSync(path.join(assetsPath, 'logo-light.png')).toString('base64');
  } catch (e) {
    console.warn('logo-light.png not found');
  }

  try {
    logos.blue = fs.readFileSync(path.join(assetsPath, 'logo-blue.png')).toString('base64');
  } catch (e) {
    console.warn('logo-blue.png not found');
  }

  return logos;
}

const LOGOS = loadLogos();

// Main endpoint
app.post('/generate', async (req, res) => {
  let browser = null;

  try {
    console.log('Received request:', JSON.stringify(req.body, null, 2));

    const {
      // Single job fields
      jobTitle = 'Job Title',
      salary = '$1,000 - $2,000',
      responsibilities = [],
      qualifications = [],
      location = 'Remote',
      schedule = 'M-F, 9AM-5PM EST',
      jobCode = '',

      // Multi job fields
      jobs = [],

      // Options
      template = 'auto',
      colorTheme = 'auto'
    } = req.body;

    // Select template
    let selectedTemplate = template;
    if (template === 'auto') {
      // If jobs array is provided, use multi-job template
      if (jobs && jobs.length > 0) {
        selectedTemplate = 'multi-job';
      } else {
        selectedTemplate = randomChoice(TEMPLATES.filter(t => t !== 'multi-job'));
      }
    }

    // Select theme
    const selectedTheme = colorTheme === 'auto' ? randomChoice(THEME_NAMES) : colorTheme;
    const theme = THEMES[selectedTheme] || THEMES.blue;

    console.log(`Using template: ${selectedTemplate}, theme: ${selectedTheme}`);

    // Read template
    const templatePath = path.join(__dirname, 'templates', `${selectedTemplate}.html`);

    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: `Template not found: ${selectedTemplate}` });
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace theme colors
    html = html.replace(/\{\{primary\}\}/g, theme.primary);
    html = html.replace(/\{\{secondary\}\}/g, theme.secondary);
    html = html.replace(/\{\{background\}\}/g, theme.background);
    html = html.replace(/\{\{accent\}\}/g, theme.accent);

    // Replace logos
    html = html.replace(/\{\{logoBase64\}\}/g, LOGOS.dark || '');
    html = html.replace(/\{\{logoLightBase64\}\}/g, LOGOS.light || LOGOS.dark || '');
    html = html.replace(/\{\{logoBlueBase64\}\}/g, LOGOS.blue || LOGOS.dark || '');

    // Handle different templates
    if (selectedTemplate === 'multi-job' || selectedTemplate === 'search-style' || selectedTemplate === 'catalog-multi') {
      // Generate job items HTML
      const jobsData = jobs.length > 0 ? jobs : [
        { title: jobTitle, salary: salary }
      ];

      const dotColors = ['yellow', 'blue', 'red', 'green', 'purple'];

      let jobItemsHTML;
      if (selectedTemplate === 'search-style' || selectedTemplate === 'catalog-multi') {
        jobItemsHTML = jobsData.map((job, index) => `
          <div class="job-item">
            <div class="job-dot dot-${dotColors[index % 5]}"></div>
            <div class="job-info">
              <div class="job-title">${job.title || 'Job Title'}</div>
              <div class="job-salary">Earn up to ${job.salary || '$1,000'} / Mo</div>
            </div>
          </div>
        `).join('');
      } else {
        jobItemsHTML = jobsData.map((job, index) => `
          <div class="job-item">
            <div class="job-bullet bullet-${(index % 6) + 1}"></div>
            <div class="job-info">
              <div class="job-title">${job.title || 'Job Title'}</div>
              <div class="job-salary">Earn up to ${job.salary || '$1,000'} / Mo</div>
            </div>
          </div>
        `).join('');
      }

      html = html.replace(/\{\{jobItems\}\}/g, jobItemsHTML);

    } else {
      // Single job templates
      html = html.replace(/\{\{jobTitle\}\}/g, jobTitle);
      html = html.replace(/\{\{salary\}\}/g, salary);
      html = html.replace(/\{\{location\}\}/g, location);
      html = html.replace(/\{\{schedule\}\}/g, schedule);
      html = html.replace(/\{\{jobCode\}\}/g, jobCode);

      // Responsibilities
      const respHTML = responsibilities.length > 0
        ? responsibilities.map(r => `<li>${r}</li>`).join('')
        : '<li>Responsibilities will be discussed</li>';
      html = html.replace(/\{\{responsibilities\}\}/g, respHTML);

      // Qualifications
      const qualHTML = qualifications.length > 0
        ? qualifications.map(q => `<li>${q}</li>`).join('')
        : '<li>Qualifications will be discussed</li>';
      html = html.replace(/\{\{qualifications\}\}/g, qualHTML);

      // Requirement pills (for diagonal template)
      const reqPillsHTML = qualifications.length > 0
        ? qualifications.slice(0, 4).map(q => `<div class="req-pill">${q}</div>`).join('')
        : '<div class="req-pill">Experience required</div>';
      html = html.replace(/\{\{requirementPills\}\}/g, reqPillsHTML);

      // Key points (for minimal-card template)
      const keyPointsHTML = [...responsibilities.slice(0, 2), ...qualifications.slice(0, 2)]
        .map(p => `<div class="point"><div class="point-dot"></div>${p}</div>`).join('');
      html = html.replace(/\{\{keyPoints\}\}/g, keyPointsHTML || '<div class="point"><div class="point-dot"></div>Great opportunity</div>');

      // Person photo (for sagan-branded template)
      const personPhotoUrl = req.body.personPhotoUrl || randomChoice(PERSON_PHOTOS);
      html = html.replace(/\{\{personPhotoUrl\}\}/g, personPhotoUrl);

      // Responsibilities list (for sagan-branded template)
      const respListHTML = responsibilities.length > 0
        ? responsibilities.map(r => `<li>${r}</li>`).join('')
        : '<li>Details will be provided</li>';
      html = html.replace(/\{\{responsibilitiesList\}\}/g, respListHTML);

      // Qualifications list (for sagan-branded template)
      const qualListHTML = qualifications.length > 0
        ? qualifications.map(q => `<li>${q}</li>`).join('')
        : '<li>Qualifications will be discussed</li>';
      html = html.replace(/\{\{qualificationsList\}\}/g, qualListHTML);
    }

    console.log('Launching browser...');

    // Launch Playwright
    browser = await chromium.launch({
      headless: true
    });

    console.log('Browser launched, creating page...');

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });

    console.log('Setting content...');
    await page.setContent(html, { waitUntil: 'load' });

    // Wait for fonts to load
    await page.waitForTimeout(1000);

    console.log('Taking screenshot...');
    const imageBuffer = await page.screenshot({ type: 'png' });

    await browser.close();
    browser = null;

    console.log('Success! Image generated.');

    res.set({
      'Content-Type': 'image/png',
      'X-Template': selectedTemplate,
      'X-Theme': selectedTheme
    });
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    templates: TEMPLATES,
    themes: THEME_NAMES
  });
});

// Info
app.get('/', (req, res) => {
  res.json({
    name: 'Sagan Image Generator API',
    version: '1.0.0',
    templates: TEMPLATES,
    themes: THEME_NAMES,
    examples: {
      singleJob: {
        template: 'single-job',
        jobTitle: 'Video Editor (HR87863)',
        salary: '$1,200',
        responsibilities: ['Edit videos', 'Follow guidelines'],
        qualifications: ['1+ year experience', 'Premiere Pro'],
        colorTheme: 'blue'
      },
      multiJob: {
        template: 'multi-job',
        jobs: [
          { title: 'Video Editor', salary: '$1,200' },
          { title: 'Marketing Manager', salary: '$2,500' },
          { title: 'Sales Rep', salary: '$1,800' }
        ],
        colorTheme: 'green'
      },
      creative: {
        template: 'creative',
        jobTitle: 'Content Creator',
        salary: '$750',
        location: 'South Africa',
        colorTheme: 'purple'
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
====================================
  Sagan Image Generator API
====================================

  Running on: http://localhost:${PORT}

  Templates: ${TEMPLATES.join(', ')}
  Themes: ${THEME_NAMES.join(', ')}

  Endpoints:
  - GET  /         → API info & examples
  - GET  /health   → Health check
  - POST /generate → Generate image

====================================
  `);
});
