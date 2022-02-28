import {Point, Rect} from "./graphics";
import {Callback, Observable, on, randi, SuperArray} from "./util";
import tileset_url from "./tileset@1.png";

interface View {
    get_bounds():Rect
    draw(g:CanvasSurface):void;
}
interface ParentView {
    is_parent_view():boolean,
    get_children():View[]
}
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
    private tileset: HTMLImageElement;
    constructor(model: GridModel) {
        this.id = 'grid-view'
        this.model = model;
        this.bounds = new Rect(0,0,this.model.w*16,this.model.h*16);
        this.tileset = new Image()
        this.tileset.src = tileset_url
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
            if(this.tileset) {
                g.ctx.imageSmoothingEnabled = false;
                g.ctx.drawImage(this.tileset,0,0,8,8,0,0,64,64);
            }
        })
    }
}

class SnakeView implements View {
    private model: SnakeModel;
    private id: string;
    constructor(model:SnakeModel) {
        this.id = 'snake'
        this.model = model;
    }
    draw(g: CanvasSurface): void {
        g.fill(new Rect(0,0,16,16),'yellow')
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

const EVENTS = {
    START:'start',
}
const LEFT = 'left'
const RIGHT = 'right'
const DOWN = 'down'
const UP = 'up'

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

function log(...args) {
    console.log('SNAKE:',...args);
}

const CLEAR_COLOR = '#f0f0f0'
class CanvasSurface {
    private w: number;
    private h: number;
    canvas: HTMLCanvasElement;
    private root: RootView;
    ctx: CanvasRenderingContext2D;
    private debug: boolean;
    private scale: number;
    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.scale = 2.0;
        this.canvas = document.createElement('canvas');
        this.canvas.width = w*window.devicePixelRatio*this.scale
        this.canvas.height = h*window.devicePixelRatio*this.scale
        this.canvas.setAttribute('tabindex','0');
        //turn this on for high-dpi support
        this.canvas.style.width = `${this.w*this.scale}px`
        this.canvas.style.height = `${this.h*this.scale}px`
        this.ctx = this.canvas.getContext('2d');
        this.debug = false;
        this.clear()
    }

    addToPage() {
        document.body.appendChild(this.canvas);
    }

    set_root(root: RootView) {
        this.root = root;
    }

    repaint() {
        console.time("repaint");
        this.clear();
        this.draw_stack()
        console.timeEnd("repaint");
    }

    clear() {
        this.ctx.fillStyle = CLEAR_COLOR
        this.ctx.fillRect(0, 0, this.w, this.h)
    }

    private draw_stack() {
        this.ctx.save();
        this.ctx.translate(0.5,0.5);
        this.ctx.scale(this.scale,this.scale)
        this.debug_draw_rect(new Rect(0,0,this.w-1,this.h-1),'canvas')
        this.draw_view(this.root)
        this.ctx.restore()
    }
    private draw_view(view: View) {
        this.ctx.save();
        let bds = view.get_bounds();
        this.ctx.translate(bds.x,bds.y)
        view.draw(this);
        // @ts-ignore
        if(view.is_parent_view && view.is_parent_view()) {
            let parent = view as unknown as ParentView;
            parent.get_children().forEach(ch => {
                if(this.debug) {
                    this.ctx.save();
                    this.ctx.translate(20, 20)
                }
                this.draw_view(ch);
                if(this.debug) {
                    this.ctx.restore()
                }
            })
        }
        // @ts-ignore
        this.debug_draw_rect(bds, (view.id)?(view.id):"view");
        this.ctx.restore()
    }

    fill(bounds: Rect, color: string) {
        this.ctx.fillStyle = color
        this.ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
    }

    private debug_draw_rect(bds: Rect, title: string) {
        if (!this.debug) return
        this.ctx.strokeStyle = 'black'
        this.ctx.lineWidth = 0.5;
        for(let i=0; i<3; i++) {
            this.ctx.beginPath()
            this.ctx.strokeStyle = (i%2 === 1)?'red':'black'
            this.ctx.rect(bds.x+i, bds.y+i, bds.w - i*2, bds.h - i*2 );
            this.ctx.stroke()
        }
        let str = `${title} (${bds.x},${bds.y}) (${bds.w}x${bds.h})`
        for(let i=0; i<3; i++) {
            this.ctx.font = '16px sans-serif';
            this.ctx.fillStyle = 'white'
            this.ctx.fillText(str, 3+i, 3+i + 12)
        }
        for(let i=0; i<1; i++) {
            this.ctx.font = '16px sans-serif';
            this.ctx.fillStyle = 'black'
            this.ctx.fillText(str, 3+i+1, 3+i+1 + 12)
        }
    }
}


function setup_keyboard_input() {
    let KBD = new Observable()
    document.addEventListener('keydown',(e) => {
        if (e.key === 'ArrowLeft')  KBD.fire(LEFT,{});
        if (e.key === 'ArrowRight')  KBD.fire(RIGHT,{});
        if (e.key === 'ArrowDown')  KBD.fire(DOWN,{});
        if (e.key === 'ArrowUp')  KBD.fire(UP,{});
    })

    return KBD
}

export function start() {
    log("starting")
    let All = new Observable();
    let level = 0;
    let KeyboardInput = setup_keyboard_input()

    let root = new RootView()
    let snake = new SnakeModel()
    snake.position.set(10,10);
    let board = new GridModel(20,20)
    board.fill_all(()=>0)
    let board_layer = new LayerView();
    board_layer.id = 'board'
    let board_view = new GridView(board);
    board_layer.add(board_view);
    root.add(board_layer);
    board_layer.add(new SnakeView(snake));

    // let overlay_layer = new LayerView();
    // overlay_layer.add(snake_logo);
    // overlay_layer.add(start_button);
    // root.add(overlay_layer);

    on(All,EVENTS.START,()=>restart());

    let surface = new CanvasSurface(400,300);
    surface.addToPage();
    surface.set_root(root);
    surface.repaint();

    on(KeyboardInput,LEFT,  () => move_by(new Point(-1,0)));
    on(KeyboardInput,RIGHT, () => move_by(new Point(+1,0)));
    on(KeyboardInput,DOWN,  () => move_by(new Point(0,1)));
    on(KeyboardInput,UP,    () => move_by(new Point(0,-1)));

    // on(Clock,TICK,() => {
    //     log("clock tick");
    // })

    function restart() {
        level = 0
        snake.position.set(5,5);
        snake.tail.clear();
        nextLevel()
    }
    function nextLevel() {
        level += 1
        board.fill_all(()=>EMPTY);
        board.fill_row(0,()=>WALL)
        board.fill_col(0,()=>WALL)
        board.fill_row(19,()=>WALL)
        board.fill_col(19,()=>WALL)
        snake.length = level
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
