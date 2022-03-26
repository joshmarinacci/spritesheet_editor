import {randi} from "../../common/util";
// @ts-ignore
import snake_json from "./snake.json";

import {
    CanvasSurface, EVENTS,
    log,
} from "../../lib/src/canvas";
import {GridModel} from "../../common/models";
import {LayerView} from "../../lib/src/components";
import {Point, Rect, Size, SuperArray} from "../../lib/src/common";
import {CommonEvent, BaseView, BaseParentView} from "../../lib/src/core";
import {
    CHERRY_BLOSSOM,
    DEMI_CHROME,
    Doc, DUNE,
    GRAYSCALE_PALETTE,
    INVERTED_PALETTE,
    Sheet,
    Sprite,
    SpriteFont, Tilemap
} from "../tileeditor/app-model";

const SCALE = 3
const SPEEDS = [
    40,35,30,25,20,20,20,
    15,15,15,
    13,13,13,
    10,10,10,
    9,9,9,
    8,8,8,
    7,7,7,
    6,6,6,
    5,5,5,
    4,4,4
]
const START_POSITION = new Point(15,15)
const CANVAS_SIZE = new Size(30,20)
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
const COLOR_PALETTES = [
    GRAYSCALE_PALETTE,
    INVERTED_PALETTE,
    DEMI_CHROME,
    CHERRY_BLOSSOM,
    DUNE,
]

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

class GridView extends BaseParentView {
    private model: GridModel;
    private sheet: Sheet;
    private wall_left: Sprite;
    private wall_right: Sprite;
    private empty: Sprite;
    private tail: Sprite;
    private food: Sprite;
    private heart: Sprite;
    private shrink: Sprite;
    private wall_top: Sprite;
    private wall_bottom: Sprite;
    constructor(model: GridModel, sheet: Sheet) {
        super('grid-view')
        this.model = model;
        this.sheet = sheet
        this.wall_left = sheet.sprites.find(s => s.name === 'wall_left')
        this.wall_right = sheet.sprites.find(s => s.name === 'wall_right')
        this.wall_top = sheet.sprites.find(s => s.name === 'wall_top')
        this.wall_bottom = sheet.sprites.find(s => s.name === 'wall_bottom')
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
            if (w === WALL) {
                if(x === 0) g.draw_sprite(xx, yy, this.wall_left, SCALE)
                if(x === this.model.w-1) g.draw_sprite(xx, yy, this.wall_right, SCALE)
                if(y === 0) g.draw_sprite(xx, yy, this.wall_top, SCALE)
                if(y === this.model.w-1) g.draw_sprite(xx, yy, this.wall_bottom, SCALE)
            }
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
class SnakeView extends BaseView {
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
class ScoreView extends BaseView{
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
        let lines = [
            `Level ${this.score.level}`,
            `Hearts ${this.score.lives}`,
            `Speed ${this.snake.speed}`,
            `Length ${this.snake.length}`,
        ]
        lines.forEach((str,i) => {
            g.fillStandardText(str, 10, 16*i*4+32, 'base', 2)
        })
        g.ctx.restore()
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}
class SplashView extends BaseView {
    constructor() {
        super('splash-view');
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'rgba(255,255,255,1.0)')
        g.ctx.save()
        g.ctx.strokeStyle = 'black'
        g.ctx.lineWidth = 4
        g.ctx.strokeRect(4,4,this.size().w-4*2,this.size().h-4*2)
        g.ctx.restore()
        let x = 150
        g.fillStandardText('Snake 2: The Snakening', x,150,'base',2)
        let lines = [
            'arrow keys turn',
            `'p' switch colors`,
            'press any key to start'
        ]
        lines.forEach((str,i) => {
            g.fillStandardText(str,x,220+i*32,'base',1)
        })
        // g.fillStandardText('arrows to turn. p switch colors.',x,220,'base',1)
        // g.fillStandardText('p switch colors.',x,240,'base',1)
        // g.fillStandardText('press any key to play',x,260,'base',1)
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

    set_visible(visible: boolean) {
        this._visible = visible
    }
}
class DialogView extends BaseView {
    private text: string;
    private map: Tilemap;
    private sheet: Sheet;
    constructor(map:Tilemap, sheet:Sheet) {
        super('dialog-view');
        this.map = map
        this.sheet = sheet
        this.text = 'dialog text here'
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        let sprite_w = this.sheet.sprites[0].w
        let map_w = this.map.w * sprite_w * SCALE
        let map_scale = SCALE * sprite_w
        let map_x = (this.size().w - map_w)/2
        let text_w = g.measureText(this.text,'base').w *2
        let text_x = (this.size().w - text_w)/2
        g.draw_tilemap(this.map,this.sheet,map_x,16,map_scale)
        g.fillStandardText(this.text, text_x,150,'base',2)
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }
    set_visible(visible: boolean) {
        this._visible = visible
    }

    set_text(died: string) {
        this.text = died
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
    log("total level count =", SPEEDS.length)
    let doc = new Doc()
    doc.reset_from_json(snake_json)


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

    let dialog_layer = new DialogView(doc.maps.find(m => m.name === 'dialog'), doc.sheets[0]);
    root.add(dialog_layer)
    dialog_layer.set_visible(false)

    surface.addToPage();
    surface.set_root(root);
    surface.setup_keyboard_input()

    let current_palette = 0
    function cycle_palette() {
        current_palette = (current_palette + 1) % COLOR_PALETTES.length
        doc.set_palette(COLOR_PALETTES[current_palette])
    }

    surface.on_input((e) => {
        if(gameover) {
            splash_layer.set_visible(false)
            gameover = false
            playing = true
            nextLevel()
        }
        if(e.type === 'keydown') {
            if(e.key === 'ArrowLeft')  turn_to(new Point(-1,0));
            if(e.key === 'ArrowRight') turn_to(new Point(+1,0));
            if(e.key === 'ArrowUp')    turn_to(new Point(+0,-1));
            if(e.key === 'ArrowDown')  turn_to(new Point(+0,+1));
            if(e.key === 'p') cycle_palette()
        }
    })
    let playing = false
    let gameover = true

    function restart() {
        score.level = 0
        score.lives = 3
        snake.speed = 0
        snake.position.copy_from(START_POSITION);
        snake.tail.clear();
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
        if(snake.speed === SPEEDS.length-1) {
            return win()
        }
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
        playing = false
        dialog_layer.set_text('Level '+score.level)
        dialog_layer.set_visible(true)
        setTimeout(()=>{
            playing = true
            dialog_layer.set_visible(false)
        },1000)
    }
    function win() {
        console.log("you won")
        playing = false
        dialog_layer.set_text('!!! You Win!!!!')
        dialog_layer.set_visible(true)
        gameover = true
    }

    function die() {
        console.log("you died");
        playing = false
        if(score.lives === 0) {
            dialog_layer.set_text('): game over :(')
            dialog_layer.set_visible(true)
            setTimeout(()=>{
                restart()
            },1000)
        } else {
            dialog_layer.set_text('died :(')
            dialog_layer.set_visible(true)
            setTimeout(()=>{
                dialog_layer.set_visible(false)
                playing = true
                score.lives -= 1
                snake.position.copy_from(START_POSITION);
                snake.tail.clear();
                score.level = score.level-1
                nextLevel()
            },1000)
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
