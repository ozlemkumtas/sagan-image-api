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

// Sagan Brand Theme - Always Blue
const THEME = {
  primary: '#25a2ff',      // Sagan mavi
  secondary: '#093a3e',    // Koyu teal (başlıklar)
  background: '#ede9e5',   // Krem arka plan
  accent: '#25a2ff',       // Sagan mavi
  text: '#000000',         // Siyah metin
  lightBg: '#f5f5f5'       // Açık arka plan
};

// Dot Styles - 5'li nokta renk kombinasyonları
const DOT_STYLES = {
  default: ['#f5b801', '#73e491', '#25a2ff', '#ff7455', '#9e988f'],  // Sarı, Yeşil, Mavi, Coral, Gri
  vibrant: ['#796aff', '#25a2ff', '#73e491', '#ff7455', '#f5b801'],  // Mor, Mavi, Yeşil, Coral, Altın
  warm: ['#ff7455', '#f5b801', '#611f2c', '#9e988f', '#cac1b4'],     // Coral, Altın, Bordo, Gri tonları
  cool: ['#796aff', '#25a2ff', '#093a3e', '#73e491', '#9e988f'],     // Mor, Mavi, Teal, Yeşil, Gri
  mono: ['#093a3e', '#25a2ff', '#73e491', '#9e988f', '#dbd7d1'],     // Teal, Mavi, Yeşil, Gri tonları
  none: []  // Nokta yok
};

const DOT_STYLE_NAMES = Object.keys(DOT_STYLES);

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Parse job description to extract fields
function parseJobDescription(description) {
  if (!description) return {};

  const result = {};

  // Extract Salary - various formats
  const salaryPatterns = [
    /Salary\s*(?:Range)?[:\s]*\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)\s*(?:USD)?/i,
    /Salary\s*(?:Range)?[:\s]*([\d,]+)\s*[-–]\s*([\d,]+)\s*USD/i,
    /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)\s*(?:USD)?\s*\/\s*month/i,
    /Earn up to \$?([\d,]+)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[2]) {
        result.salary = `$${match[1]} - $${match[2]}`;
      } else {
        result.salary = `$${match[1]}`;
      }
      break;
    }
  }

  // Extract Location
  const locationMatch = description.match(/Location[:\s]*([^\n]+)/i);
  if (locationMatch) {
    let loc = locationMatch[1].trim();
    // Clean up common patterns
    if (loc.toLowerCase().includes('remote')) {
      result.location = 'Remote';
    } else {
      result.location = loc.split('-')[0].trim(); // Take first part before dash
    }
  }

  // Extract Schedule
  const schedulePatterns = [
    /Work\s*Schedule[:\s]*([^\n]+)/i,
    /Schedule[:\s]*([^\n]+)/i,
    /Hours[:\s]*([^\n]+)/i
  ];

  for (const pattern of schedulePatterns) {
    const match = description.match(pattern);
    if (match) {
      let sched = match[1].trim();
      // Simplify schedule
      if (sched.toLowerCase().includes('monday') && sched.toLowerCase().includes('friday')) {
        const timeMatch = sched.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
        if (timeMatch) {
          result.schedule = `M-F, ${timeMatch[1]} - ${timeMatch[2]}`;
        } else {
          result.schedule = 'Full-time, M-F';
        }
      } else {
        result.schedule = sched.substring(0, 30); // Limit length
      }
      break;
    }
  }

  // Extract Job Title from description if present
  const titleMatch = description.match(/Job\s*Title[:\s]*([^\n]+)/i);
  if (titleMatch) {
    result.extractedTitle = titleMatch[1].trim();
  }

  console.log('Parsed description:', result);
  return result;
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

    // Parse description if provided
    const parsed = parseJobDescription(req.body.description);

    const {
      // Single job fields
      jobTitle = parsed.extractedTitle || 'Job Title',
      salary = parsed.salary || '$1,000 - $2,000',
      responsibilities = [],
      qualifications = [],
      location = parsed.location || 'Remote',
      schedule = parsed.schedule || 'Full-time',
      jobCode = '',

      // Multi job fields
      jobs = [],

      // Options
      template = 'auto',
      dotStyle = 'default'
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

    // Use Sagan brand theme (always blue)
    const theme = THEME;

    // Select dot style
    const selectedDotStyle = DOT_STYLES[dotStyle] || DOT_STYLES.default;

    console.log(`Using template: ${selectedTemplate}, dotStyle: ${dotStyle}`);

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
      'X-DotStyle': dotStyle
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
    dotStyles: DOT_STYLE_NAMES
  });
});

// Info
app.get('/', (req, res) => {
  res.json({
    name: 'Sagan Image Generator API',
    version: '2.0.0',
    brandColor: '#25a2ff',
    templates: TEMPLATES,
    dotStyles: DOT_STYLE_NAMES,
    examples: {
      singleJob: {
        template: 'catalog-1',
        jobTitle: 'Video Editor',
        salary: '$1,200',
        location: 'Remote',
        schedule: 'Full-time',
        dotStyle: 'default'
      },
      withDescription: {
        template: 'catalog-1',
        jobTitle: 'Marketing Manager',
        description: 'Job Title: Marketing Manager\nLocation: Remote\nSalary Range: 2000 - 2500 USD/month',
        dotStyle: 'vibrant'
      },
      multiJob: {
        template: 'catalog-multi',
        jobs: [
          { title: 'Video Editor', salary: '$1,200' },
          { title: 'Marketing Manager', salary: '$2,500' },
          { title: 'Sales Rep', salary: '$1,800' }
        ],
        dotStyle: 'warm'
      },
      noDots: {
        template: 'catalog-1',
        jobTitle: 'Content Creator',
        salary: '$750',
        location: 'Remote',
        dotStyle: 'none'
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
====================================
  Sagan Image Generator API v2.0
====================================

  Running on: http://localhost:${PORT}
  Brand Color: #25a2ff (Sagan Blue)

  Templates: ${TEMPLATES.join(', ')}
  Dot Styles: ${DOT_STYLE_NAMES.join(', ')}

  Endpoints:
  - GET  /         → API info & examples
  - GET  /health   → Health check
  - POST /generate → Generate image

====================================
  `);
});
