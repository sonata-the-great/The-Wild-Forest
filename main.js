import { Game } from './core/Game.js';

const container = document.getElementById('app');
const ui = document.getElementById('ui');

const game = new Game(container, ui);
game.start();

// Expose for debugging in devtools (harmless in production)
window.__wf = game;