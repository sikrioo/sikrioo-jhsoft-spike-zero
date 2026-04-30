export class InputManager {
  constructor() {
    this.keys = new Set();
    this.mapHotkeys = new Map([
      ['Digit1', 'asteroid'],
      ['Digit2', 'gas'],
      ['Digit3', 'magnetic'],
      ['Digit4', 'nebula'],
      ['Digit5', 'orbit'],
      ['Digit6', 'jupiter'],
      ['Digit7', 'solar'],
      ['Digit8', 'storm'],
      ['Digit9', 'meteor'],
      ['Digit0', 'cataclysm']
    ]);
  }

  bind({ onMapChange }) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      const mapType = this.mapHotkeys.get(e.code);
      if (mapType) onMapChange(mapType);

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  has(code) {
    return this.keys.has(code);
  }
}
