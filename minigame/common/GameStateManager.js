const MenuComponent = require('./MenuComponent');
const GameComponent = require('./GameComponent');

class GameStateManager {
  constructor(canvas, ctx, systemInfo) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.systemInfo = systemInfo;
    this.menuComponent = new MenuComponent(canvas, ctx, systemInfo);
    this.gameComponent = null;
    this.currentState = 'menu';
  }

  setState(state) {
    if (this.gameComponent) this.gameComponent.checkpoint();
    this.gameComponent = null;
    this.currentState = state;
    if (state === 'playing') {
      this.gameComponent = new GameComponent(this.canvas, this.ctx, this.systemInfo);
      this.gameComponent.setGameStateManager(this);
    }
    this.draw();
  }

  restartGame() {
    this.setState('playing');
  }

  draw() {
    if (this.gameComponent) this.gameComponent.draw();
    else this.menuComponent.draw();
  }

  handleTouch(x, y) {
    if (this.gameComponent) this.gameComponent.handleTouch(x, y);
    else if (this.menuComponent.handleTouch(x, y) === 'startGame') this.setState('playing');
  }
}

module.exports = GameStateManager;
