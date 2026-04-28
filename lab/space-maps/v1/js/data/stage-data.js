window.StageData = {
  asteroid: {
    id: "asteroid",
    title: "ASTEROID BELT",
    desc: "Dense rock field · shadow cover · destructible-looking debris",
    rule: "큰 소행성 뒤쪽은 암흑 구역입니다. 피하면서 싸우는 맵입니다.",
    type: "asteroid"
  },

  nebula: {
    id: "nebula",
    title: "NEBULA BLIND ZONE",
    desc: "Limited visibility · random electric flash reveal",
    rule: "LIGHT OFF 상태에서는 아주 작은 기본 시야만 보이고, L 키 조명을 켜면 넓은 조명 반경이 켜집니다. 3~6초마다 번개가 전체 화면을 잠깐 드러냅니다.",
    type: "nebula",
    visibilityRadius: 82,
    flashIntervalMin: 180,
    flashIntervalMax: 360,
    flashDurationMin: 12,
    flashDurationMax: 24
  },

  gasPlanet: {
    id: "gasPlanet",
    title: "GAS PLANET FIELD",
    desc: "Static planets · warning glow · timed energy gas eruptions",
    rule: "고정된 행성 사이를 이동하며, 예고 후 터지는 에너지 가스를 타이밍에 맞춰 피하는 맵입니다.",
    type: "gasPlanet",
    gasIntervalMin: 120,
    gasIntervalMax: 240,
    gasWarnMin: 18,
    gasWarnMax: 34,
    gasDurationMin: 44,
    gasDurationMax: 82,
    maxActiveGas: 3
  },

  orbit: {
    id: "orbit",
    title: "ORBITAL SATELLITE ZONE",
    desc: "Blue Earth backdrop · moving satellites · thin laser attacks",
    rule: "움직이는 위성과 예고 후 발사되는 얇은 레이저를 피하는 지구 궤도 맵입니다.",
    type: "orbit",
    satelliteCount: 7,
    laserIntervalMin: 120,
    laserIntervalMax: 240,
    laserWarnMin: 30,
    laserWarnMax: 60,
    laserDurationMin: 30,
    laserDurationMax: 60,
    maxActiveLasers: 3
  },

  magnetic: {
    id: "magnetic",
    title: "MAGNETIC STORM ZONE",
    desc: "Performance slow field · body-origin lightning",
    rule: "행성 주변 자기장에 들어가면 기체 성능이 둔화되고, 여러 행성에서 연쇄 번개가 행성 몸체로부터 뻗어나옵니다.",
    type: "magnetic",
    magneticForce: 0.035,
    lightningIntervalMin: 120,
    lightningIntervalMax: 240
  },

  asteroidPhysics: {
    id: "asteroidPhysics",
    title: "ASTEROID PHYSICS BELT",
    desc: "Physical asteroids · collision drift · reduced density",
    rule: "소행성 수를 줄이고, 소행성과 플레이어가 물리적으로 충돌하고 튕기는 피지컬 모드입니다.",
    type: "asteroidPhysics",
    restitution: 0.84,
    friction: 0.998
  },

  asteroidFlow: {
    id: "asteroidFlow",
    title: "ASTEROID FLOW BELT",
    desc: "Passing asteroids · light physical collision · reduced density",
    rule: "소행성이 맵 안에 갇히지 않고 한쪽에서 지나가며, 접촉 시 물리 반동이 발생하는 흐름형 소행성 맵입니다.",
    type: "asteroidFlow",
    restitution: 0.72,
    friction: 0.999
  },

  asteroidFlowCombat: {
    id: "asteroidFlowCombat",
    title: "ASTEROID FLOW COMBAT",
    desc: "Machinegun test · passing physical asteroids",
    rule: "Space 키로 머신건을 발사하고, 흐르는 소행성과 총알/충돌 반응을 테스트하는 맵입니다. 적기는 제거했습니다.",
    type: "asteroidFlowCombat"
  }
};
