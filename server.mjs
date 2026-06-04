import { createServer } from 'node:http';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as sass from 'sass';

const port = Number(process.env.LANDING_BUILDER_API_PORT || 4301);
const landingRoot = process.env.LANDING_ROOT || 'C:\\xampp\\htdocs';
const tplRoot = process.env.CUSTOM_BANNERS_ROOT || 'C:\\Users\\andreu.soriano_sklum\\Desktop\\Repos\\custombannersbackup\\SKL\\cms01\\magazine';
const fontsDir = path.join(landingRoot, 'fonts');
const coreUnitsScssDir = path.join(landingRoot, 'themes', 'core', 'sass', 'components', 'units');
const coreUnitsScssFiles = [
  path.join(coreUnitsScssDir, '_group-section.scss'),
  path.join(coreUnitsScssDir, '_group-banner.scss'),
  path.join(coreUnitsScssDir, '_unit-text.scss'),
  path.join(coreUnitsScssDir, '_unit-card.scss'),
  path.join(coreUnitsScssDir, '_unit-banner.scss')
];
const coreUtilitiesScssDir = path.join(landingRoot, 'themes', 'core', 'sass', 'utilities');
const coreUtilitiesScssFile = path.join(coreUtilitiesScssDir, '_utilities.scss');
const sklComponentsScssDir = path.join(landingRoot, 'themes', 'skl_v2', 'sass', 'components');
const sliderCarouselScssFile = path.join(sklComponentsScssDir, '_slider-carousel.scss');
const landingFilePattern = /^\d{4}-.+\.json$/;
const azeretFonts = [
  { file: 'Azeret-Light.woff2', weight: 300 },
  { file: 'Azeret-LightItalic.woff2', weight: 300, style: 'italic' },
  { file: 'Azeret-Regular.woff2', weight: 400 },
  { file: 'Azeret-RegularItalic.woff2', weight: 400, style: 'italic' },
  { file: 'Azeret-Medium.woff2', weight: 500 },
  { file: 'Azeret-SemiBold.woff2', weight: 600 },
  { file: 'Azeret-SemiBoldItalic.woff2', weight: 600, style: 'italic' },
  { file: 'Azeret-Bold.woff2', weight: 700 }
];
let cachedCoreUnitsCss = '';
let cachedCoreUnitsCssSignature = '';
let cachedUtilityClasses = [];
let cachedUtilityClassesSignature = '';
let cachedUnitCustomProperties = null;
let cachedUnitCustomPropertiesSignature = '';

function json(res, status, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(payload);
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

function sendFont(res, fontFile, buffer) {
  const mime = fontFile.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': mime
  });
  res.end(buffer);
}

function isAzeretFontFile(file) {
  return azeretFonts.some((font) => font.file === file);
}

function azeretFontCss() {
  return `${azeretFonts.map((font) => `
@font-face {
  font-family: 'Azeret';
  font-weight: ${font.weight};
  ${font.style ? `font-style: ${font.style};` : ''}
  font-display: swap;
  src: url('/api/fonts/${font.file}') format('woff2');
}`).join('\n')}
:root {
  --font__primary: Azeret, sans-serif;
}`;
}

function isLandingFile(file) {
  return landingFilePattern.test(file) && !file.includes('/') && !file.includes('\\');
}

function landingPath(file) {
  if (!isLandingFile(file)) {
    throw new Error('Nombre de landing no válido');
  }
  return path.join(landingRoot, file);
}

function expectedTplPathFor(file) {
  const slug = file.replace(/^\d{4}-/, '').replace(/\.json$/, '');
  return path.join(tplRoot, slug, file.replace(/\.json$/, '.tpl'));
}

async function tplPathFor(file) {
  const tplFile = file.replace(/\.json$/, '.tpl');
  const expectedPath = expectedTplPathFor(file);
  if (existsSync(expectedPath)) return expectedPath;

  const matches = await findFilesByName(tplRoot, tplFile);
  return matches[0] || expectedPath;
}

async function findFilesByName(root, fileName) {
  if (!existsSync(root)) return [];

  const found = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...await findFilesByName(entryPath, fileName));
    } else if (entry.isFile() && entry.name === fileName) {
      found.push(entryPath);
    }
  }

  return found.sort((a, b) => a.localeCompare(b));
}

async function readJsonFile(file) {
  const text = await readFile(landingPath(file), 'utf8');
  return JSON.parse(text);
}

async function writeJsonFile(file, data) {
  await writeFile(landingPath(file), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function deleteLandingFile(file) {
  await unlink(landingPath(file));
}

function baseLanding() {
  return {
    title: null,
    backgroundcolor: null,
    fullWidth: true,
    columns: 1,
    direction: null,
    config_extra: null,
    sections: []
  };
}

function blankSection(id, component = 'TextGroup') {
  if (component === 'CardGroup') return blankCardSection(id);
  if (component === 'BannerGroup') return blankBannerSection(id);
  return blankTextSection(id);
}

function blankBannerForComponent(component = 'TextGroup') {
  const normalized = ['CardGroup', 'BannerGroup', 'TextGroup'].includes(component) ? component : 'TextGroup';
  return JSON.parse(JSON.stringify(blankSection('', normalized).banners[0]));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueSectionId(sections, baseId) {
  const existingIds = new Set(sections.map((section) => sectionId(section)).filter(Boolean));
  const cleanBase = String(baseId || 'section').trim() || 'section';
  if (!existingIds.has(cleanBase)) return cleanBase;

  let index = 2;
  let candidate = `${cleanBase}-${index}`;
  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${cleanBase}-${index}`;
  }
  return candidate;
}

function setSectionId(section, id) {
  section.config_extra ||= {};
  section.config_extra.custom_properties ||= {};
  section.config_extra.custom_properties.id = id;
}

function validateLandingPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('El JSON importado debe ser un objeto');
  }

  const landing = clone(value);
  if (!Array.isArray(landing.sections)) {
    throw new Error('El JSON importado debe tener un array sections');
  }

  return landing;
}

function baseSection(component, id, banner) {
  return {
    component,
    title: null,
    subtitle: null,
    cta: null,
    backgroundcolor: null,
    fullWidth: null,
    columns: {
      sm: 1
    },
    direction: {
      sm: 'column'
    },
    config_extra: {
      custom_classes: [],
      custom_properties: {
        id,
        'flex-direction': 'row',
        '--group-section__margin': '6vw 0',
        '--group-section__padding': '0 8vw'
      }
    },
    banners: [banner]
  };
}

function blankTextSection(id) {
  return baseSection('TextGroup', id, {
    fullWidth: false,
    type: 'text',
    title: {
      default: 'Nueva sección'
    },
    subtitle: null,
    description: null,
    cta: null,
    direction: {
      sm: 'column'
    },
    config_extra: {
      custom_properties: {},
      lazy: true,
      custom_classes: []
    },
    ecom_link: null,
    config_alignment: {
      horizontal: {
        sm: 'center'
      }
    },
    image_responsive: null,
    video_responsive: null
  });
}

function blankCardSection(id) {
  return baseSection('CardGroup', id, {
    fullWidth: false,
    type: 'card',
    title: {
      default: 'Nueva card'
    },
    subtitle: null,
    description: null,
    label: null,
    cta: null,
    direction: {
      sm: 'column'
    },
    config_extra: {
      custom_properties: {},
      lazy: true,
      custom_classes: []
    },
    ecom_link: {
      type: {
        default: ''
      },
      identifier: {
        default: ''
      },
      url: 'null',
      anchor: null,
      obfuscated: false,
      custom_class: null,
      config_extra: {}
    },
    config_alignment: {
      horizontal: {
        sm: 'center'
      }
    },
    image_responsive: {
      default: {
        image_sm: '',
        image_md: '',
        image_lg: ''
      }
    },
    video_responsive: null
  });
}

function blankBannerSection(id) {
  return baseSection('BannerGroup', id, {
    fullWidth: false,
    type: 'banner',
    title: {
      default: 'Nuevo banner'
    },
    subtitle: null,
    description: null,
    cta: null,
    direction: {
      sm: 'column'
    },
    config_extra: {
      custom_properties: {},
      lazy: true,
      custom_classes: []
    },
    ecom_link: {
      type: {
        default: ''
      },
      identifier: {
        default: ''
      },
      url: 'null',
      anchor: null,
      obfuscated: false,
      custom_class: null,
      config_extra: {}
    },
    config_alignment: {
      horizontal: {
        sm: 'center'
      }
    },
    image_responsive: {
      default: {
        image_sm: '',
        image_md: '',
        image_lg: ''
      }
    },
    video_responsive: null
  });
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function landingFileFromInput(number, slug) {
  const cleanNumber = String(number || '').trim();
  if (!/^\d{4}$/.test(cleanNumber)) throw new Error('El número debe tener 4 dígitos');
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) throw new Error('El nombre de la landing no puede estar vacío');
  const file = `${cleanNumber}-${cleanSlug}.json`;
  if (!isLandingFile(file)) throw new Error('Nombre de landing no válido');
  return file;
}

async function landingFiles() {
  const files = await readdir(landingRoot);
  return files
    .filter(isLandingFile)
    .sort((a, b) => Number(b.slice(0, 4)) - Number(a.slice(0, 4)) || a.localeCompare(b));
}

function extractFirstText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return value.map(extractFirstText).find(Boolean) || '';
  if (typeof value === 'object') {
    for (const key of ['default', 'es-ES', 'en-GB', 'title', 'subtitle', 'description', 'label']) {
      const found = extractFirstText(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractFirstText(item);
      if (found) return found;
    }
  }
  return '';
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
}

function collectCustomClasses(value, output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCustomClasses(item, output));
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.custom_classes)) {
      value.custom_classes.filter(Boolean).forEach((className) => output.add(className));
    }
    Object.values(value).forEach((item) => collectCustomClasses(item, output));
  }
  return [...output].sort();
}

function collectMedia(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMedia(item, output));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/^(image|poster|video)_(sm|md|lg)$/.test(key) && typeof item === 'string') {
        output.push({ key, url: item });
      } else {
        collectMedia(item, output);
      }
    }
  }
  return output;
}

function sectionId(section) {
  return section?.config_extra?.custom_properties?.id || '';
}

function sectionTitle(section) {
  for (const banner of section?.banners || []) {
    const text = extractFirstText(banner.title) || extractFirstText(banner.subtitle) || extractFirstText(banner.description) || extractFirstText(banner.label);
    if (text) return text;
  }
  return extractFirstText(section.title) || extractFirstText(section.subtitle) || extractFirstText(section.description) || '';
}

function hasMedia(value, prefix) {
  return collectMedia(value).some((item) => item.key.startsWith(prefix));
}

function unitText(unit) {
  return extractFirstText(unit?.title) || extractFirstText(unit?.subtitle) || extractFirstText(unit?.description) || extractFirstText(unit?.label) || extractFirstText(unit?.cta);
}

function sectionUnits(section) {
  const units = Array.isArray(section?.banners) && section.banners.length ? section.banners : [section];
  return units.map((unit) => ({
    type: unit?.type || '',
    hasImage: hasMedia(unit, 'image') || hasMedia(unit, 'poster'),
    hasVideo: hasMedia(unit, 'video'),
    hasText: Boolean(unitText(unit))
  }));
}

function sectionSummary(file, section, index) {
  const media = collectMedia(section);
  return {
    file,
    sectionIndex: index,
    component: section.component || section.type || 'section',
    id: sectionId(section),
    title: sectionTitle(section),
    classes: collectCustomClasses(section),
    media: media.slice(0, 4),
    previewImage: media.find((item) => item.key.startsWith('image_lg'))?.url || media.find((item) => item.key.startsWith('image_md'))?.url || media.find((item) => item.key.startsWith('image_sm'))?.url || '',
    banners: Array.isArray(section.banners) ? section.banners.length : 0,
    units: sectionUnits(section)
  };
}

async function listLandings() {
  const files = await landingFiles();
  const result = [];
  for (const file of files) {
    try {
      const data = await readJsonFile(file);
      const info = await stat(landingPath(file));
      result.push({
        file,
        number: Number(file.slice(0, 4)),
        sections: Array.isArray(data.sections) ? data.sections.length : 0,
        modifiedAt: info.mtime.toISOString()
      });
    } catch (error) {
      result.push({ file, number: Number(file.slice(0, 4)), sections: 0, error: error.message });
    }
  }
  return result;
}

function fileModifiedAt(filePath) {
  if (!existsSync(filePath)) return '';
  return statSync(filePath).mtime.toISOString();
}

function scssFilesIn(root) {
  if (!existsSync(root)) return [];
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...scssFilesIn(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      found.push(entryPath);
    }
  }
  return found;
}

function coreCssSignature() {
  return [
    ...coreUnitsScssFiles,
    ...scssFilesIn(coreUtilitiesScssDir),
    sliderCarouselScssFile
  ]
    .filter((file) => existsSync(file))
    .map((file) => `${file}:${statSync(file).mtimeMs}`)
    .join('|');
}

async function fileStamps(file) {
  const jsonPath = landingPath(file);
  const resolvedTplPath = await tplPathFor(file);
  return {
    file,
    modifiedAt: fileModifiedAt(jsonPath),
    tplPath: resolvedTplPath,
    tplModifiedAt: fileModifiedAt(resolvedTplPath),
    themeCssModifiedAt: coreCssSignature()
  };
}

async function searchComponents(query, limit) {
  const normalized = query.trim().toLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const files = await landingFiles();
  const matches = [];
  for (const file of files) {
    const data = await readJsonFile(file);
    const sections = Array.isArray(data.sections) ? data.sections : [];
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const summary = sectionSummary(file, section, index);
      const haystack = [file, summary.component, summary.id, summary.title, ...summary.classes, ...collectStrings(section)]
        .join(' ')
        .toLowerCase();
      const ok = terms.length === 0 || terms.every((term) => haystack.includes(term));
      if (ok) matches.push(summary);
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
}

async function tplStatus(file) {
  const data = await readJsonFile(file);
  const classes = collectCustomClasses(data).filter((className) => !className.startsWith('u-'));
  const tplPath = await tplPathFor(file);
  const exists = existsSync(tplPath);
  const tpl = exists ? await readFile(tplPath, 'utf8') : '';
  const themeCss = compileCoreUnitsCss();
  const missing = classes.filter((className) => !tpl.includes(`.${className}`) && !tpl.includes(className));
  return {
    file,
    tplPath,
    exists,
    modifiedAt: exists ? fileModifiedAt(tplPath) : '',
    classes,
    missing,
    css: extractTplCss(tpl),
    themeCss,
    themeCssModifiedAt: coreCssSignature(),
    themeCssPath: [...coreUnitsScssFiles, coreUtilitiesScssFile, sliderCarouselScssFile].join('; ')
  };
}

async function tplDocument(file) {
  if (!isLandingFile(file)) throw new Error('Nombre de landing no vÃ¡lido');
  const resolvedTplPath = await tplPathFor(file);
  const exists = existsSync(resolvedTplPath);

  return {
    file,
    tplPath: resolvedTplPath,
    exists,
    modifiedAt: exists ? fileModifiedAt(resolvedTplPath) : '',
    content: exists ? await readFile(resolvedTplPath, 'utf8') : ''
  };
}

async function writeTplDocument(file, content) {
  if (!isLandingFile(file)) throw new Error('Nombre de landing no vÃ¡lido');
  const resolvedTplPath = await tplPathFor(file);
  await mkdir(path.dirname(resolvedTplPath), { recursive: true });
  await writeFile(resolvedTplPath, String(content ?? ''), 'utf8');
  return tplDocument(file);
}

function extractTplCss(tpl) {
  const matches = [...tpl.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  return matches.map((match) => match[1].trim()).filter(Boolean).join('\n\n');
}

function compileCoreUnitsCss() {
  const signature = coreCssSignature();
  if (cachedCoreUnitsCss && cachedCoreUnitsCssSignature === signature) return cachedCoreUnitsCss;

  const source = `
    $base-spacing-unit: 1em;
    $black: #000000;
    $white: #ffffff;
    $DEBUG: false;
    $bp__sm: 768px;
    $bp__md: 992px;
    $bp__lg: 1200px;
    $site__max-width: 1440px;
    $header__height: 4em;
    $header__height--tablet: 4.5em;
    $header__height--desktop: 5.25em;
    $color__corp--dark: #111111;
    $color__success: #247a4d;
    $color__warning: #a45d15;
    $color__danger: #9f2d20;
    $color__text: #111111;

    @mixin media-breakpoint($name) {
      @if $name == sm {
        @media (min-width: 768px) { @content; }
      } @else if $name == sm--in {
        @media (min-width: 468px) and (max-width: 767.9px) { @content; }
      } @else if $name == md {
        @media (min-width: 992px) { @content; }
      } @else if $name == md--in {
        @media (min-width: 768px) and (max-width: 991.9px) { @content; }
      } @else if $name == lg {
        @media (min-width: 1200px) { @content; }
      } @else if $name == sm--max {
        @media (max-width: 767.9px) { @content; }
      } @else if $name == md--max {
        @media (max-width: 991.9px) { @content; }
      } @else if $name == lg--max {
        @media (max-width: 1199.9px) { @content; }
      } @else {
        @content;
      }
    }

    @mixin responsive-rules() {
      @content;

      &\\@sm--down {
        @include media-breakpoint(sm--max) { @content; }
      }

      &\\@sm--up {
        @include media-breakpoint(sm) { @content; }
      }

      &\\@md--down {
        @include media-breakpoint(md--max) { @content; }
      }

      &\\@md--up {
        @include media-breakpoint(md) { @content; }
      }
    }

    @mixin clearfix {
      &::after {
        clear: both;
        content: "";
        display: table;
      }
    }

    @mixin z-index($layer) {
      @if $layer == modal {
        z-index: 9000;
      } @else if $layer == overlay {
        z-index: 8000;
      } @else if $layer == dropdown {
        z-index: 7000;
      } @else if $layer == header {
        z-index: 6000;
      } @else if $layer == content {
        z-index: 1;
      } @else if $layer == footer {
        z-index: 0;
      } @else if $layer == to-bottom {
        z-index: -1;
      }
    }

    @mixin line-clamp($font-size, $line-height, $lines) {
      display: -webkit-box;
      -webkit-line-clamp: $lines;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-height: calc(#{$font-size} * #{$line-height} * #{$lines});
    }

    @import "group-section";
    @import "group-banner";
    @import "unit-text";
    @import "unit-card";
    @import "unit-banner";
    @import "utilities";
    @import "slider-carousel";
  `;

  cachedCoreUnitsCss = sass.compileString(source, {
    loadPaths: [coreUnitsScssDir, coreUtilitiesScssDir, sklComponentsScssDir],
    style: 'compressed'
  }).css;
  cachedCoreUnitsCss = `${azeretFontCss()}\n${cachedCoreUnitsCss}`;
  cachedCoreUnitsCssSignature = signature;

  return cachedCoreUnitsCss;
}

function utilityClasses() {
  const signature = coreCssSignature();
  if (cachedUtilityClasses.length && cachedUtilityClassesSignature === signature) {
    return cachedUtilityClasses;
  }

  const css = compileCoreUnitsCss();
  const classes = new Set();
  const classRegex = /\.((?:\\.|[a-zA-Z0-9_-])(?:\\.|[a-zA-Z0-9_@/:!-])*)/g;
  let match;

  while ((match = classRegex.exec(css)) !== null) {
    const className = match[1]
      .replace(/\\/g, '')
      .split(':')[0]
      .trim();

    if (className.startsWith('u-')) {
      classes.add(className);
    }
  }

  cachedUtilityClasses = [...classes].sort((a, b) => a.localeCompare(b));
  cachedUtilityClassesSignature = signature;
  return cachedUtilityClasses;
}

function unitCustomProperties() {
  const signature = coreCssSignature();
  if (cachedUnitCustomProperties && cachedUnitCustomPropertiesSignature === signature) {
    return cachedUnitCustomProperties;
  }

  const css = compileCoreUnitsCss();
  const properties = {
    text: extractCssVariables(css, '--unit-text__'),
    card: extractCssVariables(css, '--unit-card__'),
    banner: extractCssVariables(css, '--unit-banner__')
  };

  cachedUnitCustomProperties = properties;
  cachedUnitCustomPropertiesSignature = signature;
  return properties;
}

function extractCssVariables(css, prefix) {
  const variables = new Set();
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const variableRegex = new RegExp(`${escapedPrefix}[a-zA-Z0-9_-]+(?:--[a-zA-Z0-9_-]+)?`, 'g');
  let match;

  while ((match = variableRegex.exec(css)) !== null) {
    variables.add(match[0]);
  }

  return [...variables].sort((a, b) => a.localeCompare(b));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    const fontMatch = url.pathname.match(/^\/api\/fonts\/([^/]+)$/);
    if (req.method === 'GET' && fontMatch) {
      const fontFile = decodeURIComponent(fontMatch[1]);
      if (!isAzeretFontFile(fontFile)) return fail(res, 404, 'Fuente no encontrada');
      const fontPath = path.join(fontsDir, fontFile);
      if (!existsSync(fontPath)) return fail(res, 404, 'Fuente no encontrada');
      return sendFont(res, fontFile, await readFile(fontPath));
    }

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return json(res, 200, { landingRoot, tplRoot });
    }

    if (req.method === 'GET' && url.pathname === '/api/landings') {
      return json(res, 200, { landings: await listLandings() });
    }

    if (req.method === 'POST' && url.pathname === '/api/landings') {
      const payload = await body(req);
      const file = landingFileFromInput(payload.number, payload.slug);
      const targetPath = landingPath(file);
      if (existsSync(targetPath)) return fail(res, 409, 'Ya existe una landing con ese nombre');
      const landing = baseLanding();
      await writeJsonFile(file, landing);
      return json(res, 201, { ok: true, file, landing });
    }

    if (req.method === 'GET' && url.pathname === '/api/components') {
      const query = url.searchParams.get('query') || '';
      const limit = Number(url.searchParams.get('limit') || 80);
      return json(res, 200, { components: await searchComponents(query, limit) });
    }

    if (req.method === 'GET' && url.pathname === '/api/utility-classes') {
      return json(res, 200, { classes: utilityClasses() });
    }

    if (req.method === 'GET' && url.pathname === '/api/unit-custom-properties') {
      return json(res, 200, { properties: unitCustomProperties() });
    }

    if (req.method === 'POST' && url.pathname === '/api/landings/import') {
      const payload = await body(req);
      const rawFile = String(payload.file || payload.fileName || '').trim();
      const fallbackFile = String(payload.targetFile || '').trim();
      const targetFile = isLandingFile(rawFile) ? rawFile : fallbackFile;
      if (!isLandingFile(targetFile)) throw new Error('El nombre del JSON importado debe ser tipo 1234-nombre.json');

      const landing = validateLandingPayload(payload.landing);
      await writeJsonFile(targetFile, landing);
      return json(res, 200, {
        ok: true,
        file: targetFile,
        sections: landing.sections.length
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/tpl-status') {
      const file = url.searchParams.get('file') || '';
      return json(res, 200, await tplStatus(file));
    }

    if (req.method === 'GET' && url.pathname === '/api/tpl') {
      const file = url.searchParams.get('file') || '';
      return json(res, 200, await tplDocument(file));
    }

    if (req.method === 'PUT' && url.pathname === '/api/tpl') {
      const file = url.searchParams.get('file') || '';
      const payload = await body(req);
      return json(res, 200, await writeTplDocument(file, payload.content));
    }

    if (req.method === 'GET' && url.pathname === '/api/file-stamps') {
      const file = url.searchParams.get('file') || '';
      return json(res, 200, await fileStamps(file));
    }

    const landingMatch = url.pathname.match(/^\/api\/landings\/([^/]+)$/);
    if (landingMatch && req.method === 'GET') {
      const file = decodeURIComponent(landingMatch[1]);
      const data = await readJsonFile(file);
      const sections = Array.isArray(data.sections) ? data.sections : [];
      return json(res, 200, {
        file,
        modifiedAt: fileModifiedAt(landingPath(file)),
        sections: sections.map((section, index) => sectionSummary(file, section, index)),
        raw: data
      });
    }

    if (landingMatch && req.method === 'DELETE') {
      const file = decodeURIComponent(landingMatch[1]);
      await deleteLandingFile(file);
      return json(res, 200, { ok: true, deleted: file });
    }

    const appendMatch = url.pathname.match(/^\/api\/landings\/([^/]+)\/sections$/);
    if (appendMatch && req.method === 'POST') {
      const targetFile = decodeURIComponent(appendMatch[1]);
      const payload = await body(req);
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections)) target.sections = [];

      if (payload.create === true) {
        const component = ['CardGroup', 'BannerGroup', 'TextGroup'].includes(payload.component) ? payload.component : 'TextGroup';
        const prefix = component.replace(/Group$/, '').toLowerCase();
        const id = String(payload.id || `${prefix}-section-${target.sections.length + 1}`).trim();
        const section = blankSection(id, component);
        target.sections.push(section);
        await writeJsonFile(targetFile, target);
        return json(res, 200, {
          ok: true,
          sections: target.sections.length,
          added: sectionSummary(targetFile, section, target.sections.length - 1)
        });
      }

      const sourceFile = payload.sourceFile;
      const sectionIndex = Number(payload.sectionIndex);
      const id = String(payload.id || '').trim();
      const source = await readJsonFile(sourceFile);
      if (!Array.isArray(source.sections) || !source.sections[sectionIndex]) throw new Error('Sección origen no encontrada');
      const section = JSON.parse(JSON.stringify(source.sections[sectionIndex]));
      if (id) {
        section.config_extra ||= {};
        section.config_extra.custom_properties ||= {};
        section.config_extra.custom_properties.id = id;
      }
      target.sections.push(section);
      await writeJsonFile(targetFile, target);
      return json(res, 200, { ok: true, sections: target.sections.length, added: sectionSummary(targetFile, section, target.sections.length - 1) });
    }

    const reorderMatch = url.pathname.match(/^\/api\/landings\/([^/]+)\/sections\/reorder$/);
    if (reorderMatch && req.method === 'PUT') {
      const targetFile = decodeURIComponent(reorderMatch[1]);
      const payload = await body(req);
      const fromIndex = Number(payload.fromIndex);
      const toIndex = Number(payload.toIndex);
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections)) throw new Error('La landing no tiene sections');
      const lastIndex = target.sections.length - 1;
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) throw new Error('Índices de sección no válidos');
      if (fromIndex < 0 || fromIndex > lastIndex || toIndex < 0 || toIndex > lastIndex) throw new Error('Índice de sección fuera de rango');
      if (fromIndex === toIndex) {
        return json(res, 200, {
          ok: true,
          sections: target.sections.map((item, index) => sectionSummary(targetFile, item, index))
        });
      }
      const [section] = target.sections.splice(fromIndex, 1);
      target.sections.splice(toIndex, 0, section);
      await writeJsonFile(targetFile, target);
      return json(res, 200, {
        ok: true,
        sections: target.sections.map((item, index) => sectionSummary(targetFile, item, index))
      });
    }

    const duplicateSectionMatch = url.pathname.match(/^\/api\/landings\/([^/]+)\/sections\/(\d+)\/duplicate$/);
    if (duplicateSectionMatch && req.method === 'POST') {
      const targetFile = decodeURIComponent(duplicateSectionMatch[1]);
      const sectionIndex = Number(duplicateSectionMatch[2]);
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections) || !target.sections[sectionIndex]) throw new Error('Sección origen no encontrada');

      const section = clone(target.sections[sectionIndex]);
      const id = sectionId(section);
      if (id) setSectionId(section, uniqueSectionId(target.sections, `${id}-copy`));

      target.sections.splice(sectionIndex + 1, 0, section);
      await writeJsonFile(targetFile, target);
      return json(res, 200, {
        ok: true,
        sections: target.sections.length,
        duplicated: sectionSummary(targetFile, section, sectionIndex + 1)
      });
    }

    const addBannerMatch = url.pathname.match(/^\/api\/landings\/([^/]+)\/sections\/(\d+)\/banners$/);
    if (addBannerMatch && req.method === 'POST') {
      const targetFile = decodeURIComponent(addBannerMatch[1]);
      const sectionIndex = Number(addBannerMatch[2]);
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections) || !target.sections[sectionIndex]) throw new Error('Sección destino no encontrada');

      const section = target.sections[sectionIndex];
      if (!Array.isArray(section.banners)) section.banners = [];
      const banner = blankBannerForComponent(section.component);
      section.banners.push(banner);

      await writeJsonFile(targetFile, target);
      return json(res, 200, {
        ok: true,
        sections: target.sections.length,
        banners: section.banners.length,
        updated: sectionSummary(targetFile, section, sectionIndex)
      });
    }

    const updateSectionMatch = url.pathname.match(/^\/api\/landings\/([^/]+)\/sections\/(\d+)$/);
    if (updateSectionMatch && req.method === 'PUT') {
      const targetFile = decodeURIComponent(updateSectionMatch[1]);
      const sectionIndex = Number(updateSectionMatch[2]);
      const payload = await body(req);
      const section = payload.section;
      if (!section || typeof section !== 'object' || Array.isArray(section)) throw new Error('La sección debe ser un objeto JSON');
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections) || !target.sections[sectionIndex]) throw new Error('Sección destino no encontrada');
      target.sections[sectionIndex] = section;
      await writeJsonFile(targetFile, target);
      const info = await stat(landingPath(targetFile));
      return json(res, 200, {
        ok: true,
        modifiedAt: info.mtime.toISOString(),
        updated: sectionSummary(targetFile, section, sectionIndex)
      });
    }

    if (updateSectionMatch && req.method === 'DELETE') {
      const targetFile = decodeURIComponent(updateSectionMatch[1]);
      const sectionIndex = Number(updateSectionMatch[2]);
      const target = await readJsonFile(targetFile);
      if (!Array.isArray(target.sections) || !target.sections[sectionIndex]) throw new Error('Sección destino no encontrada');
      const [deletedSection] = target.sections.splice(sectionIndex, 1);
      await writeJsonFile(targetFile, target);
      return json(res, 200, {
        ok: true,
        deleted: sectionSummary(targetFile, deletedSection, sectionIndex),
        sections: target.sections.length
      });
    }
    return fail(res, 404, 'Ruta no encontrada');
  } catch (error) {
    return fail(res, 500, error.message || String(error));
  }
});

server.listen(port, () => {
  console.log(`Landing Builder API http://localhost:${port}`);
  console.log(`JSON root: ${landingRoot}`);
  console.log(`TPL root:  ${tplRoot}`);
});
