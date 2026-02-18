const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder (no cache for JS/CSS to avoid stale versions)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

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
    /Salary\s*(?:Range)?[:\s]*\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)\s*(?:USD)?(?:\s*\/\s*(?:month|mo))?/i,
    /Salary\s*(?:Range)?[:\s]*([\d,]+)\s*[-–—]\s*([\d,]+)\s*USD/i,
    /\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)\s*(?:USD)?\s*\/\s*(?:month|mo)/i,
    /Compensation[:\s]*\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)/i,
    /Pay[:\s]*\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)/i,
    /\$\s*([\d,]+)\s*[-–—]\s*\$\s*([\d,]+)/i,
    /([\d,]+)\s*[-–—]\s*([\d,]+)\s*USD/i,
    /Earn up to \$?([\d,]+)/i,
    /up to \$?([\d,]+)/i
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
  const titleMatch = description.match(/Job\s*Title[:\s]*([^\n]+)/i) ||
    description.match(/Position[:\s]*([^\n]+)/i) ||
    description.match(/Role[:\s]*([^\n]+)/i);
  if (titleMatch) {
    result.extractedTitle = titleMatch[1].trim();
  }

  // Extract Responsibilities
  const respMatch = description.match(/(?:Key\s*)?Responsibilities[:\s]*\n?([\s\S]*?)(?=\n\s*(?:Qualifications|Requirements|Skills|Education|About|Benefits|Compensation|$))/i);
  if (respMatch) {
    result.responsibilities = respMatch[1]
      .split('\n')
      .map(line => line.replace(/^[\s•\-\*\d.]+/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 5);
  }

  // Extract Qualifications
  const qualMatch = description.match(/(?:Key\s*)?(?:Qualifications|Requirements)[:\s]*\n?([\s\S]*?)(?=\n\s*(?:Responsibilities|About|Benefits|Compensation|How to|$))/i);
  if (qualMatch) {
    result.qualifications = qualMatch[1]
      .split('\n')
      .map(line => line.replace(/^[\s•\-\*\d.]+/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 5);
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

// Load fonts as base64
function loadFonts() {
  const fontsPath = path.join(__dirname, 'assets', 'fonts');
  const fonts = {};

  const fontFiles = {
    'PPMori-SemiBold': 'PPMori-SemiBold.otf',
    'PPMori-Regular': 'PPMori-Regular.otf',
    'PPMori-Book': 'PPMori-Book.otf',
    'PPNeueMontreal-Medium': 'PPNeueMontreal-Medium.otf'
  };

  for (const [name, file] of Object.entries(fontFiles)) {
    try {
      fonts[name] = fs.readFileSync(path.join(fontsPath, file)).toString('base64');
      console.log(`Loaded font: ${name}`);
    } catch (e) {
      console.warn(`Font not found: ${file}`);
    }
  }

  return fonts;
}

const LOGOS = loadLogos();
const FONTS = loadFonts();

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Hiring Requests';

// ============================================
// API ENDPOINTS FOR FRONTEND
// ============================================

// Get jobs from Airtable
app.get('/api/airtable/jobs', async (req, res) => {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      // Return empty array if Airtable is not configured
      console.log('Airtable not configured, returning empty jobs');
      return res.json({ jobs: [], message: 'Airtable not configured' });
    }

    // Fetch all records, sorted by newest first (using Airtable's internal created time)
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?pageSize=50`;
    console.log('Fetching Airtable:', airtableUrl);

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Airtable error response:', response.status, errBody);
      throw new Error(`Airtable API error: ${response.status} - ${errBody}`);
    }

    const data = await response.json();

    // Reverse to show newest first (Airtable returns oldest first by default)
    const records = data.records.reverse();

    const jobs = records.map(record => {
      const description = record.fields['Final Job Description'] || record.fields['Description'] || record.fields['Job Description'] || '';
      const parsed = parseJobDescription(description);

      return {
        id: record.id,
        title: record.fields['Job Title'] || record.fields['Name'] || parsed.extractedTitle || 'Untitled',
        jobCode: record.fields['Job Code'] || record.fields['Code'] || '',
        salary: record.fields['Salary'] || record.fields['Salary Range'] || parsed.salary || '',
        location: record.fields['Location'] || parsed.location || 'Remote',
        schedule: record.fields['Schedule'] || record.fields['Work Schedule'] || parsed.schedule || 'Full-time',
        responsibilities: record.fields['Responsibilities'] ?
          record.fields['Responsibilities'].split('\n').filter(r => r.trim()) :
          parsed.responsibilities || [],
        qualifications: record.fields['Qualifications'] ?
          record.fields['Qualifications'].split('\n').filter(q => q.trim()) :
          parsed.qualifications || [],
        description: description
      };
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Airtable error:', error.message);
    res.json({ jobs: [], error: error.message });
  }
});

// Generate carousel images (cover + details)
app.post('/generate-carousel', async (req, res) => {
  let browser = null;

  try {
    console.log('Generating carousel...');
    const { jobs = [], dotStyle = 'default', logoStyle = 'dark', coverTemplate = 'cover-default', detailTemplate = 'modern-clean' } = req.body;

    if (jobs.length === 0) {
      return res.status(400).json({ error: 'No jobs provided' });
    }

    const selectedDotStyle = DOT_STYLES[dotStyle] || DOT_STYLES.default;
    const images = { cover: null, details: [] };

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });

    // Get selected logo
    const selectedLogo = LOGOS[logoStyle] || LOGOS.dark || '';

    // Generate COVER image
    let coverHtml;
    const coverTemplatePath = path.join(__dirname, 'templates', `${coverTemplate}.html`);
    if (coverTemplate !== 'cover-default' && fs.existsSync(coverTemplatePath)) {
      // Use template file for cover
      coverHtml = fs.readFileSync(coverTemplatePath, 'utf8');
      coverHtml = coverHtml.replace(/\{\{primary\}\}/g, THEME.primary);
      coverHtml = coverHtml.replace(/\{\{secondary\}\}/g, THEME.secondary);
      coverHtml = coverHtml.replace(/\{\{background\}\}/g, THEME.background);
      coverHtml = coverHtml.replace(/\{\{accent\}\}/g, THEME.accent);
      coverHtml = coverHtml.replace(/\{\{logoBase64\}\}/g, selectedLogo);
      coverHtml = coverHtml.replace(/\{\{logoLightBase64\}\}/g, selectedLogo);
      coverHtml = coverHtml.replace(/\{\{logoBlueBase64\}\}/g, selectedLogo);
      coverHtml = coverHtml.replace(/\{\{fontPPMoriSemiBold\}\}/g, FONTS['PPMori-SemiBold'] || '');
      coverHtml = coverHtml.replace(/\{\{fontPPMoriRegular\}\}/g, FONTS['PPMori-Regular'] || '');
      coverHtml = coverHtml.replace(/\{\{fontPPMoriBook\}\}/g, FONTS['PPMori-Book'] || '');
      coverHtml = coverHtml.replace(/\{\{fontPPNeueMontreal\}\}/g, FONTS['PPNeueMontreal-Medium'] || '');
      coverHtml = selectedDotStyle.length >= 5
        ? coverHtml
          .replace(/\{\{dot1Color\}\}/g, selectedDotStyle[0])
          .replace(/\{\{dot2Color\}\}/g, selectedDotStyle[1])
          .replace(/\{\{dot3Color\}\}/g, selectedDotStyle[2])
          .replace(/\{\{dot4Color\}\}/g, selectedDotStyle[3])
          .replace(/\{\{dot5Color\}\}/g, selectedDotStyle[4])
        : coverHtml.replace(/\{\{dot\dColor\}\}/g, 'transparent');
      // Use first job data for cover template placeholders
      const firstJob = jobs[0];
      coverHtml = coverHtml.replace(/\{\{jobTitle\}\}/g, firstJob.title || 'Job Title');
      coverHtml = coverHtml.replace(/\{\{salary\}\}/g, firstJob.salary || 'TBD');
      coverHtml = coverHtml.replace(/\{\{location\}\}/g, firstJob.location || 'Remote');
      coverHtml = coverHtml.replace(/\{\{schedule\}\}/g, firstJob.schedule || 'Full-time');
      coverHtml = coverHtml.replace(/\{\{jobCode\}\}/g, firstJob.jobCode || '');
      const coverRespHTML = (firstJob.responsibilities || []).map(r => `<li>${r}</li>`).join('') || '<li>Details to be discussed</li>';
      const coverQualHTML = (firstJob.qualifications || []).map(q => `<li>${q}</li>`).join('') || '<li>Qualifications to be discussed</li>';
      coverHtml = coverHtml.replace(/\{\{responsibilities\}\}/g, coverRespHTML);
      coverHtml = coverHtml.replace(/\{\{qualifications\}\}/g, coverQualHTML);
      coverHtml = coverHtml.replace(/\{\{requirementPills\}\}/g,
        (firstJob.qualifications || []).slice(0, 4).map(q => `<div class="req-pill req-item skill skill-tag">${q}</div>`).join('') || '<div class="req-pill req-item skill skill-tag">Experience required</div>'
      );
      coverHtml = coverHtml.replace(/\{\{keyPoints\}\}/g, '');
      coverHtml = coverHtml.replace(/\{\{personPhotoUrl\}\}/g, randomChoice(PERSON_PHOTOS));
      coverHtml = coverHtml.replace(/\{\{responsibilitiesList\}\}/g, coverRespHTML);
      coverHtml = coverHtml.replace(/\{\{qualificationsList\}\}/g, coverQualHTML);
      coverHtml = coverHtml.replace(/\{\{jobItems\}\}/g, '');
    } else {
      // Default cover (hardcoded WE ARE HIRING layout)
      coverHtml = generateCarouselCoverHTML(jobs, selectedDotStyle, selectedLogo);
    }
    await page.setContent(coverHtml, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const coverBuffer = await page.screenshot({ type: 'png' });
    images.cover = coverBuffer.toString('base64');
    console.log('Cover generated');

    // Generate DETAIL images for each job using selected template
    const detailTemplatePath = path.join(__dirname, 'templates', `${detailTemplate}.html`);
    const detailTemplateExists = fs.existsSync(detailTemplatePath);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      let detailHtml;

      if (detailTemplateExists) {
        // Use actual template file
        detailHtml = fs.readFileSync(detailTemplatePath, 'utf8');
        detailHtml = detailHtml.replace(/\{\{primary\}\}/g, THEME.primary);
        detailHtml = detailHtml.replace(/\{\{secondary\}\}/g, THEME.secondary);
        detailHtml = detailHtml.replace(/\{\{background\}\}/g, THEME.background);
        detailHtml = detailHtml.replace(/\{\{accent\}\}/g, THEME.accent);
        detailHtml = detailHtml.replace(/\{\{logoBase64\}\}/g, selectedLogo);
        detailHtml = detailHtml.replace(/\{\{logoLightBase64\}\}/g, selectedLogo);
        detailHtml = detailHtml.replace(/\{\{logoBlueBase64\}\}/g, selectedLogo);
        detailHtml = detailHtml.replace(/\{\{fontPPMoriSemiBold\}\}/g, FONTS['PPMori-SemiBold'] || '');
        detailHtml = detailHtml.replace(/\{\{fontPPMoriRegular\}\}/g, FONTS['PPMori-Regular'] || '');
        detailHtml = detailHtml.replace(/\{\{fontPPMoriBook\}\}/g, FONTS['PPMori-Book'] || '');
        detailHtml = detailHtml.replace(/\{\{fontPPNeueMontreal\}\}/g, FONTS['PPNeueMontreal-Medium'] || '');
        detailHtml = selectedDotStyle.length >= 5
          ? detailHtml
            .replace(/\{\{dot1Color\}\}/g, selectedDotStyle[0])
            .replace(/\{\{dot2Color\}\}/g, selectedDotStyle[1])
            .replace(/\{\{dot3Color\}\}/g, selectedDotStyle[2])
            .replace(/\{\{dot4Color\}\}/g, selectedDotStyle[3])
            .replace(/\{\{dot5Color\}\}/g, selectedDotStyle[4])
          : detailHtml
            .replace(/\{\{dot\dColor\}\}/g, 'transparent');
        detailHtml = detailHtml.replace(/\{\{jobTitle\}\}/g, job.title || 'Job Title');
        detailHtml = detailHtml.replace(/\{\{salary\}\}/g, job.salary || 'TBD');
        detailHtml = detailHtml.replace(/\{\{location\}\}/g, job.location || 'Remote');
        detailHtml = detailHtml.replace(/\{\{schedule\}\}/g, job.schedule || 'Full-time');
        detailHtml = detailHtml.replace(/\{\{jobCode\}\}/g, job.jobCode || '');
        const respHTML = (job.responsibilities || []).map(r => `<li>${r}</li>`).join('') || '<li>Details to be discussed</li>';
        const qualHTML = (job.qualifications || []).map(q => `<li>${q}</li>`).join('') || '<li>Qualifications to be discussed</li>';
        detailHtml = detailHtml.replace(/\{\{responsibilities\}\}/g, respHTML);
        detailHtml = detailHtml.replace(/\{\{qualifications\}\}/g, qualHTML);
        detailHtml = detailHtml.replace(/\{\{requirementPills\}\}/g,
          (job.qualifications || []).slice(0, 4).map(q => `<div class="req-pill req-item skill skill-tag">${q}</div>`).join('') || '<div class="req-pill req-item skill skill-tag">Experience required</div>'
        );
        detailHtml = detailHtml.replace(/\{\{keyPoints\}\}/g, '');
        detailHtml = detailHtml.replace(/\{\{personPhotoUrl\}\}/g, randomChoice(PERSON_PHOTOS));
        detailHtml = detailHtml.replace(/\{\{responsibilitiesList\}\}/g, respHTML);
        detailHtml = detailHtml.replace(/\{\{qualificationsList\}\}/g, qualHTML);
        detailHtml = detailHtml.replace(/\{\{jobItems\}\}/g, '');
      } else {
        // Fallback to hardcoded
        detailHtml = generateCarouselDetailHTML(job, selectedDotStyle, selectedLogo);
      }

      await page.setContent(detailHtml, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const detailBuffer = await page.screenshot({ type: 'png' });
      images.details.push(detailBuffer.toString('base64'));
      console.log(`Detail ${i + 1} generated with template: ${detailTemplate}`);
    }

    await browser.close();
    browser = null;

    res.json({
      success: true,
      count: 1 + images.details.length,
      images
    });

  } catch (error) {
    console.error('Carousel error:', error.message);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// Template preview endpoint
app.get('/api/template-preview/:templateId', async (req, res) => {
  let browser = null;

  try {
    const { templateId } = req.params;
    const templatePath = path.join(__dirname, 'templates', `${templateId}.html`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Apply sample data
    html = html.replace(/\{\{primary\}\}/g, THEME.primary);
    html = html.replace(/\{\{secondary\}\}/g, THEME.secondary);
    html = html.replace(/\{\{background\}\}/g, THEME.background);
    html = html.replace(/\{\{accent\}\}/g, THEME.accent);
    html = html.replace(/\{\{logoBase64\}\}/g, LOGOS.dark || '');
    html = html.replace(/\{\{logoLightBase64\}\}/g, LOGOS.light || '');
    html = html.replace(/\{\{logoBlueBase64\}\}/g, LOGOS.blue || '');
    html = html.replace(/\{\{fontPPMoriSemiBold\}\}/g, FONTS['PPMori-SemiBold'] || '');
    html = html.replace(/\{\{fontPPMoriRegular\}\}/g, FONTS['PPMori-Regular'] || '');
    html = html.replace(/\{\{fontPPMoriBook\}\}/g, FONTS['PPMori-Book'] || '');
    html = html.replace(/\{\{fontPPNeueMontreal\}\}/g, FONTS['PPNeueMontreal-Medium'] || '');

    // Dot colors
    const defaultDots = DOT_STYLES.default;
    html = html.replace(/\{\{dot1Color\}\}/g, defaultDots[0] || 'transparent');
    html = html.replace(/\{\{dot2Color\}\}/g, defaultDots[1] || 'transparent');
    html = html.replace(/\{\{dot3Color\}\}/g, defaultDots[2] || 'transparent');
    html = html.replace(/\{\{dot4Color\}\}/g, defaultDots[3] || 'transparent');
    html = html.replace(/\{\{dot5Color\}\}/g, defaultDots[4] || 'transparent');

    // Sample job data
    html = html.replace(/\{\{jobTitle\}\}/g, 'Marketing Manager');
    html = html.replace(/\{\{salary\}\}/g, '$2,500 - $3,500');
    html = html.replace(/\{\{location\}\}/g, 'Remote');
    html = html.replace(/\{\{schedule\}\}/g, 'Full-time');
    html = html.replace(/\{\{jobCode\}\}/g, 'HR12345');
    html = html.replace(/\{\{responsibilities\}\}/g, '<li>Lead campaigns</li><li>Manage team</li>');
    html = html.replace(/\{\{qualifications\}\}/g, '<li>5+ years experience</li><li>MBA preferred</li>');
    html = html.replace(/\{\{requirementPills\}\}/g, '<div class="req-pill">Marketing</div><div class="req-pill">Leadership</div>');
    html = html.replace(/\{\{keyPoints\}\}/g, '<div class="point"><div class="point-dot"></div>Great opportunity</div>');
    html = html.replace(/\{\{personPhotoUrl\}\}/g, 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=500&fit=crop');
    html = html.replace(/\{\{responsibilitiesList\}\}/g, '<li>Lead campaigns</li>');
    html = html.replace(/\{\{qualificationsList\}\}/g, '<li>Experience required</li>');
    html = html.replace(/\{\{jobItems\}\}/g, '');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const imageBuffer = await page.screenshot({ type: 'png' });
    await browser.close();

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Preview error:', error.message);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// AI Chat Design - Gemini powered conversational design
app.post('/api/ai-chat', async (req, res) => {
  let browser = null;

  try {
    const { message, history = [], job, dotStyle = 'default', currentDesign = null } = req.body;

    if (!message || !job) {
      return res.status(400).json({ error: 'Message and job data required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(400).json({
        error: 'AI not configured',
        message: 'Add GEMINI_API_KEY to Railway environment variables'
      });
    }

    const selectedDotStyle = DOT_STYLES[dotStyle] || DOT_STYLES.default;

    // Build conversation context
    const systemPrompt = `You are a job posting image design assistant. The user tells you their color and style preferences, and you return design parameters in JSON format.

Current job: "${job.title}" - ${job.salary || 'Salary not specified'}

${currentDesign ? `Current design parameters: ${JSON.stringify(currentDesign)}` : 'No design applied yet.'}

RULES:
- DO NOT change the job content (title, salary, etc.)
- Only change colors and style
- Always return a JSON block AND a short English explanation
- JSON must be in this format:

\`\`\`json
{
  "primaryColor": "#hex",
  "secondaryColor": "#hex",
  "backgroundColor": "#hex",
  "accentColor": "#hex",
  "headerBg": "#hex",
  "textColor": "#hex",
  "buttonColor": "#hex",
  "buttonTextColor": "#hex",
  "replyMessage": "Short English explanation"
}
\`\`\``;

    // Build Gemini conversation history
    const geminiContents = [];

    // Add previous messages
    for (const msg of history) {
      geminiContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add current message
    geminiContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Prepend system context as first model turn (more compatible approach)
    const fullContents = [
      { role: 'user', parts: [{ text: 'System instructions: ' + systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will act as a design assistant and provide color suggestions in JSON format.' }] },
      ...geminiContents
    ];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: fullContents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    );

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json();
      console.error('Gemini error:', JSON.stringify(err));
      throw new Error('Gemini API error: ' + (err.error?.message || JSON.stringify(err)));
    }

    const geminiData = await geminiResponse.json();
    const aiText = geminiData.candidates[0].content.parts[0].text;
    console.log('Gemini response:', aiText);

    // Parse JSON from response
    let colors = null;
    let replyMessage = '';
    try {
      const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/) || aiText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : null;
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        replyMessage = parsed.replyMessage || '';
        delete parsed.replyMessage;
        colors = parsed;
      }
    } catch (e) {
      console.log('Could not parse colors from AI response');
    }

    const design = {
      primary: colors?.primaryColor || '#25a2ff',
      secondary: colors?.secondaryColor || '#093a3e',
      background: colors?.backgroundColor || '#ffffff',
      accent: colors?.accentColor || '#f5b801',
      headerBg: colors?.headerBg || '#25a2ff',
      text: colors?.textColor || '#093a3e',
      buttonColor: colors?.buttonColor || '#f5b801',
      buttonTextColor: colors?.buttonTextColor || '#093a3e'
    };

    // Fallback reply
    if (!replyMessage) {
      replyMessage = colors ? 'Design updated!' : "I didn't quite understand. Could you describe it differently?";
    }

    // Generate HTML with AI colors but FIXED job text
    const responsibilities = (job.responsibilities || []).slice(0, 4).map(r =>
      `<li>${r}</li>`
    ).join('') || '<li>Details will be provided</li>';

    const qualifications = (job.qualifications || []).slice(0, 4).map(q =>
      `<li>${q}</li>`
    ).join('') || '<li>Qualifications will be discussed</li>';

    const dotsHTML = selectedDotStyle.length > 0 ? selectedDotStyle.map(color =>
      `<div class="dot" style="background: ${color};"></div>`
    ).join('') : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'PP Mori'; src: url(data:font/otf;base64,${FONTS['PPMori-SemiBold'] || ''}) format('opentype'); font-weight: 600; }
    @font-face { font-family: 'PP Neue Montreal'; src: url(data:font/otf;base64,${FONTS['PPNeueMontreal-Medium'] || ''}) format('opentype'); font-weight: 500; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1080px; height: 1080px; font-family: 'PP Neue Montreal', sans-serif; background: ${design.background}; }
    .poster { width: 1080px; height: 1080px; display: flex; flex-direction: column; }
    .header { background: ${design.headerBg}; padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; }
    .badge { font-family: 'PP Mori', sans-serif; font-size: 18px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 2px; }
    .logo { height: 45px; }
    .content { flex: 1; padding: 50px 60px; }
    .job-title { font-family: 'PP Mori', sans-serif; font-size: 52px; font-weight: 600; color: ${design.secondary}; margin-bottom: 10px; line-height: 1.1; }
    .job-code { font-size: 20px; color: ${design.text}; opacity: 0.7; margin-bottom: 30px; }
    .info-row { display: flex; gap: 40px; margin-bottom: 30px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 12px; color: ${design.text}; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
    .info-value { font-family: 'PP Mori', sans-serif; font-size: 24px; font-weight: 600; color: ${design.primary}; }
    .section { margin-bottom: 24px; }
    .section-title { font-family: 'PP Mori', sans-serif; font-size: 14px; font-weight: 600; color: ${design.text}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; opacity: 0.8; }
    .list { list-style: none; padding: 0; }
    .list li { font-size: 16px; color: ${design.text}; padding: 6px 0 6px 20px; position: relative; }
    .list li::before { content: "•"; color: ${design.accent}; font-weight: bold; position: absolute; left: 0; }
    .footer { background: ${design.secondary}; padding: 30px 60px; display: flex; justify-content: space-between; align-items: center; }
    .apply-btn { background: ${design.buttonColor}; color: ${design.buttonTextColor}; font-family: 'PP Mori', sans-serif; font-size: 18px; font-weight: 600; padding: 16px 40px; border-radius: 8px; text-transform: uppercase; }
    .footer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    .website { color: white; font-size: 14px; opacity: 0.9; }
    .dots { display: flex; gap: 8px; }
    .dot { width: 14px; height: 14px; border-radius: 50%; }
  </style>
</head>
<body>
  <div class="poster">
    <div class="header">
      <div class="badge">We Are Hiring</div>
      <img src="data:image/png;base64,${LOGOS.dark || ''}" class="logo" alt="Sagan">
    </div>
    <div class="content">
      <h1 class="job-title">${job.title || 'Job Title'}</h1>
      ${job.jobCode ? `<div class="job-code">(${job.jobCode})</div>` : ''}
      <div class="info-row">
        <div class="info-item"><span class="info-label">Salary</span><span class="info-value">${job.salary || 'TBD'}</span></div>
        <div class="info-item"><span class="info-label">Location</span><span class="info-value">${job.location || 'Remote'}</span></div>
        <div class="info-item"><span class="info-label">Schedule</span><span class="info-value">${job.schedule || 'Full-time'}</span></div>
      </div>
      <div class="section"><div class="section-title">Key Responsibilities</div><ul class="list">${responsibilities}</ul></div>
      <div class="section"><div class="section-title">Qualifications</div><ul class="list">${qualifications}</ul></div>
    </div>
    <div class="footer">
      <div class="apply-btn">Apply Now</div>
      <div class="footer-right">
        <div class="website">www.saganrecruitment.com/jobs/</div>
        <div class="dots">${dotsHTML}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Render to image
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const imageBuffer = await page.screenshot({ type: 'png' });
    await browser.close();
    browser = null;

    res.json({
      success: true,
      image: imageBuffer.toString('base64'),
      reply: replyMessage,
      appliedColors: design
    });

  } catch (error) {
    console.error('AI chat error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS FOR CAROUSEL
// ============================================

function generateCarouselCoverHTML(jobs, dotColors, logo) {
  const jobItems = jobs.map((job, index) => `
    <div class="job-pill">
      <div class="job-pill-title">${job.title || 'Job Title'}</div>
      <div class="job-pill-salary">Salary Range: ${job.salary || '$1,000 - $2,000'}</div>
    </div>
  `).join('');

  const dotsHTML = dotColors.length > 0 ? dotColors.map((color, i) =>
    `<div class="dot" style="background: ${color};"></div>`
  ).join('') : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'PP Mori';
      src: url(data:font/otf;base64,${FONTS['PPMori-SemiBold'] || ''}) format('opentype');
      font-weight: 600;
    }
    @font-face {
      font-family: 'PP Neue Montreal';
      src: url(data:font/otf;base64,${FONTS['PPNeueMontreal-Medium'] || ''}) format('opentype');
      font-weight: 500;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1080px;
      font-family: 'PP Neue Montreal', sans-serif;
      background: #ede9e5;
    }
    .poster {
      width: 1080px;
      height: 1080px;
      padding: 60px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .title {
      font-family: 'PP Mori', sans-serif;
    }
    .title .we-are {
      font-size: 48px;
      font-weight: 400;
      color: #093a3e;
      display: block;
    }
    .title .hiring {
      font-size: 72px;
      font-weight: 600;
      color: #093a3e;
      display: block;
    }
    .logo {
      width: 140px;
      height: auto;
    }
    .jobs-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 40px;
    }
    .job-pill {
      background: white;
      border: 2px solid #093a3e;
      border-radius: 60px;
      padding: 20px 40px;
      text-align: center;
    }
    .job-pill-title {
      font-family: 'PP Mori', sans-serif;
      font-size: 24px;
      font-weight: 600;
      color: #093a3e;
      margin-bottom: 4px;
    }
    .job-pill-salary {
      font-size: 18px;
      color: #666;
    }
    .arrow {
      position: absolute;
      right: 60px;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      background: #25a2ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .arrow svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    .footer {
      text-align: center;
    }
    .website {
      font-size: 16px;
      color: #666;
      margin-bottom: 16px;
    }
    .dots {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="header">
      <div class="title">
        <span class="we-are">WE ARE</span>
        <span class="hiring">HIRING!</span>
      </div>
      <img src="data:image/png;base64,${logo || LOGOS.dark || ''}" class="logo" alt="Sagan">
    </div>

    <div class="jobs-list">
      ${jobItems}
    </div>

    <div class="arrow">
      <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
    </div>

    <div class="footer">
      <div class="website">Visit Our Website to Apply:<br>www.saganrecruitment.com/jobs/</div>
      <div class="dots">${dotsHTML}</div>
    </div>
  </div>
</body>
</html>`;
}

function generateCarouselDetailHTML(job, dotColors, logo) {
  const responsibilities = (job.responsibilities || []).slice(0, 3).map(r =>
    `<li>${r}</li>`
  ).join('') || '<li>Details will be provided</li>';

  const qualifications = (job.qualifications || []).slice(0, 3).map(q =>
    `<li>${q}</li>`
  ).join('') || '<li>Qualifications will be discussed</li>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'PP Mori';
      src: url(data:font/otf;base64,${FONTS['PPMori-SemiBold'] || ''}) format('opentype');
      font-weight: 600;
    }
    @font-face {
      font-family: 'PP Neue Montreal';
      src: url(data:font/otf;base64,${FONTS['PPNeueMontreal-Medium'] || ''}) format('opentype');
      font-weight: 500;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1080px;
      font-family: 'PP Neue Montreal', sans-serif;
      background: #fafafa;
    }
    .poster {
      width: 1080px;
      height: 1080px;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #fafafa;
      padding: 40px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      display: inline-block;
      border: 3px solid #093a3e;
      border-radius: 12px;
      padding: 12px 32px;
    }
    .badge-text {
      font-family: 'PP Mori', sans-serif;
      font-size: 24px;
      font-weight: 600;
      color: #093a3e;
    }
    .logo {
      width: 120px;
    }
    .content {
      flex: 1;
      padding: 0 60px 40px;
    }
    .job-title {
      font-family: 'PP Mori', sans-serif;
      font-size: 42px;
      font-weight: 600;
      color: #093a3e;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .job-code {
      font-size: 24px;
      color: #093a3e;
      margin-bottom: 24px;
    }
    .salary-label {
      font-size: 16px;
      color: #666;
      margin-bottom: 4px;
    }
    .salary {
      font-family: 'PP Mori', sans-serif;
      font-size: 36px;
      font-weight: 600;
      color: #093a3e;
      margin-bottom: 20px;
    }
    .meta {
      display: flex;
      gap: 40px;
      margin-bottom: 32px;
      font-size: 18px;
      color: #093a3e;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title {
      font-family: 'PP Mori', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: #093a3e;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      margin-top: 24px;
    }
    .list {
      list-style: disc;
      padding-left: 24px;
      font-size: 16px;
      color: #333;
      line-height: 1.8;
    }
    .footer {
      background: #25a2ff;
      padding: 32px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .apply-btn {
      background: #f5b801;
      color: #093a3e;
      font-family: 'PP Mori', sans-serif;
      font-size: 22px;
      font-weight: 600;
      padding: 16px 40px;
      border-radius: 12px;
    }
    .website {
      color: white;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="header">
      <div class="badge">
        <span class="badge-text">WE ARE HIRING!</span>
      </div>
      <img src="data:image/png;base64,${logo || LOGOS.dark || ''}" class="logo" alt="Sagan">
    </div>

    <div class="content">
      <h1 class="job-title">${job.title || 'Job Title'}</h1>
      ${job.jobCode ? `<div class="job-code">(${job.jobCode})</div>` : ''}

      <div class="salary-label">Salary Range:</div>
      <div class="salary">${job.salary || '$1,000 - $2,000'} per month</div>

      <div class="meta">
        <div class="meta-item">🏠 ${job.location || '100% REMOTE'}</div>
        <div class="meta-item">🕐 ${job.schedule || 'M-F, 9AM-5PM'}</div>
      </div>

      <div class="section-title">Key Responsibilities</div>
      <ul class="list">${responsibilities}</ul>

      <div class="section-title">Qualifications</div>
      <ul class="list">${qualifications}</ul>
    </div>

    <div class="footer">
      <div class="apply-btn">APPLY NOW</div>
      <div class="website">www.saganrecruitment.com/jobs/</div>
    </div>
  </div>
</body>
</html>`;
}

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
      dotStyle = 'default',
      logoStyle = 'dark'
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

    console.log(`=== GENERATE REQUEST ===`);
    console.log(`Template: ${selectedTemplate}`);
    console.log(`Logo style: ${logoStyle} → ${LOGOS[logoStyle] ? LOGOS[logoStyle].length + ' chars' : 'MISSING'}`);
    console.log(`Dot style: ${dotStyle} → ${JSON.stringify(selectedDotStyle)}`);
    console.log(`Job: ${jobTitle}, Salary: ${salary}`);

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

    // Replace ALL logo placeholders with selected logo
    const selectedLogo = LOGOS[logoStyle] || LOGOS.dark || '';
    html = html.replace(/\{\{logoBase64\}\}/g, selectedLogo);
    html = html.replace(/\{\{logoLightBase64\}\}/g, selectedLogo);
    html = html.replace(/\{\{logoBlueBase64\}\}/g, selectedLogo);

    // Replace fonts
    html = html.replace(/\{\{fontPPMoriSemiBold\}\}/g, FONTS['PPMori-SemiBold'] || '');
    html = html.replace(/\{\{fontPPMoriRegular\}\}/g, FONTS['PPMori-Regular'] || '');
    html = html.replace(/\{\{fontPPMoriBook\}\}/g, FONTS['PPMori-Book'] || '');
    html = html.replace(/\{\{fontPPNeueMontreal\}\}/g, FONTS['PPNeueMontreal-Medium'] || '');

    // Replace dot colors
    if (selectedDotStyle.length >= 5) {
      html = html.replace(/\{\{dot1Color\}\}/g, selectedDotStyle[0]);
      html = html.replace(/\{\{dot2Color\}\}/g, selectedDotStyle[1]);
      html = html.replace(/\{\{dot3Color\}\}/g, selectedDotStyle[2]);
      html = html.replace(/\{\{dot4Color\}\}/g, selectedDotStyle[3]);
      html = html.replace(/\{\{dot5Color\}\}/g, selectedDotStyle[4]);
    } else {
      // If no dots (none style), use transparent
      html = html.replace(/\{\{dot1Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot2Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot3Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot4Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot5Color\}\}/g, 'transparent');
    }

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

      // Requirement pills (works with all templates: req-pill, req-item, skill, skill-tag)
      const reqPillsHTML = qualifications.length > 0
        ? qualifications.slice(0, 4).map(q => `<div class="req-pill req-item skill skill-tag">${q}</div>`).join('')
        : '<div class="req-pill req-item skill skill-tag">Experience required</div>';
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

// Make webhook proxy - sends data to Make for LinkedIn posting
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || '';

app.post('/api/webhook/linkedin', async (req, res) => {
  try {
    if (!MAKE_WEBHOOK_URL) {
      return res.status(400).json({
        error: 'Make webhook not configured',
        message: 'Add MAKE_WEBHOOK_URL to Railway environment variables'
      });
    }

    const { jobs, template, dotStyle, logoStyle, outputType } = req.body;

    if (!jobs || jobs.length === 0) {
      return res.status(400).json({ error: 'No jobs provided' });
    }

    // Send to Make webhook
    const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs,
        template,
        dotStyle,
        logoStyle,
        outputType,
        apiUrl: `https://${req.get('host')}`,
        timestamp: new Date().toISOString()
      })
    });

    if (!webhookResponse.ok) {
      throw new Error('Make webhook failed');
    }

    console.log('Sent to Make webhook:', jobs.length, 'jobs');
    res.json({ success: true, message: 'Sent to Make automation' });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Logo endpoint for preview
app.get('/api/logo/:type', (req, res) => {
  const { type } = req.params;
  const logoKey = type === 'light' ? 'light' : type === 'blue' ? 'blue' : 'dark';
  const logo = LOGOS[logoKey] || LOGOS.dark;

  if (!logo) {
    return res.status(404).json({ error: 'Logo not found' });
  }

  const buffer = Buffer.from(logo, 'base64');
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
});

// Debug test - generates a test image with specific params to verify
app.get('/test-generate', async (req, res) => {
  let browser = null;
  try {
    const logoStyle = req.query.logo || 'dark';
    const dotStyle = req.query.dots || 'default';
    const template = req.query.template || 'modern-clean';

    const selectedLogo = LOGOS[logoStyle] || LOGOS.dark || '';
    const selectedDotStyle = DOT_STYLES[dotStyle] || DOT_STYLES.default;

    console.log(`=== TEST GENERATE ===`);
    console.log(`Logo: ${logoStyle} → ${selectedLogo.length} chars`);
    console.log(`Dots: ${dotStyle} → ${JSON.stringify(selectedDotStyle)}`);

    let html = fs.readFileSync(path.join(__dirname, 'templates', `${template}.html`), 'utf8');

    // Replace everything
    html = html.replace(/\{\{primary\}\}/g, THEME.primary);
    html = html.replace(/\{\{secondary\}\}/g, THEME.secondary);
    html = html.replace(/\{\{background\}\}/g, THEME.background);
    html = html.replace(/\{\{accent\}\}/g, THEME.accent);
    html = html.replace(/\{\{logoBase64\}\}/g, selectedLogo);
    html = html.replace(/\{\{logoLightBase64\}\}/g, selectedLogo);
    html = html.replace(/\{\{logoBlueBase64\}\}/g, selectedLogo);
    html = html.replace(/\{\{fontPPMoriSemiBold\}\}/g, FONTS['PPMori-SemiBold'] || '');
    html = html.replace(/\{\{fontPPMoriRegular\}\}/g, FONTS['PPMori-Regular'] || '');
    html = html.replace(/\{\{fontPPMoriBook\}\}/g, FONTS['PPMori-Book'] || '');
    html = html.replace(/\{\{fontPPNeueMontreal\}\}/g, FONTS['PPNeueMontreal-Medium'] || '');

    if (selectedDotStyle.length >= 5) {
      html = html.replace(/\{\{dot1Color\}\}/g, selectedDotStyle[0]);
      html = html.replace(/\{\{dot2Color\}\}/g, selectedDotStyle[1]);
      html = html.replace(/\{\{dot3Color\}\}/g, selectedDotStyle[2]);
      html = html.replace(/\{\{dot4Color\}\}/g, selectedDotStyle[3]);
      html = html.replace(/\{\{dot5Color\}\}/g, selectedDotStyle[4]);
    } else {
      html = html.replace(/\{\{dot1Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot2Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot3Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot4Color\}\}/g, 'transparent');
      html = html.replace(/\{\{dot5Color\}\}/g, 'transparent');
    }

    html = html.replace(/\{\{jobTitle\}\}/g, 'Test Job Title');
    html = html.replace(/\{\{salary\}\}/g, '$2,000 - $3,000');
    html = html.replace(/\{\{location\}\}/g, 'Remote');
    html = html.replace(/\{\{schedule\}\}/g, 'Full-time');
    html = html.replace(/\{\{jobCode\}\}/g, 'TEST123');
    html = html.replace(/\{\{responsibilities\}\}/g, '<li>Test responsibility</li>');
    html = html.replace(/\{\{qualifications\}\}/g, '<li>Test qualification</li>');
    html = html.replace(/\{\{requirementPills\}\}/g, '<div class="req-pill req-item skill skill-tag">Test Skill</div>');
    html = html.replace(/\{\{keyPoints\}\}/g, '');
    html = html.replace(/\{\{personPhotoUrl\}\}/g, '');
    html = html.replace(/\{\{responsibilitiesList\}\}/g, '<li>Test</li>');
    html = html.replace(/\{\{qualificationsList\}\}/g, '<li>Test</li>');
    html = html.replace(/\{\{jobItems\}\}/g, '');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const imageBuffer = await page.screenshot({ type: 'png' });
    await browser.close();
    browser = null;

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error('Test generate error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    templates: TEMPLATES,
    dotStyles: DOT_STYLE_NAMES,
    logos: {
      dark: LOGOS.dark ? `${LOGOS.dark.length} chars` : 'MISSING',
      light: LOGOS.light ? `${LOGOS.light.length} chars` : 'MISSING',
      blue: LOGOS.blue ? `${LOGOS.blue.length} chars` : 'MISSING'
    },
    fonts: {
      'PPMori-SemiBold': FONTS['PPMori-SemiBold'] ? 'loaded' : 'MISSING',
      'PPMori-Regular': FONTS['PPMori-Regular'] ? 'loaded' : 'MISSING',
      'PPNeueMontreal-Medium': FONTS['PPNeueMontreal-Medium'] ? 'loaded' : 'MISSING'
    }
  });
});

// API Info (for programmatic access)
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Sagan Image Generator API',
    version: '3.0.0',
    brandColor: '#25a2ff',
    templates: TEMPLATES,
    dotStyles: DOT_STYLE_NAMES,
    endpoints: {
      generate: 'POST /generate - Generate single image',
      carousel: 'POST /generate-carousel - Generate carousel set',
      jobs: 'GET /api/airtable/jobs - Get jobs from Airtable',
      preview: 'GET /api/template-preview/:id - Preview template'
    }
  });
});

// Serve frontend for root (index.html will be served by static middleware)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
====================================
  Sagan Image Generator v3.0
====================================

  Web App: http://localhost:${PORT}
  Brand Color: #25a2ff (Sagan Blue)

  Templates: ${TEMPLATES.length} available
  Dot Styles: ${DOT_STYLE_NAMES.join(', ')}

  Endpoints:
  - GET  /                    → Web App
  - GET  /api/info            → API info
  - GET  /api/airtable/jobs   → Jobs from Airtable
  - GET  /api/template-preview/:id → Template preview
  - POST /generate            → Generate single image
  - POST /generate-carousel   → Generate carousel set

====================================
  `);
});
