import {Callback, Observable, on, Point, randi, Rect, SuperArray} from "./util";
// @ts-ignore
import tileset_url from "./tileset@1.png";
import {
    CanvasSurface, EVENTS,
    log,
    ParentView,
    setup_keyboard_input,
    SpriteSheet,
    SpriteSlice,
    View
} from "./canvas";

class RootView implements View, ParentView {
    private children: any[];
    constructor() {
        this.children = []
    }
    add(child: LayerView) {
        this.children.push(child)
    }

    get_bounds(): Rect {
        return new Rect(0,0,100,100)
    }

    draw(g: CanvasSurface): void {
        // g.fill(this.get_bounds(),'red');
    }

    get_children(): View[] {
        return this.children;
    }

    is_parent_view(): boolean {
        return true
    }
}
class LayerView implements View, ParentView {
    private children: any[];
    id:string
    constructor() {
        this.id = 'some layer'
        this.children = []
    }
    add(child: View) {
        this.children.push(child);
    }

    get_bounds(): Rect {
        return new Rect(0,0,100,100)
    }

    draw(g: CanvasSurface): void {
        // g.fill(this.get_bounds(),'orange')
    }

    get_children(): View[] {
        return this.children
    }

    is_parent_view(): boolean {
        return true;
    }
}
class GridView implements View {
    private model: GridModel;
    private id: string;
    bounds: Rect;
    private spritesheet: SpriteSheet;
    private wall: SpriteSlice;
    private empty: SpriteSlice;
    private tail: SpriteSlice;
    private food: SpriteSlice;

    constructor(model: GridModel, spritesheet: SpriteSheet) {
        this.id = 'grid-view'
        this.model = model;
        this.bounds = new Rect(0,0,this.model.w*16,this.model.h*16);
        this.spritesheet = spritesheet
        this.wall = spritesheet.get_slice(0)
        this.empty = spritesheet.get_slice(1)
        this.tail = spritesheet.get_slice(3)
        this.food = spritesheet.get_slice(4);
    }

    get_bounds(): Rect {
        return this.bounds
    }

    draw(g: CanvasSurface): void {
        g.fill(this.get_bounds(),'white')
        this.model.forEach((w,x,y)=>{
            let color = 'white'
            if (w === EMPTY) color = 'white'
            if (w === WALL) color = 'blue'
            if (w === TAIL) color = 'orange'
            if (w === FOOD) color = 'red'
            g.fill(new Rect(x*16,y*16,15,15),color);
            if (w === EMPTY) g.draw_slice(x*16,y*16,this.empty,2)
            if (w === WALL) g.draw_slice(x*16,y*16,this.wall,2)
            if (w === TAIL) g.draw_slice(x*16,y*16,this.tail,2)
            if (w === FOOD) g.draw_slice(x*16,y*16,this.food,2)

        })
    }
}
class SnakeView implements View {
    private model: SnakeModel;
    private id: string;
    private spritesheet: SpriteSheet;
    private sprite_slice: SpriteSlice;

    constructor(model: SnakeModel, spritesheet: SpriteSheet) {
        this.id = 'snake'
        this.model = model;
        this.spritesheet = spritesheet
        this.sprite_slice = spritesheet.get_slice(2)
    }
    draw(g: CanvasSurface): void {
        g.fill(new Rect(0,0,16,16),'yellow')
        g.draw_slice(0,0,this.sprite_slice,2)
    }

    get_bounds(): Rect {
        let pos = this.model.position;
        return new Rect(pos.x*16,pos.y*16,16,16)
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
    constructor() {
        this.level = 0;
    }
}


const EMPTY = 0;
const WALL = 1;
const TAIL = 2;
const FOOD = 3;


class GridModel {
    w: number;
    h: number;
    private data: any[];
    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.data = []
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
    }

    get_xy(x:number,y:number):any {
        let n = this.xy_to_n(x,y);
        return this.data[n]
    }
    set_xy(x:number,y:number,value:any) {
        let n = this.xy_to_n(x,y);
        this.data[n] = value;
    }
    fill_all(cb: Callback) {
        this.data = this.data.map((v)=>cb(v));
    }

    fill_row(row: number, cb: Callback) {
        for(let i=0; i<this.h; i++) {
            this.set_xy(i,row,cb(this.get_xy(i,row)))
        }
    }
    fill_col(col: number, cb: Callback) {
        for(let v=0; v<this.h; v++) {
            this.set_xy(col,v,cb(this.get_xy(col,v)))
        }
    }

    private xy_to_n(x: number, y: number) {
        return x + y*this.h;
    }

    forEach(cb: (w, x, y) => void) {
        for(let j=0; j<this.h; j++) {
            for (let i=0; i<this.w; i++) {
                cb(this.get_xy(i,j),i,j);
            }
        }
    }
    dump() {
        log("grid model", this.w,this.h);
        log(this.data);
    }

    get_at(pt: Point) {
        return this.get_xy(pt.x,pt.y)
    }

    set_at(pt: Point, value: any) {
        return this.set_xy(pt.x,pt.y,value)
    }
}

class ScoreView implements View {
    private score: ScoreModel;
    private bounds: Rect;
    private slices: SpriteSlice[];
    constructor(score: ScoreModel, spritesheet:SpriteSheet) {
        this.score = score;
        this.bounds = new Rect(8*9,0,32,16)
        this.slices = []
        for(let i=0; i<=9; i++) {
            this.slices[i] = spritesheet.get_slice(4+i)
        }
    }

    draw(g: CanvasSurface): void {
        let ones = 0;
        let tens = 0;
        if(this.score.level < 10) {
            ones = this.score.level
            // g.draw_slice(0, 0, this.slices[this.score.level], 2)
        } else {
            ones = this.score.level%10;
            tens = Math.floor(this.score.level/10)
        }
        g.draw_slice(this.bounds.x, 0, this.slices[tens], 2)
        g.draw_slice(this.bounds.x+16, 0, this.slices[ones], 2)
    }

    get_bounds(): Rect {
        return this.bounds
    }

}

export async function start() {
    log("starting")
    let All = new Observable();

    let KeyboardInput = setup_keyboard_input()
    let surface = new CanvasSurface(400,300);
    let spritesheet = await surface.load_spritesheet(tileset_url);
    console.log("loaded now")

    let root = new RootView()
    let snake = new SnakeModel()
    snake.position.set(10,10);
    let board = new GridModel(20,20)
    board.fill_all(()=>0)
    let board_layer = new LayerView();
    board_layer.id = 'board'
    let board_view = new GridView(board,spritesheet);
    board_layer.add(board_view);
    root.add(board_layer);
    board_layer.add(new SnakeView(snake,spritesheet));


    let score = new ScoreModel()
    board_layer.add(new ScoreView(score, spritesheet))


    // let overlay_layer = new LayerView();
    // overlay_layer.add(snake_logo);
    // overlay_layer.add(start_button);
    // root.add(overlay_layer);

    on(All,EVENTS.START,()=>restart());

    surface.addToPage();
    surface.set_root(root);
    surface.repaint();

    on(KeyboardInput,EVENTS.LEFT,  () => move_by(new Point(-1,0)));
    on(KeyboardInput,EVENTS.RIGHT, () => move_by(new Point(+1,0)));
    on(KeyboardInput,EVENTS.DOWN,  () => move_by(new Point(0,1)));
    on(KeyboardInput,EVENTS.UP,    () => move_by(new Point(0,-1)));

    function restart() {
        score.level = 0
        snake.position.set(5,5);
        snake.tail.clear();
        nextLevel()
    }

    function nextLevel() {
        score.level += 1
        board.fill_all(()=>EMPTY);
        board.fill_row(0,()=>WALL)
        board.fill_col(0,()=>WALL)
        board.fill_row(19,()=>WALL)
        board.fill_col(19,()=>WALL)
        snake.length = score.level
        snake.tail.forEach(val=>board.set_at(val,TAIL));
        board.set_xy(randi(1,19),randi(1,19),FOOD)
        surface.repaint()
    }
    function die() {
        console.log("you died");
        restart()
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

        surface.repaint()
    }

    All.fire(EVENTS.START,{})
}
