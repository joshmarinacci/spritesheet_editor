import {gen_id, Rect} from "./util";
import {CanvasSurface, CommonEvent, InputView, ParentView, View} from "./canvas";

export const ACTIVE_BUTTON_COLOR = '#a3e3ff';
export const BUTTON_COLOR = '#e3e3e0';
export const BUTTON_BORDER_COLOR = '#949492';

export class Label implements View {
    bounds: Rect;
    id: string;
    private text: string;
    children: View[];

    visible(): boolean {
        return true;
    }

    constructor(text: string) {
        this.id = gen_id('label')
        this.bounds = new Rect(0, 0, 100, 30);
        this.text = text;
        this.children = []
    }

    draw(ctx: CanvasSurface) {
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.text, 0, 20);
    }

    get_bounds(): Rect {
        return this.bounds
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

export class Button implements View, InputView {
    bounds: Rect
    children: View[]
    id: string
    private title: string
    private cb: any
    hover:boolean

    visible(): boolean {
        return true;
    }
    get_bounds(): Rect {
        return this.bounds
    }

    constructor(title: string, cb) {
        this.title = title;
        this.id = gen_id('button')
        this.bounds = new Rect(0, 0, 100, 30);
        this.children = []
        this.cb = cb;
        this.hover = false
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds, this.hover?ACTIVE_BUTTON_COLOR:BUTTON_COLOR)
        ctx.strokeBackground(this.bounds,BUTTON_BORDER_COLOR)
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.title, 5, 20);
    }

    input(event: CommonEvent): void {
        if (event.type === 'mousedown') {
            this.hover = true
            this.cb(event)
            event.ctx.repaint()
        }
        if (event.type === 'mouseup') {
            this.hover = false
            event.ctx.repaint()
        }
    }

    is_input_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }

}

export class ToggleButton implements View, InputView {
    bounds: Rect
    children: View[]
    id: string
    private title: string
    selected:boolean
    cb:any

    constructor(title: string, cb) {
        this.title = title;
        this.id = "a toggle button";
        this.bounds = new Rect(0, 0, 100, 30);
        this.children = []
        this.selected = false;
        this.cb = cb;
    }

    visible(): boolean {
        return true;
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds, this.selected?BUTTON_BORDER_COLOR:BUTTON_COLOR)
        ctx.strokeBackground(this.bounds,BUTTON_BORDER_COLOR)
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.title, 5, 20);
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            this.cb(event)
        }
    }

    is_input_view(): boolean {
        return true;
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

export class BaseParentView implements View, ParentView {
    id: string;
    bounds: Rect
    children: View[];
    private _visible: boolean;

    constructor(id: string, bounds?: Rect) {
        this.id = id
        this.bounds = bounds || new Rect(0, 0, 100, 100)
        this.children = []
        this._visible = true;
    }

    add(view: View) {
        this.children.push(view);
    }

    clip_children(): boolean {
        return false;
    }

    draw(g: CanvasSurface): void {
        // console.log('drawing base view',this.id, this.visible())
    }

    get_bounds(): Rect {
        return this.bounds
    }

    get_children(): View[] {
        return this.children
    }

    is_parent_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    visible(): boolean {
        return this._visible;
    }
    set_visible(vis:boolean) {
        this._visible = vis
    }
}

export class HBox extends BaseParentView {
    constructor() {
        super(gen_id('hbox'), new Rect(0,0,100,100))
    }
    layout(g:CanvasSurface, parent:View) {
        let x = 0;
        let y = 0;
        let my = 0;
        this.children.forEach(ch => {
            ch.get_bounds().x = x;
            ch.get_bounds().y = y;
            x += ch.get_bounds().w + 5
            my = Math.max(my,ch.get_bounds().h)
        })
        this.bounds.w = x;
        this.bounds.h = my;
    }
}

export class LayerView extends BaseParentView{
    constructor() {
        super(gen_id('layer'),new Rect(0,0,100,100))
    }

    layout(g: CanvasSurface, parent: View): void {
        if(parent) {
            this.bounds.w = parent.get_bounds().w
            this.bounds.h = parent.get_bounds().h
        } else {
            this.bounds.w = g.canvas.width
            this.bounds.h = g.canvas.height
        }
    }
}
