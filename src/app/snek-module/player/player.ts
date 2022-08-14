import { Observable, Subject } from "rxjs";
import { Board } from "../board/board";
import { GameController } from "../game/game-controller";
import { MyMath, Vector2 } from "../utils/utils";
import { PlayerMovementProcessor } from "./player-movement";

export class Snake {
  // references  
  private drawCtx: CanvasRenderingContext2D;
  private gameControl: GameController;
  private movementProcessor: PlayerMovementProcessor;

  // snake body
  private snakeSegments: SnakeSegment[] = [];
  private snakeHeadSegment: SnakeSegment;
  private snakeHeadWidth: number;

  // events
  public deathSubject: Subject<boolean> = new Subject<boolean>();

  constructor(drawCtx: CanvasRenderingContext2D, gameControl: GameController) {
    this.drawCtx = drawCtx;
    this.gameControl = gameControl;
    this.movementProcessor = new PlayerMovementProcessor();
    this.snakeHeadWidth = this.gameControl.board.cellWidthPx * 0.9;
    this.snakeHeadSegment = new SnakeSegment(null, true);

    this.resetForStart();
  }

  public onKeyDown(e: KeyboardEvent) {
    this.movementProcessor.onKeyDown(e);
  }

  public update() {
    let moveDirection = this.movementProcessor.updateDirection(); // a valid direction the player has committed to moving in
    let tgtCell = this.snakeHeadSegment.tgtCellPos.add(moveDirection); // the cell the player will try to move into

    // check for deth D:
    if (!this.gameControl.board.cellIsInsideBoard(tgtCell)
      || this.cellIsInsidePlayer(tgtCell)) {
      this.die();
    }

    this.moveInDirection(moveDirection);
  }

  private cellIsInsidePlayer(tgtCell: Vector2): boolean {
    for (let i = 1; i < this.snakeSegments.length - 1; i++) { // -1 to ignore the tail - it will move out of the way
      if (this.snakeSegments[i].tgtCellPos.equals(tgtCell))
        return true;
    }
    return false;
  }

  private moveInDirection(dir: Vector2) {
    // move body into itself
    [...this.snakeSegments].reverse().forEach(segment => {
      segment.followSegment();
    });
    // move head segment in the move direction 
    this.snakeHeadSegment.moveToCell(this.snakeHeadSegment.tgtCellPos.add(dir));
  }

  public draw(timeDelta: number) {
    // update the snake's drawn position
    this.snakeSegments.forEach((segment, i) => {
      let smoothSpeed = timeDelta * 20;
      segment.moveDrawPosTowardsTgtPos(smoothSpeed);
    });

    // line down the snake
    let lineWidth = 20;
    this.drawCtx.strokeStyle = `rgb(0,100,100)`;
    this.drawCtx.lineWidth = lineWidth;
    this.drawCtx.lineCap = 'round';
    this.drawCtx.lineJoin = 'round';
    this.drawCtx.beginPath();
    this.drawCtx.moveTo(this.gameControl.board.getBoardPos(this.snakeSegments[this.snakeSegments.length - 1].drawCellPos.x), this.gameControl.board.getBoardPos(this.snakeSegments[this.snakeSegments.length - 1].drawCellPos.y));
    [...this.snakeSegments].reverse().forEach(segment => {
      if (segment.nextSegment != null) {
        this.drawCtx.lineTo(this.gameControl.board.getBoardPos(segment.nextSegment.drawCellPos.x), this.gameControl.board.getBoardPos(segment.nextSegment.drawCellPos.y));
      }
    });
    this.drawCtx.stroke();

    // box segments
    let headRGB = { r: 50, g: 175, b: 115 };
    let bodyRGBs = { r: 20, g: 120, b: 120 };
    for (let i = this.snakeSegments.length - 1; i >= 0; i--) {
      let segment = this.snakeSegments[i];
      let perc = Math.max(0, 1 - i / 5);
      this.drawCtx.fillStyle = `rgb(${MyMath.lerp(bodyRGBs.r, headRGB.r, perc)},${MyMath.lerp(bodyRGBs.g, headRGB.g, perc)},${MyMath.lerp(bodyRGBs.b, headRGB.b, perc)})`;

      let width = this.snakeHeadWidth * (1 - (i / 10));
      width = Math.max(width, lineWidth * 1.2);
      let x = this.gameControl.board.getBoardPos(segment.drawCellPos.x) - width / 2;
      let y = this.gameControl.board.getBoardPos(segment.drawCellPos.y) - width / 2;
      this.drawCtx.fillRect(x, y, width, width);
    };
  }

  private eat() {
    this.growSegment();
    this.gameControl.onFoodEaten();
  }

  private die() {
    console.log("player died?");
    this.deathSubject.next(true);
  }

  private growSegment() {
    let lastSegment = this.snakeSegments[this.snakeSegments.length - 1];
    let newSegment = new SnakeSegment(lastSegment);
    this.snakeSegments.push(newSegment);
  }

  public resetForStart() {
    this.snakeSegments = [];
    this.snakeHeadSegment.moveToCell(this.gameControl.board.getCenterCell(), true);
    this.snakeSegments.push(this.snakeHeadSegment);

    // starting snake length
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
    this.growSegment();
  }
}

// TODO: refactor, kinda ugly. Separate head handling from body handling.
class SnakeSegment {
  private isControllable = false; // only the head of the snake should be controllable.
  public nextSegment: SnakeSegment | null;

  // the cell the snake will move into
  private _tgtCellPos = Vector2.zero;
  public get tgtCellPos() { return new Vector2(this._tgtCellPos.x, this._tgtCellPos.y); };

  // the smoothed position used for drawing only
  private _drawCellPos = Vector2.zero;
  public get drawCellPos() { return new Vector2(this._drawCellPos.x, this._drawCellPos.y); };

  constructor(segment: SnakeSegment | null, isControllable: boolean = false) {
    this.nextSegment = segment;
    this.isControllable = isControllable;

    this._tgtCellPos = this.nextSegment?.tgtCellPos ?? this._tgtCellPos;
    this._drawCellPos.set(this._tgtCellPos);
  }

  // intended for controllable segments (the head) only
  public moveToCell(cellPos: Vector2, instant: boolean = false) {
    if (!this.isControllable) return;
    this._tgtCellPos = cellPos;

    if (instant)
      this._drawCellPos = this._tgtCellPos;
  }

  // intended to be applied from the tail to the head
  public followSegment() {
    if (!this.nextSegment) return;
    this._tgtCellPos = this.nextSegment.tgtCellPos;
  }

  public moveDrawPosTowardsTgtPos(timeDelta: number) {
    if (isNaN(timeDelta)) timeDelta = 0;
    this._drawCellPos.x = MyMath.lerp(this._drawCellPos.x, this.tgtCellPos.x, Math.min(timeDelta, 1));
    this._drawCellPos.y = MyMath.lerp(this._drawCellPos.y, this.tgtCellPos.y, Math.min(timeDelta, 1));
  }
}

