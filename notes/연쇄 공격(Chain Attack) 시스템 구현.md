좋아, 개발자에게 바로 넘길 수 있는 **기획 의뢰서 형태**로 깔끔하게 정리해줄게.
(너 스타일에 맞게 간결 + 핵심 중심으로 정리했어)

---

# 🚀 [개발 의뢰서]

## 패시브 스킬: 연쇄 공격(Chain Attack) 시스템 구현

---

## 1. 🎯 작업 목적

본 작업은 전투 시 **타격감과 전장 장악력**을 강화하고,
플레이어에게 **성장 체감 요소**를 제공하기 위한 패시브 스킬 추가를 목표로 한다.

---

## 2. 🧠 기능 개요

적을 공격했을 때, 일정 조건 하에 **주변 적에게 연쇄적으로 추가 피해를 전달**하는 패시브 스킬.

👉 핵심 개념:

> “한 번 맞춘 공격이 주변 적으로 퍼져나간다 (Chain Damage)”

---

## 3. ⚙️ 동작 방식

### 3.1 기본 흐름

```txt
탄환 적중
  ↓
연쇄 공격 발동 여부 체크
  ↓
주변 적 탐색 (Range 내)
  ↓
최대 N개 대상 선정
  ↓
순차적으로 감소된 데미지 적용
  ↓
연쇄 이펙트 표시
```

---

## 4. 📊 레벨 설계

| 레벨   | 연쇄 대상 수 | 데미지 배율 |
| ---- | ------: | -----: |
| Lv.1 |      1대 |   100% |
| Lv.2 |      2대 |   110% |
| Lv.3 |      3대 |   120% |

---

## 5. 💥 데미지 감소 규칙 (핵심)

연쇄 대상이 많아질수록 데미지는 점점 감소한다.

### 예시

기본 데미지 = 10일 경우:

```txt
1번째 대상: 10 (100%)
2번째 대상: 8  (80%)
3번째 대상: 5  (50%)
```

### 적용 규칙

```js
falloffRates = [1.0, 0.8, 0.5]
```

---

## 6. 📐 주요 파라미터

```js
chainAttack: {
  maxLevel: 3,
  range: 140,              // 연쇄 탐색 범위

  levels: {
    1: { targetCount: 1, damageMultiplier: 1.0 },
    2: { targetCount: 2, damageMultiplier: 1.1 },
    3: { targetCount: 3, damageMultiplier: 1.2 }
  },

  falloffRates: [1.0, 0.8, 0.5]
}
```

---

## 7. ⚡ 이펙트/렌더링 가이드 (중요)

### 7.1 기본 방향

* **가벼운 렌더링 유지 필수**
* 과도한 파티클, 복잡한 번개 표현 금지

### 7.2 구현 방식

* 단순 **라인(Line) 기반 연결 효과**
* 짧은 지속 시간 (Fade Out)

```txt
A → B (얇은 선 + 약한 Glow)
```

### 7.3 성능 기준

* 프레임 드랍 유발 금지
* 동시 생성 이펙트 수 제한 필요

---

## 8. 🚫 제한 사항 (중요)

### 8.1 재귀 연쇄 금지

```txt
A → B → C → D → ... ❌ (금지)
```

👉 반드시 아래 구조 유지:

```txt
A → (B, C, D) ✔ (단일 단계만)
```

---

### 8.2 대상 중복 방지

* 동일 적에게 중복 연쇄 적용 금지

---

### 8.3 최대 대상 제한 필수

* 레벨별 targetCount 초과 금지

---

## 9. 🧩 개발 구현 가이드

### 핵심 로직

```js
function applyChainAttack(hitEnemy, bullet, enemies, level) {
  if (level <= 0) return;

  const config = chainAttack.levels[level];
  const baseDamage = bullet.damage * config.damageMultiplier;

  const targets = findNearbyEnemies(
    hitEnemy,
    enemies,
    chainAttack.range,
    config.targetCount
  );

  targets.forEach((target, index) => {
    const rate = chainAttack.falloffRates[index] ?? 0.2;
    const damage = baseDamage * rate;

    target.hp -= damage;
    spawnChainEffect(hitEnemy, target);
  });
}
```

---

## 10. 🎮 게임 플레이 기대 효과

* 다수 적 상황에서 **쓸어버리는 쾌감 증가**
* 근거리 압박 상황 대응력 상승
* 플레이 스타일 다양화 (광역 vs 단일 딜 선택)

---

## 11. 🧭 향후 확장 방향 (옵션)

* 체인 확률 추가 (확률형 패시브)
* 특정 적에게 추가 효과 (스턴, 감속 등)
* 보스에게는 감소된 효과 적용

---

## 12. 📌 최종 정리

> **연쇄 공격은 저비용으로 전투 재미를 크게 올릴 수 있는 핵심 패시브**

* 구현 난이도: 낮음 ~ 중간
* 성능 영향: 낮음
* 체감 효과: 매우 큼

---

원하면 다음 단계로
👉 “이걸 UI 업그레이드 트리(선택형 패시브)로 어떻게 넣을지”
👉 “다른 패시브랑 조합 밸런스”

이쪽도 같이 잡아줄게.
