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
  }
};
