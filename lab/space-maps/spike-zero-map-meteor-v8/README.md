# SPIKE-ZERO Map Refactor

## 목적
기존 `pixi-asteroid-flow-combat.js` 단일 파일을 기능별 모듈로 분리했습니다.
향후 맵, 무기, 플레이어 기능, HUD, 보스/웨이브 시스템이 늘어날 것을 고려한 구조입니다.

이번 버전에서는 요청 사항에 맞춰 `js/pixi/...` 경로를 제거하고 `js/...` 구조로 단순화했습니다.

## 실행
로컬 파일 직접 열기보다 간단한 정적 서버에서 실행하세요.

```bash
cd spike-zero-map-refactor-v3
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 구조
```text
index.html
css/style.css
js/main.js
js/core/
  GameApp.js
  GameState.js
  InputManager.js
  Layers.js
js/systems/
  BackgroundSystem.js
  PlayerSystem.js
  WeaponSystem.js
  MapManager.js
  DebugSystem.js
js/maps/
  BaseMap.js
  MapRegistry.js
  AsteroidMap.js
  GasMap.js
  MagneticMap.js
  NebulaMap.js
  OrbitMap.js
js/utils/
  math.js
```

## 새 맵 추가 방법
1. `js/maps/NewMap.js` 생성
2. `BaseMap`을 상속
3. `enter()`, `update(dt)`, `renderFx()`, `getDebugInfo()` 구현
4. `MapRegistry.js`에 등록
5. `index.html`에 `<button data-map="newMap">New Map</button>` 추가

## 이번 수정 내용 v3
- 가스 맵 분출을 단일 방향에서 다중 벤트/다중 리본 분출로 변경
- 가스 분출 발생 타이밍에 딜레이를 섞어 불규칙한 연속 분출 느낌 추가
- 마그네틱 맵 방전을 한 번에 여러 갈래 발생하도록 변경
- 마그네틱 방전에 딜레이/경고/활성 수명을 분리해 불규칙한 연쇄 방전 느낌 추가
- 네뷸라 번개를 1~4회 랜덤 연속 펄스로 변경
- 네뷸라에 어두운 안개, 차가운 청색 톤, 유령 구름 레이어를 추가해 더 스산한 분위기 강화

## 이전 수정 내용 v2
- `js/pixi` 경로 제거
- `css/pixi-style.css`를 `css/style.css`로 변경
- 가스 맵 행성에 플레이어 기체 충돌/밀림 처리 추가
- 마그네틱 맵 행성에 플레이어 기체 충돌/밀림 처리 추가
- 네뷸라 맵 깜박임을 랜덤 플래시에서 천둥/번개 연출로 확장

## 주요 개선점
- 맵 전환 시 이전 맵 오브젝트를 destroy 처리
- 맵별 상태를 각 Map 클래스 내부로 캡슐화
- 입력, 플레이어, 무기, 배경, 디버그 UI를 시스템 단위로 분리
- `MapRegistry`를 통해 맵 추가 지점 단순화
- 기존 숫자키 1~5와 버튼 전환 유지

## Jupiter 맵 추가

- `JupiterAtmosphereMap.js` 추가
- `MapRegistry.js`에 `jupiter` 등록
- `index.html`에 Jupiter 버튼 추가
- `Digit6`으로 Jupiter 맵 전환
- 목성 색 띠 / 소용돌이 구름 / 전경 입자 3레이어 구성
- 구름 내부 번개 1~4회 랜덤 연속 발생
- 어둡고 스산한 대기권 오버레이와 미세 화면 흔들림 추가


## Added Map

- Solar Flare Zone: left-side partial sun, intermittent solar flares, radiation bands, heat veil, and solar-wind drift. Use the `Solar` button or `7` key.

## v5 rendering lifecycle fix

- `SpaceStormMap` and `JupiterAtmosphereMap` now reuse persistent `PIXI.Graphics` objects instead of creating/destroying FX graphics every frame.
- `MapManager.renderFx()` no longer globally destroys `mapFx` for optimized maps (`reuseFx = true`).
- `BaseMap.exit()` now owns world/mapFx cleanup and resets layer transforms consistently.
- Jupiter atmospheric drift now uses a lerp target so the player does not accelerate endlessly to the left.
- Space Storm vortex FX objects are persistent and cleared/redrawn in place.
