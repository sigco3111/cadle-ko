# 캐들 한국어판 (Cadle-ko)

**비공식 한국어판 — 브라우저에서 바로 켜지는 Destiny 풍 FPS-RPG 「Cadle」의 한국어판입니다.**

### ▶ [플레이하기](https://sigco3111.github.io/cadle-ko/play/)

- 원작: **Humpalumps/Cadle** — <https://github.com/Humpalumps/Cadle> (제작: Ian Cadle, 코드 MIT)
- 원작 데모: <https://cadle.gg/play/>
- 한글화 기준 원작 커밋: ea0da62549980816a6a27e08b75808b1f56d70e7

## 무엇을 했나

- 화면에 나오는 영어 문구를 한국어로: 퀘스트 65개(제목·목표·의뢰 대사·진행·완료), 아이템·크리처·지역 이름, 아이템 설명과 툴팁, 메뉴·버튼·설정·조작 화면
- 오른쪽 아래 **English / 한국어** 버튼으로 원문(영어)으로 즉시 전환 (선택은 브라우저에 기억됩니다)
- 한글 글꼴: 시스템 한글 글꼴 우선(Apple SD Gothic Neo, 맑은 고딕, Noto Sans KR 순), 한국어 줄바꿈(word-break: keep-all) 적용
- 하단에 원작 표기(원작 저장소 링크)를 게임 화면 안에 둠
- 용어 표: [docs/glossary.md](docs/glossary.md)

## 플레이 방법

- WASD로 이동, 마우스로 조준·사격, Shift로 질주. 슬라이드와 더블 점프로 관성을 이어가며 이동합니다.
- 정확한 키 목록은 게임 안 **조작**(Controls) 화면에서 확인하세요.
- 10개 지역, 65개 퀘스트, 25종의 크리처. 레벨 1–50.

## 기술

- 원작 그대로 three.js r185 + postprocessing + @dgreenheck/ez-tree, 빌드는 Vite.
- 번역은 소스를 다시 쓰지 않고 **표시 시점 번역 오버레이**(src/i18n/overlay.js + src/i18n/ko.json)로 적용합니다. 게임 로직이 영어 문자열을 비교하는 부분을 건드리지 않기 위해서입니다.
- GitHub Actions 러너에서 원작 커밋을 복사 → 오버레이 주입 → Vite 빌드 → docs/ 게시 순서로 만들어집니다.

## 설치·실행

```bash
npm install
npm run dev        # http://127.0.0.1:5173/play/
npm run build      # dist/ (Pages 배포는 /cadle-ko/ 기준 경로)
```

## 라이선스·원작 표기

- 원작 코드는 **MIT**(LICENSE 유지). 원작 NOTICE도 원문 그대로 유지했습니다.
- 원작 NOTICE에 따르면 public/assets/의 이미지·모델은 MIT 라이선스 부여 대상이 아니고, 원작자는 공개용 포크라면 에셋을 다시 만들거나 교체하라고 적었습니다. 이 저장소는 게임이 그대로 실행되도록 원본 에셋을 포함하지만 에셋에 대해 어떤 라이선스도 주장하지 않으며, 원작자가 요청하면 즉시 제거합니다. (NOTICE-ko.md 참고)
- 원작자와 무관한 비공식 한글화이며, 모든 권리는 원작자에게 있습니다.

## [번역 외 변경]

- play/index.html, index.html에 한국어 오버레이 스크립트(src/i18n/overlay.js)를 추가했습니다.
- GitHub Pages 하위 경로 배포를 위해 빌드 후 docs/에서 루트 절대 경로(/assets/…, /play)를 /cadle-ko/ 기준으로 치환합니다.
- 개발용 자료(progress/, progress.html, .claude/, 원작 docs/는 upstream-docs/)는 배포본에서 제외했습니다.
- 원작에는 분석·통계 스크립트나 의견 팝업이 없어 제거한 외부 기능은 없습니다.
- 원작 README는 README.en.md로 보존했습니다.

## 확인한 것 / 확인하지 못한 것

- 확인: Pages 주소가 열리고 타이틀 화면·메뉴가 한국어로 표시됨, English 전환 동작, 하위 경로에서 에셋·모델 로딩, 빌드 산출물에 원작 외 외부 요청 없음.
- 확인하지 못함: 클라우드 브라우저의 WebGL 성능 한계로 실제 3D 플레이(전투·퀘스트 진행)를 오래 해 보지 못했습니다. 인게임 퀘스트 화면의 긴 본문은 사전에 포함되어 있으나 화면에서 직접 확인하지 못했습니다.

