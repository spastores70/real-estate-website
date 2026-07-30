const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'index.html','listings.html','listing-details.html','login.html','signup.html','dashboard.html',
  'admin-crm.html','admin-properties.html','styles.css','script.js',
  'assets/js/supabase-config.js','assets/js/property-repository.js','assets/js/property-engagement.js',
  'assets/js/admin-crm.js','assets/js/admin-properties.js',
  'database/schema.sql','database/auth-profiles.sql','database/admin-crm.sql','database/property-management.sql',
  'vercel.json','robots.txt','sitemap.xml'
];

const failures = [];
const warnings = [];
const htmlFiles = [];

function fail(message){ failures.push(message); }
function warn(message){ warnings.push(message); }
function exists(relative){ return fs.existsSync(path.join(root, relative)); }

for (const file of requiredFiles) {
  if (!exists(file)) fail(`Missing required file: ${file}`);
}

function walk(directory){
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git','node_modules'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll('\\','/');
  const source = fs.readFileSync(file, 'utf8');
  if (!/<title>[^<]+<\/title>/i.test(source)) fail(`${relative}: missing page title`);
  if (!/<meta\s+name=["']viewport["']/i.test(source)) fail(`${relative}: missing viewport meta tag`);
  if (!/<meta\s+name=["']description["']/i.test(source)) warn(`${relative}: missing meta description`);

  const refs = [...source.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    const target = path.resolve(path.dirname(file), ref);
    if (!target.startsWith(root)) continue;
    if (!fs.existsSync(target)) fail(`${relative}: broken local reference ${ref}`);
  }
}

const configPath = path.join(root, 'assets/js/supabase-config.js');
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf8');
  if (/service[_-]?role/i.test(config)) fail('Supabase service-role material must never be committed to browser code.');
  if (/url:\s*['"]\s*['"]/.test(config) || /anonKey:\s*['"]\s*['"]/.test(config)) {
    warn('Supabase URL or anon key is empty. Authentication and database features will remain in fallback mode.');
  }
}

console.log(`Audited ${htmlFiles.length} HTML pages.`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
for (const message of failures) console.error(`ERROR: ${message}`);

if (failures.length) {
  console.error(`\nProduction audit failed with ${failures.length} error(s).`);
  process.exit(1);
}
console.log(`\nProduction audit passed with ${warnings.length} warning(s).`);
