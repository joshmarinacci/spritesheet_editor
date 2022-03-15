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

const SCALE = 3.5

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

class SnakeModel {
    position: Point
    tail: SuperArray
    length:number
    constructor() {
        this.position = new Point(0,0)
        this.tail = new SuperArray()
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


const EMPTY = 0;
const WALL = 1;
const TAIL = 2;
const FOOD = 3;
const HEART = 4;
const SHRINK = 5;


class ScoreView extends SuperChildView{
    private score: ScoreModel;
    private font: SpriteFont;
    constructor(score: ScoreModel, font:SpriteFont) {
        super('score-view')
        this.score = score;
        this.font = font
        this.set_size(new Size(32,16))
    }
    draw(g: CanvasSurface): void {
        g.ctx.save()
        g.ctx.translate(this.position().x,this.position().y)
        // g.fillBackgroundSize(this.size(),'red')
        g.fillStandardText('level '+this.score.level,10,16,'base')
        g.fillStandardText('hearts '+this.score.lives,10,16+16+16,'base')
        g.ctx.restore()
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}

export async function start() {
    log("starting", snake_json)
    let doc = new Doc()
    doc.reset_from_json(snake_json)
    // draw map
    // draw score using font
    // draw snake using the sheet directly

    let All = new Observable();

    let surface = new CanvasSurface(35*8*SCALE,25*8*SCALE);
    surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()
    let snake = new SnakeModel()
    snake.position.set(10,10);
    let board = new GridModel(25,25)
    board.fill_all(()=>0)
    let board_layer = new LayerView();
    board_layer._name = 'board'
    let board_view = new GridView(board,doc.sheets[0])
    board_layer.add(board_view);
    root.add(board_layer);
    board_layer.add(new SnakeView(snake,doc.sheets[0]));


    let score = new ScoreModel()
    let score_view = new ScoreView(score, doc.fonts[0])
    score_view.set_position(new Point(8*SCALE*13,8*SCALE*1))
    board_layer.add(score_view)


    // let overlay_layer = new LayerView();
    // overlay_layer.add(snake_logo);
    // overlay_layer.add(start_button);
    // root.add(overlay_layer);

    on(All,EVENTS.START,()=>restart());

    surface.addToPage();
    surface.set_root(root);
    surface.setup_keyboard_input()
    surface.repaint();

    surface.on_input((e) => {
        if(e.type === 'keydown') {
            if(e.key === 'ArrowLeft')  move_by(new Point(-1,0));
            if(e.key === 'ArrowRight') move_by(new Point(+1,0));
            if(e.key === 'ArrowUp')    move_by(new Point(+0,-1));
            if(e.key === 'ArrowDown')  move_by(new Point(+0,+1));
        }
    })

    function restart() {
        score.level = 0
        score.lives = 3
        snake.position.set(5,5);
        snake.tail.clear();
        nextLevel()
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
        while(true) {
            let x = randi(1,29)
            let y = randi(1,29)
            if(board.get_xy(x,y) == EMPTY) {
                board.set_xy(x,y,FOOD)
                break;
            }
        }
        let shrink = randi(0,3)
        if(shrink === 0) {
            while(true) {
                let x = randi(1,29)
                let y = randi(1,29)
                if(board.get_xy(x,y) == EMPTY) {
                    board.set_xy(x,y,SHRINK)
                    break;
                }
            }
        }
        let heart = randi(0,3)
        if(heart === 0) {
            while(true) {
                let x = randi(1,29)
                let y = randi(1,29)
                if(board.get_xy(x,y) == EMPTY) {
                    board.set_xy(x,y,HEART)
                    break;
                }
            }
        }
        surface.repaint()
    }
    function die() {
        console.log("you died");
        if(score.lives === 0) {
            restart()
        } else {
            score.lives -= 1
            snake.position.set(5,5);
            snake.tail.clear();
            score.level = score.level-1
            nextLevel()
        }
    }

    function move_by(offset:Point) {

        //drop a tail spot where the head is
        board.set_at(snake.position,TAIL)
        //add to the tail
        snake.tail.push_end(snake.position);
        // trim tail if too long
        while (snake.tail.length() > snake.length) {
            board.set_at(snake.tail.pop_start(),EMPTY) // remove tail spot
        }

        //move the head
        snake.position = snake.position.add(offset)

        //check the new spot
        let spot = board.get_at(snake.position);
        if (spot === WALL) return die();
        if (spot === TAIL) return die();
        if (spot === FOOD) return nextLevel();
        if (spot === HEART) {
            score.lives += 1
            surface.repaint()
            return
        }
        if (spot == SHRINK) {
            if(snake.length > 3) {
                snake.length -= 3
            }
            while (snake.tail.length() > snake.length) {
                board.set_at(snake.tail.pop_start(),EMPTY) // remove tail spot
            }
            surface.repaint()
            return
        }

        surface.repaint()
    }

    All.fire(EVENTS.START,{})
}
