// PokeAPI GitHub 미러에서 데이터를 받아 src/data/pokedex.json, typechart.json을 생성한다.
// pokeapi.co는 호출하지 않는다 (raw.githubusercontent.com만 사용).
// 결과 JSON은 저장소에 커밋되므로 CI/런타임에서는 네트워크 데이터 호출이 없다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MEGA_MAP, ROSTER } from './roster.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const OUT_DIR = path.join(__dirname, '..', 'src', 'data');
const SPRITES_DIR = path.join(__dirname, '..', 'public', 'sprites');

const RAW = 'https://raw.githubusercontent.com';
const API = `${RAW}/PokeAPI/api-data/master/data/api/v2`;
const CSV = `${RAW}/PokeAPI/pokeapi/master/data/v2/csv`;
const SPRITES = `${RAW}/PokeAPI/sprites/master/sprites/pokemon`;

const KO_LANG_ID = '3';

async function cached(key, compute) {
  const file = path.join(CACHE_DIR, crypto.createHash('sha1').update(key).digest('hex'));
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    const value = await compute();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, value);
    return value;
  }
}

async function fetchWithRetry(url, opts) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    try {
      const res = await fetch(url, opts);
      if (res.ok || res.status === 404) return res;
      lastErr = new Error(`${res.status} ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchText(url) {
  return cached(url, async () => {
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 60));
    return res.text();
  });
}

// 이미지를 public/sprites/{kind}/{id}.{ext}로 다운로드 (셀프호스팅).
// 이미 존재하면 건너뜀. 404면 false 반환 (게임에서 폴백 처리).
async function downloadImage(url, kind, filename) {
  const dir = path.join(SPRITES_DIR, kind);
  const file = path.join(dir, filename);
  try {
    await fs.access(file);
    return true;
  } catch {
    /* 다운로드 진행 */
  }
  const missMarker = path.join(CACHE_DIR, `miss-${kind}-${filename}`);
  try {
    await fs.access(missMarker);
    return false; // 이전 실행에서 404 확인됨
  } catch {
    /* 시도 */
  }
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(missMarker, '');
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, buf);
  await new Promise((r) => setTimeout(r, 40));
  return true;
}

async function downloadSpriteSet(id) {
  const [artwork, front, back] = await Promise.all([
    downloadImage(`${SPRITES}/other/official-artwork/${id}.png`, 'artwork', `${id}.png`),
    downloadImage(`${SPRITES}/other/showdown/${id}.gif`, 'front', `${id}.gif`),
    downloadImage(`${SPRITES}/other/showdown/back/${id}.gif`, 'back', `${id}.gif`),
  ]);
  return { artwork, front, back };
}

// 따옴표 필드를 처리하는 최소 CSV 파서
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const csv = async (name) => parseCsv(await fetchText(`${CSV}/${name}`));

console.log('CSV 데이터 로딩...');
const [typesCsv, typeNamesCsv, typeEfficacyCsv, movesCsv, moveNamesCsv, speciesNamesCsv] =
  await Promise.all([
    csv('types.csv'), csv('type_names.csv'), csv('type_efficacy.csv'),
    csv('moves.csv'), csv('move_names.csv'), csv('pokemon_species_names.csv'),
  ]);

// 타입 (1~18만, unknown/shadow 제외)
const typeIdent = new Map(); // type_id -> identifier
for (const t of typesCsv) if (+t.id <= 18) typeIdent.set(t.id, t.identifier);

const typeKo = {};
for (const n of typeNamesCsv) {
  if (n.local_language_id === KO_LANG_ID && typeIdent.has(n.type_id)) {
    typeKo[typeIdent.get(n.type_id)] = n.name;
  }
}

const chart = {};
for (const ident of typeIdent.values()) chart[ident] = {};
for (const e of typeEfficacyCsv) {
  const atk = typeIdent.get(e.damage_type_id);
  const def = typeIdent.get(e.target_type_id);
  if (!atk || !def) continue;
  const mult = +e.damage_factor / 100;
  if (mult !== 1) chart[atk][def] = mult;
}

// 기술
const moveKo = new Map();
for (const n of moveNamesCsv) {
  if (n.local_language_id === KO_LANG_ID) moveKo.set(n.move_id, n.name);
}
const moveById = new Map();
const moveByIdent = new Map();
for (const m of movesCsv) {
  const entry = {
    id: +m.id,
    identifier: m.identifier,
    type: typeIdent.get(m.type_id),
    power: m.power === '' ? null : +m.power,
    damageClass: m.damage_class_id, // 1=status 2=physical 3=special
    ko: moveKo.get(m.id) ?? null,
  };
  moveById.set(entry.id, entry);
  moveByIdent.set(entry.identifier, entry);
}

// 타입별 일반 Z기술 한국어 이름 (move id 622~657: Breakneck Blitz 등)
const zmoveKo = {};
for (let id = 622; id <= 657; id++) {
  const m = moveById.get(id);
  if (m && m.type && m.ko && !zmoveKo[m.type]) zmoveKo[m.type] = m.ko;
}

// 한국어 종족 이름
const speciesKo = new Map();
for (const n of speciesNamesCsv) {
  if (n.local_language_id === KO_LANG_ID) speciesKo.set(+n.pokemon_species_id, n.name);
}

const isCandidate = (m) =>
  m && m.damageClass !== '1' && m.power != null && m.power >= 40 && m.power <= 120 &&
  m.type && m.ko;

function pickMoves(entry, mon) {
  if (entry.moveOverride) {
    return entry.moveOverride.map((id) => moveById.get(id));
  }
  const learnable = mon.moves
    .map((m) => moveByIdent.get(m.move.name))
    .filter(isCandidate);
  // 중복 기술 제거
  const seen = new Set();
  const candidates = learnable.filter((m) => !seen.has(m.id) && seen.add(m.id));
  const types = mon.types.map((t) => t.type.name);
  const byPower = [...candidates].sort((a, b) => b.power - a.power);
  const stab = byPower.find((m) => types.includes(m.type));
  const picks = [];
  if (stab) picks.push(stab);
  const coverage = byPower.find(
    (m) => !picks.includes(m) && !types.includes(m.type) && m.type !== picks[0]?.type
  );
  if (coverage) picks.push(coverage);
  // 부족하면 남은 후보 중 최강으로 채움
  for (const m of byPower) {
    if (picks.length >= 2) break;
    if (!picks.includes(m)) picks.push(m);
  }
  return picks;
}

console.log(`포켓몬 ${ROSTER.length}마리 데이터 수집...`);
const errors = [];
const pokedex = {};
const rosterIds = new Set(ROSTER.map((e) => e.id));

for (const entry of ROSTER) {
  const mon = JSON.parse(await fetchText(`${API}/pokemon/${entry.id}/index.json`));
  const ko = speciesKo.get(entry.id);
  if (!ko) errors.push(`#${entry.id}: 한국어 이름 없음`);

  const stats = Object.fromEntries(mon.stats.map((s) => [s.stat.name, s.base_stat]));
  const moves = pickMoves(entry, mon).filter(Boolean);
  if (moves.length < 2) errors.push(`#${entry.id} ${ko}: 기술이 ${moves.length}개 (override 필요)`);
  for (const m of moves) if (!m.ko) errors.push(`#${entry.id} ${ko}: 기술 ${m?.identifier} 한국어 이름 없음`);

  for (const evo of entry.evolvesTo ?? []) {
    if (!rosterIds.has(evo)) errors.push(`#${entry.id} ${ko}: 진화 대상 #${evo}가 로스터에 없음`);
  }

  const sprites = await downloadSpriteSet(entry.id);
  if (!sprites.artwork) errors.push(`#${entry.id} ${ko}: 아트워크 다운로드 실패`);

  // 메가진화 폼 이미지
  const megaId = MEGA_MAP[entry.id];
  let megaFront = false;
  let megaBack = false;
  if (megaId) {
    const megaSprites = await downloadSpriteSet(megaId);
    megaFront = megaSprites.front;
    megaBack = megaSprites.back;
    if (!megaSprites.artwork && !megaFront) {
      errors.push(`#${entry.id} ${ko}: 메가 폼 #${megaId} 이미지 없음`);
    }
  }

  pokedex[entry.id] = {
    id: entry.id,
    ko: ko ?? mon.name,
    types: mon.types.map((t) => t.type.name),
    hp: stats.hp,
    atk: Math.max(stats.attack, stats['special-attack']),
    def: Math.round((stats.defense + stats['special-defense']) / 2),
    spd: stats.speed,
    moves: moves.map((m) => ({ id: m.id, ko: m.ko, type: m.type, power: m.power })),
    rarity: entry.rarity,
    courses: entry.courses,
    ...(entry.evolvesTo ? { evolvesTo: entry.evolvesTo } : {}),
    ...(sprites.front && sprites.back ? {} : { noGif: true }),
    ...(megaId ? { megaId } : {}),
    ...(megaId && !megaBack ? { megaNoBack: true } : {}),
  };
  process.stdout.write(
    `  #${String(entry.id).padStart(4)} ${ko ?? mon.name}` +
      `${sprites.front && sprites.back ? '' : ' (GIF 없음)'}` +
      `${megaId ? ` [메가${megaFront ? '' : ' GIF 없음'}]` : ''}\n`
  );
}

// 코스별 레어도 분포 리포트
console.log('\n코스별 분포:');
for (const course of ['grass', 'sea', 'cave', 'legend']) {
  const pool = Object.values(pokedex).filter((p) => p.courses.includes(course));
  const byRarity = {};
  for (const p of pool) byRarity[p.rarity] = (byRarity[p.rarity] ?? 0) + 1;
  console.log(`  ${course}: ${pool.length}마리`, byRarity);
}

if (errors.length) {
  console.error(`\n검증 실패 ${errors.length}건:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, 'pokedex.json'), JSON.stringify(pokedex, null, 1));
await fs.writeFile(
  path.join(OUT_DIR, 'typechart.json'),
  JSON.stringify({ ko: typeKo, chart, zmoveKo }, null, 1)
);
const size = (await fs.stat(path.join(OUT_DIR, 'pokedex.json'))).size;
console.log(`\n완료: pokedex.json ${(size / 1024).toFixed(1)}KB, ${Object.keys(pokedex).length}마리`);
