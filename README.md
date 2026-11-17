# 경기 페스타 부스 안내 사이트 — AI·바이브 코딩 수학 수업

경기도수학교육연구회 부스에서 **AI활용 Hybrid 체험수학 2.0·평가 피드백 자동화** 사례를 체험하고,
**바이브 코딩과 AI를 활용한 학생 맞춤형 수업**의 만드는 과정을 안내하는 정적 웹사이트입니다.
GitHub Pages에 그대로 올리면 동작하며, 작품의 목적·수학적 내용·프로그램 설명·만드는 방법은 **구글 시트**에서 수정합니다.

## 버전 폴더

| 폴더 | 내용 | 주소 |
|------|------|------|
| `2차/` | 최신 버전. 첫 화면 배경에 y = sin x, y = cos x 좌표평면, 수식 띠 | https://sewoongyun.github.io/gyeonggi-math-festa/ (자동으로 2차로 이동) |
| `1차/` | 이전 버전 그대로 보존 | https://sewoongyun.github.io/gyeonggi-math-festa/1차/ |

루트의 `index.html`, `admin.html`, `print.html`은 2차로 넘겨 주는 안내 페이지입니다(이미 퍼진 QR과 `#app=` 링크가 그대로 동작).
새 버전을 만들 때는 최신 폴더를 복사해 `3차/`로 만들고, 루트 안내 페이지의 `2차/`를 `3차/`로 바꾸면 됩니다.
아래 파일 설명은 각 버전 폴더 안 기준입니다.

```
index.html          메인 — 탭 4개: 사례 체험 / 만드는 방법 / 소개 / 부스 이용 순서
admin.html          관리자 — 작품 추가·수정·삭제 (Apps Script 연결 시 시트에 저장)
print.html          부스용 QR 인쇄 시트
config.js           ★ 기관명·구글 시트 주소 설정
data/apps.json      기본 작품 데이터 (시트를 읽지 못할 때 사용)
assets/             style.css, app.js, admin.js
apps-script/Code.gs 구글 시트 쓰기 API (선택)
```

## 1. 구글 시트 = 콘텐츠 원본

연동 시트: https://docs.google.com/spreadsheets/d/1Za1qTX3PCyx6UhR_yaELus6qeQpiHFf06iAfwpfEaOg/edit

| ID | 구분 | 제목 | 한줄소개 | 체험링크 | 목적 | 수학적 내용 | 프로그램 설명 | 만드는 방법 | 제작자 | 태그 | 공개 | 순서 |
|----|------|------|----------|----------|------|-------------|---------------|-------------|--------|------|------|------|

- **구분**: `체험수학 2.0` / `평가 피드백` / `바이브 코딩`
- **공개**: `Y` 또는 `N`, **순서**: 숫자(작을수록 앞)
- 긴 칸은 셀 안에서 줄바꿈(Alt+Enter)해도 그대로 표시됩니다. `1) `, `- ` 목록도 그대로 보입니다.

### 사이트가 시트를 읽게 하기 (1분, 꼭 필요)
시트에서 **공유 → 일반 액세스 → 링크가 있는 모든 사용자 → 뷰어**로 바꿉니다.
`config.js`의 `csvUrl`에 이미 이 시트 주소가 들어 있으므로, 공유만 바꾸면 사이트가 시트를 읽습니다(상단 배지가 "구글 시트 연동 중"으로 바뀜).
공유를 바꾸기 전에는 `data/apps.json`의 기본 데이터를 보여 줍니다.

### 관리자 화면에서 저장까지 하기 (선택, 10분)
시트를 직접 편집해도 충분하지만, `admin.html`의 입력 폼으로 저장하고 싶다면:
1. 시트에서 **확장 프로그램 → Apps Script** → `apps-script/Code.gs` 내용을 붙여 넣고 저장
2. 톱니(프로젝트 설정) → **스크립트 속성 추가**: `ADMIN_KEY` = 관리자 비밀번호
3. 함수 `setup` 선택 → 실행(권한 허용)
4. **배포 → 새 배포 → 웹 앱**, 실행: 나 / 액세스: 모든 사용자 → URL 복사
5. `config.js`의 `apiUrl`에 그 URL을 넣고 커밋

코드를 고친 뒤에는 **배포 → 배포 관리 → 연필 → 새 버전**으로 다시 배포해야 반영됩니다.

## 2. GitHub Pages에 올리기

이 폴더는 이미 git 저장소로 초기화되어 첫 커밋이 되어 있습니다.

1. GitHub에서 새 저장소를 만듭니다(예: `gyeonggi-math-festa`, Public).
2. 아래 명령으로 올립니다.

```bash
git remote add origin https://github.com/SewoongYun/gyeonggi-math-festa.git
git push -u origin main
```

3. 저장소 **Settings → Pages → Build and deployment** → Source: *Deploy from a branch*, Branch: `main` / `/(root)` → Save
4. 1~2분 뒤 `https://sewoongyun.github.io/gyeonggi-math-festa/` 로 접속됩니다.

GitHub CLI(`gh`)가 있다면 한 줄로 끝납니다.

```bash
gh repo create gyeonggi-math-festa --public --source=. --push
```

이후 `gh api -X POST repos/SewoongYun/gyeonggi-math-festa/pages -f "source[branch]=main" -f "source[path]=/"` 로 Pages를 켤 수 있습니다.

## 3. 부스 운영 팁

- `print.html`에서 **QR 인쇄용 시트**를 출력해 테이블에 붙입니다. QR은 작품 소개 페이지(`#app=아이디`)로 연결되며 '앱으로 바로 연결' 모드로 바꿀 수 있습니다.
- 작품 상세창은 **사례 소개 / 만드는 방법** 두 탭으로 나뉘며, 하단에 "구글 시트에서 수정" 링크가 있습니다.
- 피드백 웹앱 체험용 학생 비밀번호는 작품 설명 칸에 적어 두었습니다. 관리자 비밀번호는 사이트에 올리지 않았습니다.

## 4. 자료 출처

2026 경기도중등수학교육연구회 활동기록집 — 「AI활용 Hybrid 체험수학 2.0 및 평가 피드백 자동화 시스템 구축」, 「바이브 코딩과 AI를 활용한 학생 맞춤형 수업」
