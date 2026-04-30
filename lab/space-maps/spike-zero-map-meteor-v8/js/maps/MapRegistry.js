import { AsteroidMap } from './AsteroidMap.js';
import { GasMap } from './GasMap.js';
import { MagneticMap } from './MagneticMap.js';
import { NebulaMap } from './NebulaMap.js';
import { OrbitMap } from './OrbitMap.js';
import { JupiterAtmosphereMap } from './JupiterAtmosphereMap.js';
import { SolarFlareMap } from './SolarFlareMap.js';
import { SpaceStormMap } from './SpaceStormMap.js';
import { MeteorShowerMap } from './MeteorShowerMap.js';
import { CataclysmMap } from './CataclysmMap.js';

export const MAP_REGISTRY = {
  asteroid: AsteroidMap,
  gas: GasMap,
  magnetic: MagneticMap,
  nebula: NebulaMap,
  orbit: OrbitMap,
  jupiter: JupiterAtmosphereMap,
  solar: SolarFlareMap,
  storm: SpaceStormMap,
  meteor: MeteorShowerMap,
  cataclysm: CataclysmMap
};
