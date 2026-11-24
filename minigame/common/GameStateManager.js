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

  get showingMenu() {
    return !this.gameComponent || this.menuComponent.page === 'settings';
  }

  draw() {
    if (this.showingMenu) this.menuComponent.draw(Boolean(this.gameComponent));
    else this.gameComponent.draw();
  }

  handleTouch(x, y) {
    if (this.showingMenu) {
      if (this.menuComponent.handleTouch(x, y) === 'startGame') this.setState('playing');
    } else {
      this.gameComponent.handleTouch(x, y);
    }
  }
}

module.exports = GameStateManager;
