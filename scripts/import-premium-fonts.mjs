import fs from 'fs';
import path from 'path';
import os from 'os';

const projectRoot = process.cwd();

const OUT_DIR = path.join(projectRoot, 'public', 'fonts', 'premium');
const REPORT = path.join(projectRoot, 'docs', 'NOVACENA_FONTES_PREMIUM.md');
const MANIFEST = path.join(projectRoot, 'public', 'fonts', 'premium', 'premium-fonts.json');
const CSS_FILE = path.join(projectRoot, 'public', 'fonts', 'premium', 'premium-fonts.css');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REPORT), { recursive: true });

const fonts = [
  {
    family: 'Akira Expanded E BOLD',
    aliases: ['Akira Expanded E BOLD', 'Akira Expanded Extra Bold', 'Akira Expanded Bold', 'AkiraExpanded'],
    category: 'impacto',
  },
  {
    family: 'Akira Expanded',
    aliases: ['Akira Expanded', 'AkiraExpanded'],
    category: 'impacto',
  },
  {
    family: 'Bebas Neue',
    aliases: ['BEBAS NUE', 'Bebas Neue', 'BebasNeue'],
    category: 'sertanejo',
  },
  {
    family: 'Gramatika Black',
    aliases: ['Gramatika-Black', 'Gramatika Black', 'GramatikaBlack'],
    category: 'impacto',
  },
  {
    family: 'Heavitas',
    aliases: ['Heavitas'],
    category: 'impacto',
  },
  {
    family: '1797 Compressed',
    aliases: ['1797 COMPRESSED', '1797Compressed', '1797 Compressed'],
    category: 'impacto',
  },
  {
    family: 'Nexa',
    aliases: ['NEXA', 'Nexa'],
    category: 'cta',
  },
  {
    family: 'Fair Prosper',
    aliases: ['Fair Prosper REGULAR', 'Fair Prosper', 'FairProsper'],
    category: 'premium',
  },
  {
    family: 'Candrika',
    aliases: ['Candrika Regular', 'Candrika'],
    category: 'premium',
  },
  {
    family: 'Kenyan Coffee',
    aliases: ['Kenyan Coffee BOLD', 'Kenyan Coffee', 'KenyanCoffee'],
    category: 'sertanejo',
  },
  {
    family: 'Arvo Bold',
    aliases: ['Arvo BOLD', 'Arvo Bold', 'Arvo-Bold'],
    category: 'premium',
  },
  {
    family: 'Varane',
    aliases: ['VaraneRegular', 'Varane Regular', 'Varane'],
    category: 'premium',
  },
  {
    family: 'LEMON MILK',
    aliases: ['LEMON MILK', 'Lemon Milk', 'LEMONMILK'],
    category: 'impacto',
  },
  {
    family: 'DIN Condensed',
    aliases: ['DIN Condensed BOLD', 'DIN Condensed', 'DINCondensed'],
    category: 'cta',
  },
  {
    family: 'Smoothread',
    aliases: ['Smoothread'],
    category: 'premium',
  },
  {
    family: 'BigNoodleTitling Oblique',
    aliases: ['BigNoodleTitling Oblique', 'Big Noodle Titling Oblique', 'BigNoodleTitling'],
    category: 'sertanejo',
  },
  {
    family: 'Casanova Scotia',
    aliases: ['Casanova Scotia REGULAR', 'Casanova Scotia', 'CasanovaScotia'],
    category: 'premium',
  },
  {
    family: 'Panton ExtraBlack',
    aliases: ['Panton ExtraBlack REGULAR', 'Panton ExtraBlack', 'Panton-ExtraBlack', 'PantonExtraBlack'],
    category: 'impacto',
  },
  {
    family: 'AXIS ExtraBold',
    aliases: ['AXIS ExtraBold', 'AXIS Extra Bold', 'Axis ExtraBold'],
    category: 'impacto',
  },
  {
    family: 'Tactical',
    aliases: ['Tactical Regular', 'Tactical'],
    category: 'sertanejo',
  },
  {
    family: 'Aldivaro ExtraBold',
    aliases: ['Aldivaro EXTRABOLD', 'Aldivaro ExtraBold', 'Aldivaro'],
    category: 'impacto',
  },
];

const searchRoots = [
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Downloads'),
  path.join(os.homedir(), 'Documents'),
  path.join(os.homedir(), 'Library', 'Fonts'),
  '/Library/Fonts',
  path.join(projectRoot, 'fonts'),
  path.join(projectRoot, 'public', 'fonts'),
  path.join(projectRoot, 'assets', 'fonts'),
].filter((p) => fs.existsSync(p));

const allowedExt = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function slug(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-');
}

function walk(dir, result = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        entry.name === 'out'
      ) {
        continue;
      }
      walk(full, result);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (allowedExt.has(ext)) {
      result.push(full);
    }
  }

  return result;
}

console.log('🔎 Procurando fontes...');
console.log(searchRoots.map((r) => `- ${r}`).join('\n'));

const allFontFiles = [];
for (const root of searchRoots) {
  walk(root, allFontFiles);
}

const usedFiles = new Set();

function findFontFile(font) {
  const aliases = font.aliases.map(normalize);

  const exact = allFontFiles.find((file) => {
    if (usedFiles.has(file)) return false;
    const base = normalize(path.basename(file, path.extname(file)));
    return aliases.some((a) => base === a);
  });

  if (exact) return exact;

  const contains = allFontFiles.find((file) => {
    if (usedFiles.has(file)) return false;
    const base = normalize(path.basename(file, path.extname(file)));
    return aliases.some((a) => base.includes(a) || a.includes(base));
  });

  return contains || null;
}

const found = [];
const missing = [];

for (const font of fonts) {
  const file = findFontFile(font);

  if (!file) {
    missing.push(font);
    continue;
  }

  usedFiles.add(file);

  const ext = path.extname(file).toLowerCase();
  const outName = `${slug(font.family)}${ext}`;
  const outFile = path.join(OUT_DIR, outName);

  fs.copyFileSync(file, outFile);

  found.push({
    ...font,
    file,
    outName,
    outPath: `/fonts/premium/${outName}`,
  });
}

const css = found
  .map((font) => {
    const format =
      path.extname(font.outName).toLowerCase() === '.otf'
        ? 'opentype'
        : path.extname(font.outName).toLowerCase() === '.ttf'
          ? 'truetype'
          : path.extname(font.outName).toLowerCase().replace('.', '');

    return `@font-face {
  font-family: "${font.family}";
  src: url("/fonts/premium/${font.outName}") format("${format}");
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}`;
  })
  .join('\n\n');

fs.writeFileSync(CSS_FILE, css + '\n', 'utf-8');

const manifest = {
  generatedAt: new Date().toISOString(),
  defaults: {
    headline: 'Akira Expanded E BOLD',
    number: 'Panton ExtraBlack',
    date: 'DIN Condensed',
    cta: 'Nexa',
    premium: 'Fair Prosper',
    sertanejo: 'Bebas Neue',
  },
  categories: {
    impacto: found.filter((f) => f.category === 'impacto').map((f) => f.family),
    sertanejo: found.filter((f) => f.category === 'sertanejo').map((f) => f.family),
    premium: found.filter((f) => f.category === 'premium').map((f) => f.family),
    cta: found.filter((f) => f.category === 'cta').map((f) => f.family),
  },
  fonts: found.map((f) => ({
    family: f.family,
    category: f.category,
    file: f.outPath,
  })),
  missing: missing.map((f) => ({
    family: f.family,
    aliases: f.aliases,
    category: f.category,
  })),
};

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf-8');

const report = `# NovaCena Motion — Fontes Premium

## Encontradas e importadas

${found.length ? found.map((f) => `- **${f.family}** → \`${f.outPath}\``).join('\n') : 'Nenhuma fonte encontrada automaticamente.'}

## Faltando

${missing.length ? missing.map((f) => `- **${f.family}** — procurar por: ${f.aliases.join(', ')}`).join('\n') : 'Nenhuma fonte faltando.'}

## Arquivos gerados

- \`public/fonts/premium/premium-fonts.css\`
- \`public/fonts/premium/premium-fonts.json\`

## Próximo passo

Se alguma fonte ficou faltando, coloque os arquivos .ttf, .otf, .woff ou .woff2 em:

\`~/Desktop/novacena-fontes\`

Depois rode novamente:

\`node scripts/import-premium-fonts.mjs\`
`;

fs.writeFileSync(REPORT, report, 'utf-8');

console.log('');
console.log(`✅ Fontes encontradas: ${found.length}`);
console.log(`⚠️ Fontes faltando: ${missing.length}`);
console.log('');
console.log(`CSS: ${CSS_FILE}`);
console.log(`Manifest: ${MANIFEST}`);
console.log(`Relatório: ${REPORT}`);

if (missing.length) {
  const pendingDir = path.join(os.homedir(), 'Desktop', 'novacena-fontes');
  fs.mkdirSync(pendingDir, { recursive: true });
  console.log('');
  console.log('Coloque as fontes faltantes aqui e rode de novo:');
  console.log(pendingDir);
}
