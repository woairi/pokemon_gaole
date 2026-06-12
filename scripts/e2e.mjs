// 전체 게임 루프 E2E 검증 (헤드리스 크롬)
// 사용법: npm run build && npm run preview -- --port 4173 &
//        BASE_URL=http://localhost:4173/pokemon_gaole/ npm run e2e
// 사전 준비: npx playwright install chromium
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173/pokemon_gaole/';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

// 좌표 기반 raw 터치 (애니메이션 중에도 동작)
const tapEl = async (sel) => {
  const el = await page.$(sel);
  if (!el) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return true;
};

await page.goto(BASE_URL);
await page.waitForSelector('.title', { timeout: 10000 });
console.log('✓ 타이틀 화면');

await tapEl('.title');
await page.waitForSelector('.menu', { timeout: 5000 });
console.log('✓ 메인 메뉴');

if (await page.$('.tutorial')) {
  for (let i = 0; i < 3; i++) {
    await tapEl('.tutorial__btn');
    await page.waitForTimeout(300);
  }
  console.log((await page.$('.tutorial')) ? '✗ 튜토리얼이 닫히지 않음' : '✓ 튜토리얼 완료');
}

await tapEl('.menu-btn--battle');
await page.waitForSelector('.course-card', { timeout: 5000 });
console.log('✓ 코스 선택');

await tapEl('.course-card');
await page.waitForSelector('.disk-card', { timeout: 5000 });
const disks = await page.$$('.disk-card');
for (const d of disks.slice(0, 2)) {
  const box = await d.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
await tapEl('.big-btn');
console.log('✓ 팀 선택 → 배틀 시작');

let resultReached = false;
const stagesSeen = new Set();
const deadline = Date.now() + 300000;
while (Date.now() < deadline) {
  if (await page.$('.result__banner')) {
    resultReached = true;
    break;
  }
  if (await page.$('.evolution')) {
    await tapEl('.evolution');
    await page.waitForTimeout(800);
    continue;
  }
  if (await page.$('.getchance')) {
    await tapEl('.getchance');
    await page.waitForTimeout(600);
    continue;
  }
  if (await page.$('.mult-roulette')) {
    await page.touchscreen.tap(195, 422).catch(() => {});
    await page.waitForTimeout(500);
    continue;
  }
  if (await page.$('.rush-overlay')) {
    for (let i = 0; i < 8; i++) {
      await page.touchscreen.tap(195, 560).catch(() => {});
      await page.waitForTimeout(70);
    }
    continue;
  }
  const stageLabel = await page
    .$eval('.battle__round', (el) => el.textContent)
    .catch(() => null);
  if (stageLabel) stagesSeen.add(stageLabel);
  const move = await page.$('.move-btn:not(:disabled)');
  if (move) {
    const box = await move.boundingBox();
    if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(250);
    continue;
  }
  await page.waitForTimeout(350);
}

console.log('스테이지 진행:', [...stagesSeen].join(' → ') || '(없음)');
if (resultReached) {
  console.log('✓ 결과 화면 도달');
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pokemon-gaole-save'))
  );
  console.log('✓ 저장 v' + save.version + ':', JSON.stringify(save.stats));
  await page.reload();
  await page.waitForSelector('.title');
  console.log('✓ 새로고침 후 저장 유지');
} else {
  console.log('✗ 결과 화면 도달 실패');
  await page.screenshot({ path: 'e2e-fail.png' });
}

const realErrors = errors.filter((e) => !e.includes('ERR_CERT'));
if (realErrors.length) {
  console.log('--- JS 에러 ---');
  realErrors.slice(0, 10).forEach((e) => console.log(e));
} else console.log('✓ JS 에러 없음');
await browser.close();
process.exit(resultReached && realErrors.length === 0 ? 0 : 1);
