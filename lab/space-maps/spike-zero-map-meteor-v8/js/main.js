import { GameApp } from './core/GameApp.js';

const root = document.getElementById('pixiRoot');
const debugEl = document.getElementById('pixiDebug');

const game = new GameApp({ root, debugEl });
game.boot();
