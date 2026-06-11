# 포켓몬 가오레 (모바일 웹) 🎮

아케이드 게임 **포켓몬 가오레**를 휴대폰 브라우저에서 즐길 수 있게 만든 팬 게임이에요.
원재를 위해 만들었어요!

## ▶️ 바로 플레이

**https://doosanrndaitft-collab.github.io/pokemon_gaole/**

휴대폰 브라우저에서 열고, **"홈 화면에 추가"** 하면 앱처럼 전체 화면으로 즐길 수 있어요 (PWA·오프라인 지원).

| 배틀 | 연타 러시 | 팀 선택 | 코스 클리어 |
|---|---|---|---|
| ![배틀](docs/screenshots/battle.png) | ![러시](docs/screenshots/rush.png) | ![팀](docs/screenshots/team.png) | ![결과](docs/screenshots/result.png) |

## 게임 방법

1. **코스 선택** — 풀숲 🌿 / 바다 🌊 / 동굴 ⛰️ 코스 중 하나를 고르세요.
   전설 코스 ⚡는 포켓몬 10마리를 잡으면 열려요!
2. **포켓몬 2마리 선택** — 처음에는 렌탈 포켓몬으로 시작해요.
   디스크가 많아지면 ✨추천 버튼이 코스에 잘 맞는 2마리를 골라줘요.
3. **코스는 3연전!** — 스테이지 1 → 2 → 👑보스를 모두 이기면 코스 클리어!
   스테이지 사이에 HP가 회복되고 쓰러진 동료도 살아나요.
4. **배틀!** — 기술을 고르고 **버튼을 마구마구 연타**하면 공격이 강해져요.
   - 💥"효과 굉장!" 표시가 붙은 기술이 잘 통하는 기술이에요
   - 적을 탭하면 직접 조준할 수 있어요 🎯
   - Z게이지가 가득 차면 강력한 **Z기술**!
   - 5성 디스크는 **메가진화**도 가능! (코스당 1회, 23종)
   - 위기에 몰리면 배틀 도중에 진화할 수도…!
5. **겟 찬스!** — 야생 포켓몬을 쓰러뜨리면 볼 룰렛이 나와요.
   포켓몬을 많이 잡을수록 좋은 볼 칸이 넓어져요 (20/50/100마리).
6. **디스크 수집** — 잡은 포켓몬은 1~5성 디스크가 돼요. (1~9세대 208마리!)
   같은 포켓몬을 더 높은 등급으로 잡으면 **그레이드 업!**
7. **보너스** — 매일 첫 배틀은 등급 UP 찬스! 져도 참가 스탬프 🎫를 받고
   5개 모으면 등급 UP 찬스와 바꿔줘요.

가끔 **거대한 그림자**(전설의 포켓몬)가 배틀에 난입하니 조심하세요…!

💾 메뉴의 백업 버튼으로 저장 데이터를 코드로 내보내고 복원할 수 있어요.
(진행 상황은 휴대폰에 자동 저장돼요. 휴대폰을 바꿀 때 백업 코드를 쓰세요!)

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm test           # 배틀 엔진 단위 테스트 (vitest)
npm run build      # 빌드 (dist/)
npm run build:data # PokeAPI 미러에서 포켓몬 데이터·이미지 재생성
```

### 구조

```
scripts/roster.mjs       # 로스터 정의 (208마리: id·레어도·코스·진화·메가)
scripts/build-data.mjs   # 데이터 파이프라인 → src/data/*.json + public/sprites/
src/engine/              # 순수 배틀 로직 (battle/damage/catch/events) — React 무관, 테스트 대상
src/store/               # zustand 전역 상태 + localStorage 저장(v2, 마이그레이션·백업)
src/screens/             # 화면 (타이틀/메뉴/코스/팀/배틀/결과/컬렉션/도감)
src/components/          # 러시 버튼, 볼 룰렛, 겟찬스, 디스크 카드, 튜토리얼 등
src/audio/               # Web Audio 합성 효과음 + 8비트풍 BGM (음원 파일 없음)
public/sprites/          # 셀프호스팅 이미지 (아트워크·배틀 GIF, 빌드 시 다운로드·커밋)
```

- 포켓몬 데이터(한국어 이름·기술·타입 상성)는 [PokeAPI](https://github.com/PokeAPI/api-data)
  GitHub 미러에서 빌드 시 생성해 커밋합니다. **런타임에는 외부 API를 호출하지 않아요.**
- 이미지는 [PokeAPI/sprites](https://github.com/PokeAPI/sprites)에서 받아 함께 배포합니다.
- 밸런스 상수는 `src/engine/damage.ts`의 `TUNING` 객체 한곳에 모여 있어요
  (난이도 조정은 여기서). 코스 배율은 `src/data/courses.ts`.

### 배포

`main` 브랜치에 푸시하면 GitHub Actions가 테스트 → 빌드 → `gh-pages` 브랜치로 자동 배포합니다.
(저장소 Settings → Pages → Source: `gh-pages` 브랜치)

변경 기록은 [CHANGELOG.md](CHANGELOG.md)에서 확인할 수 있어요.

---

이 프로젝트는 비상업적 팬 게임입니다. 포켓몬 관련 명칭·이미지의 권리는
Nintendo / Creatures / GAME FREAK / The Pokémon Company / Takara Tomy에 있습니다.
