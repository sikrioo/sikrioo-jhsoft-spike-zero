export function createLayers(app) {
  const layers = {
    background: new PIXI.Container(),
    world: new PIXI.Container(),
    bullets: new PIXI.Container(),
    mapFx: new PIXI.Container(),
    foreground: new PIXI.Container()
  };

  app.stage.addChild(
    layers.background,
    layers.world,
    layers.bullets,
    layers.mapFx,
    layers.foreground
  );

  return layers;
}

export function clearContainer(container, destroy = false) {
  const children = container.removeChildren();
  if (destroy) {
    for (const child of children) {
      child.destroy({ children: true });
    }
  }
}
