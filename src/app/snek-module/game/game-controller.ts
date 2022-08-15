import { Board } from "../board/board";
import { FoodDispenser } from "../food/food-dispenser";
import { Snake } from "../player/player";

export class GameController {
    public player: Snake;
    public board: Board;
    private preyDispenser: FoodDispenser;

    score: number = 0;

    private _gameState: GameState = GameState.MainMenu;
    public get gameState() { return this._gameState; }
    public get onMainMenu() { return this._gameState == GameState.MainMenu; }
    public get isPlaying() { return this._gameState == GameState.Playing; }
    public get isGameOver() { return this._gameState == GameState.GameOver; }
    public get playerHasWon() { return this._gameState == GameState.Victorious; }

    gameIntervalId: number;

    // game settings 
    readonly boardNumCellsWide = 9;
    readonly updateFreqMs = 250;
    readonly arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    readonly spaceCode = "Space";

    constructor(drawCtx: CanvasRenderingContext2D, boardSizePx: number) {
        this._gameState = GameState.MainMenu;

        this.board = new Board(drawCtx, this.boardNumCellsWide, boardSizePx);

        this.player = new Snake(this, drawCtx);
        this.player.deathEvent.subscribe(() => {
            this.gameOver(false);
        });
        this.player.atePreyEvent.subscribe(() => {
            this.onPreyEaten();
        });

        this.preyDispenser = new FoodDispenser(this, drawCtx);

        this.setUpKeyboardListener();

        this.resetGame();
    }

    private setUpKeyboardListener() {
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }
    private onKeyDown(e: KeyboardEvent) {
        switch (this.gameState) {
            case GameState.Playing:
                this.player.onKeyDown(e);
                break;
            case GameState.MainMenu:
                if (this.arrowKeys.includes(e.key))
                    this.startGame(e);
                break;
            case GameState.GameOver:
            case GameState.Victorious:
                if (e.code == this.spaceCode)
                    this.goToMainMenu();
                break;
        }
    }

    // order matters!
    public draw(timeDeltaS: number) {
        this.board.draw(timeDeltaS);
        this.preyDispenser.draw(timeDeltaS);
        this.player.draw(timeDeltaS);
    }

    private startGame(e: KeyboardEvent) {
        this.player.onKeyDown(e);
        this._gameState = GameState.Playing;
        this.startUpdateLoop();
    }

    private startUpdateLoop() {
        this.gameIntervalId = window.setInterval(() => this.doGameUpdate(), this.updateFreqMs);
    }

    private doGameUpdate() {
        this.player.update();
    }

    private gameOver(won: boolean) {
        this._gameState = won ? GameState.Victorious : GameState.GameOver;
        window.clearInterval(this.gameIntervalId);
    }

    private goToMainMenu() {
        this._gameState = GameState.MainMenu;
        this.resetGame();
    }

    // care! order matters!
    private resetGame() {
        this.preyDispenser.reset();
        this.board.reset();
        this.player.reset();
        this.score = 0;
        this.spawnPrey();
    }

    public onPreyEaten() {
        this.score++;
        let numCellsLeft = this.board.getUnoccupiedCells().length;
        if (numCellsLeft > 0)
            this.spawnPrey();
        else
            this.gameOver(true);
    }

    private spawnPrey() {
        let newPrey = this.preyDispenser.spawnNewPrey();
        this.player.setPrey(newPrey);
    }
}

enum GameState {
    MainMenu,
    Playing,
    GameOver,
    Victorious
}