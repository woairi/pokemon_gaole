# 포크해서 내 계정으로 옮기기 (이전 가이드)

이 게임은 코드 수정 없이 **포크 → 배포**가 되도록 만들어졌어요.
배포 스크립트가 계정 이름에 묶여 있지 않고(`${{ github.repository }}` 사용),
경로 설정도 **저장소 이름**(`pokemon_gaole`) 기준이라 그대로 동작합니다.

## 옮기기 전 — 기존 진행 상황 백업 (중요!)

게임 진행 상황(잡은 디스크·도감)은 **주소(origin)별로 휴대폰에 저장**돼요.
포크하면 주소가 바뀌므로(`...github.io/pokemon_gaole/` → `<내아이디>.github.io/...`)
**새 주소에서는 처음부터 시작**합니다. 옮기려면:

1. 기존 게임에서 **메뉴 → 💾(백업) → 내보내기 → 코드 복사**
2. 메모장 등에 코드를 보관
3. 새 주소로 접속한 뒤 **메뉴 → 💾 → 불러오기 → 코드 붙여넣기**

## 포크 & 배포 단계

1. GitHub에서 이 저장소를 **본인 계정으로 Fork**
   - 저장소 **이름은 `pokemon_gaole` 그대로** 두세요 (경로 설정이 이름 기준)
   - 무료 플랜이면 **공개(Public)** 로 둬야 GitHub Pages가 게시됩니다
2. 포크한 저장소의 **Actions 탭** → `I understand my workflows, enable them` 클릭
   (포크는 Actions가 기본 비활성화)
3. **배포 실행**: `main`에 아무 커밋이나 푸시하거나, Actions에서 `Deploy to GitHub Pages`
   워크플로를 **Run workflow**로 수동 실행 → `gh-pages` 브랜치가 생성됨
4. **Settings → Pages → Source**를 `gh-pages` 브랜치(`/root`)로 지정
5. 1~2분 뒤 `https://<내아이디>.github.io/pokemon_gaole/` 에서 플레이

## 저장소 이름을 바꾸고 싶다면

`vite.config.ts`의 `base`를 새 이름으로 바꾸고 커밋하면 됩니다:

```ts
base: process.env.BASE_PATH ?? '/새-저장소-이름/',
```

## 점검 체크리스트

- [ ] 포크 후 Actions 활성화
- [ ] 워크플로 1회 성공 (테스트 → 빌드 → gh-pages 푸시)
- [ ] Settings → Pages 소스 = gh-pages
- [ ] 새 주소 접속 확인 → 홈 화면에 추가(PWA)
- [ ] 백업 코드로 기존 진행 상황 복원 (선택)

> 코드는 한 줄도 안 고쳐도 돼요. 이름만 유지하면 끝입니다.
