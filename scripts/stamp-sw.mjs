// 빌드 후 dist/sw.js의 __BUILD__를 타임스탬프로 치환 — 배포마다 앱 캐시를 갱신한다
import fs from 'node:fs';

const file = new URL('../dist/sw.js', import.meta.url);
const build = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replaceAll('__BUILD__', build));
console.log(`sw.js 버전 스탬프: ${build}`);
