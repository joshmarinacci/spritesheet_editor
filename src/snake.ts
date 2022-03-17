import {on, randi} from "./util";
// @ts-ignore
import snake_json from "./snake.json";

import {
    CanvasSurface, EVENTS,
    log,
} from "./uilib/canvas";
import {GridModel} from "./models";
import {LayerView} from "./uilib/components";
import {Observable, Point, Rect, Size, SuperArray} from "./uilib/common";
import {CommonEvent, SuperChildView, SuperParentView} from "./uilib/core";
import {Doc, Sheet, Sprite, SpriteFont} from "./app-model";

const SCALE = 3
const SPEEDS = [40,30,25,20,15,13,10,9,8,7,6,5,4]
const START_POSITION = new Point(15,15)
const CANVAS_SIZE = new Size(35,20)
const BOARD_SIZE = new Size(20,20)
const EMPTY = 0;
const WALL = 1;
const TAIL = 2;
const FOOD = 3;
const HEART = 4;
const SHRINK = 5;
const SCORE_POSITION = new Point(8*SCALE*10,8*SCALE*0)
const SHRINK_ODDS = 3
const HEART_ODDS = 6

class SnakeModel {
    position: Point
    direction: Point
    tail: SuperArray
    speed:number
    length:number
    constructor() {
        this.position = new Point(0,0)
        this.direction = new Point(0,-1)
        this.tail = new SuperArray()
        this.speed = 0
        this.length = 1
    }

}
class ScoreModel {
    level: number;
    lives: number
    constructor() {
        this.level = 0;
        this.lives = 0
    }
}

class GridView extends SuperParentView {
    private model: GridModel;
    private sheet: Sheet;
    private wall: Sprite;
    private empty: Sprite;
    private tail: Sprite;
    private food: Sprite;
    private heart: Sprite;
    private shrink: Sprite;
    constructor(model: GridModel, sheet: Sheet) {
        super('grid-view')
        this.model = model;
        this.sheet = sheet
        this.wall = sheet.sprites.find(s => s.name === 'wall1')
        this.empty = sheet.sprites.find(s => s.name === 'ground')
        this.tail = sheet.sprites.find(s => s.name === 'tail')
        this.food = sheet.sprites.find(s => s.name === 'food')
        this.heart = sheet.sprites.find(s => s.name === 'heart')
        this.shrink = sheet.sprites.find(s => s.name === 'potion')
    }
    draw(g: CanvasSurface): void {
        g.ctx.imageSmoothingEnabled = false
        g.fillBackgroundSize(this.size(),'white')
        this.model.forEach((w,x,y)=>{
            let color = 'white'
            if (w === EMPTY) color = 'white'
            if (w === WALL) color = 'blue'
            if (w === TAIL) color = 'orange'
            if (w === FOOD) color = 'red'
            if (w === SHRINK) color = 'green'
            if (w === HEART) color = 'pink'
            let xx = x*8*SCALE
            let yy = y*8*SCALE
            g.fill(new Rect(xx,yy,1*8*SCALE,1*8*SCALE),color);
            if (w === EMPTY) g.draw_sprite(xx,yy,this.empty,SCALE)
            if (w === WALL) g.draw_sprite(xx,yy,this.wall,SCALE)
            if (w === TAIL) g.draw_sprite(xx,yy,this.tail,SCALE)
            if (w === FOOD) g.draw_sprite(xx,yy,this.food,SCALE)
            if (w === HEART) g.draw_sprite(xx,yy,this.heart,SCALE)
            if (w === SHRINK) g.draw_sprite(xx,yy,this.shrink,SCALE)

        })
    }
    input(event: CommonEvent): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.model.w*8*SCALE,this.model.h*8*SCALE))
        return this.size()
    }
}
class SnakeView extends SuperChildView {
    private model: SnakeModel;
    private sprite_slice: Sprite;
    constructor(model: SnakeModel, spritesheet: Sheet) {
        super('snake')
        this.model = model;
        this.sprite_slice = spritesheet.sprites.find(sp => sp.name === 'head')
        this.set_size(new Size(8*SCALE,8*SCALE))
    }
    draw(g: CanvasSurface): void {
        g.ctx.imageSmoothingEnabled = false
        // g.fill(new Rect(0,0,16,16),'yellow')
        g.draw_sprite(0,0,this.sprite_slice,SCALE)
    }
    position(): Point {
        return new Point(
            this.model.position.x*8*SCALE,
            this.model.position.y*8*SCALE
        )
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}
class ScoreView extends SuperChildView{
    private score: ScoreModel;
    private font: SpriteFont;
    private snake: SnakeModel;

    constructor(score: ScoreModel, snake: SnakeModel, font: SpriteFont) {
        super('score-view')
        this.score = score;
        this.snake = snake
        this.font = font
        this.set_size(new Size(32,16))
    }
    draw(g: CanvasSurface): void {
        g.ctx.save()
        g.ctx.translate(this.position().x,this.position().y)
        // g.fillBackgroundSize(this.size(),'red')
        g.fillStandardText('level '+this.score.level,10,16,'base')
        g.fillStandardText('hearts '+this.score.lives,10,16*3,'base')
        g.fillStandardText('speed '+this.snake.speed,10,16*5,'base')
        g.fillStandardText('length '+this.snake.length,10,16*7,'base')
        g.ctx.restore()
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}
class SplashView extends SuperChildView {
    constructor() {
        super('splash-view');
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        g.fillStandardText('Snake 2: The Snakening', 200,100,'base',2)
        g.fillStandardText('arrows to turn. p switch colors.',200,150,'base',1)
        g.fillStandardText('press any key to play',200,170,'base',1)

    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

    set_visible(visible: boolean) {
        this._visible = visible
    }
}


function find_empty_point(board: GridModel, min: number, max: number):Point {
    while(true) {
        let x = randi(min,max)
        let y = randi(min,max)
        if(board.get_xy(x,y) === EMPTY) {
            return new Point(x,y)
        }
    }
}

export async function start() {
    log("starting", snake_json)
    let doc = new Doc()
    doc.reset_from_json(snake_json)

    let All = new Observable();

    let surface = new CanvasSurface(CANVAS_SIZE.w*8*SCALE,CANVAS_SIZE.h*8*SCALE);
    surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()
    let snake = new SnakeModel()
    snake.position.copy_from(START_POSITION);
    let board = new GridModel(BOARD_SIZE)
    board.fill_all(()=>EMPTY)
    let board_layer = new LayerView();
    board_layer._name = 'board'
    let board_view = new GridView(board,doc.sheets[0])
    board_layer.add(board_view);
    root.add(board_layer);
    board_layer.add(new SnakeView(snake,doc.sheets[0]));


    let score = new ScoreModel()
    let score_view = new ScoreView(score, snake, doc.fonts[0])
    score_view.set_position(SCORE_POSITION)
    board_layer.add(score_view)


    let splash_layer = new SplashView();
    root.add(splash_layer);


    surface.addToPage();
    surface.set_root(root);
    surface.setup_keyboard_input()

    surface.on_input((e) => {
        if(!playing) {
            splash_layer.set_visible(false)
            playing = true
            nextLevel()
        }
        if(e.type === 'keydown') {
            if(e.key === 'ArrowLeft')  turn_to(new Point(-1,0));
            if(e.key === 'ArrowRight') turn_to(new Point(+1,0));
            if(e.key === 'ArrowUp')    turn_to(new Point(+0,-1));
            if(e.key === 'ArrowDown')  turn_to(new Point(+0,+1));
        }
    })
    let playing = false

    function restart() {
        score.level = 0
        score.lives = 3
        snake.position.copy_from(START_POSITION);
        snake.tail.clear();
        // nextLevel()
    }

    function nextLevel() {
        score.level += 1
        board.fill_all(()=>EMPTY);
        board.fill_row(0,()=>WALL)
        board.fill_col(0,()=>WALL)
        board.fill_row(board.h-1,()=>WALL)
        board.fill_col(board.w-1,()=>WALL)
        snake.length = score.level
        snake.tail.forEach(val=>board.set_at(val,TAIL));
        if(snake.speed < SPEEDS.length-1) snake.speed += 1
        let gap = 3
        let max = BOARD_SIZE.w - gap // don't be right next to the edge
        let food = find_empty_point(board,gap,max)
        board.set_at(food,FOOD)
        if(randi(0,SHRINK_ODDS) === 0) {
            board.set_at(find_empty_point(board,gap,max),SHRINK)
        }
        if(randi(0,HEART_ODDS) === 0) {
            board.set_at(find_empty_point(board,gap,max),HEART)
        }
        surface.repaint()
    }
    function die() {
        console.log("you died");
        if(score.lives === 0) {
            // restart()
            console.log("game over")
        } else {
            score.lives -= 1
            snake.position.copy_from(START_POSITION);
            snake.tail.clear();
            score.level = score.level-1
            nextLevel()
        }
    }

    let clock = 0
    function turn_to(pt) {
        snake.direction = pt
    }
    function process_tick() {
        clock += 1
        if(clock % SPEEDS[snake.speed] !== 0) return

        //drop a tail spot where the head is
        board.set_at(snake.position,TAIL)
        //add to the tail
        snake.tail.push_end(snake.position);
        // trim tail if too long
        while (snake.tail.length() > snake.length) {
            board.set_at(snake.tail.pop_start(),EMPTY) // remove tail spot
        }

        //move the head
        snake.position = snake.position.add(snake.direction)

        //check the new spot
        let spot = board.get_at(snake.position);
        if (spot === WALL) return die();
        if (spot === TAIL) return die();
        if (spot === FOOD) return nextLevel();
        if (spot === HEART) return score.lives += 1
        if (spot == SHRINK) {
            if(snake.length > 3) snake.length -= 3
            while (snake.tail.length() > snake.length) {
                board.set_at(snake.tail.pop_start(),EMPTY) // remove tail spot
            }
            return
        }
    }

    restart()

    function refresh() {
        if(playing)process_tick()
        surface.repaint()
        requestAnimationFrame(refresh)
    }
    requestAnimationFrame(refresh)
}
