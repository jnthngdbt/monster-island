import { Game } from './engine/Game';
import './ui/hud.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const game = new Game(canvas, ui);
game.start();
if (game.debug) (window as unknown as { game: Game }).game = game;
