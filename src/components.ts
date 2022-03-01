import {gen_id, Rect} from "./util";
import {CanvasSurface, CommonEvent, InputView, ParentView, View} from "./canvas";
export const BUTTON_COLOR = '#e3e3e0';
export const BUTTON_BORDER_COLOR = '#949492';

export class Label implements View {
    bounds: Rect;
    id: string;
    private text: string;
    children: View[];

    constructor(text: string) {
        this.id = 'a label'
        this.bounds = new Rect(0, 0, 100, 30);
        this.text = text;
        this.children = []
    }

    draw(ctx: CanvasSurface) {
        // ctx.fillRect(0,0,this.bounds.w,this.bounds.h);
        // ctx.fillBounds(this.bounds,'#f0f0f0');
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.text, 0, 20);
    }

    get_bounds(): Rect {
        return this.bounds
    }
}


export class Button implements View, InputView {
    bounds: Rect
    children: View[]
    id: string
    private title: string
    private cb: any

    get_bounds(): Rect {
        return this.bounds
    }

    constructor(title: string, cb) {
        this.title = title;
        this.id = "a button";
        this.bounds = new Rect(0, 0, 100, 30);
        this.children = []
        this.cb = cb;
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds, BUTTON_COLOR)
        ctx.strokeBackground(this.bounds,BUTTON_BORDER_COLOR)
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.title, 5, 20);
    }

    input(event: CommonEvent): void {
        if (event.type === 'mousedown') {
            this.cb(event)
        }
    }

    is_input_view(): boolean {
        return true
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
}

export class HBox implements View, ParentView {
    bounds: Rect;
    children: View[];
    id: string;
    get_bounds(): Rect {
        return this.bounds
    }

    constructor() {
        this.id = gen_id('hbox')
        this.children = []
        this.bounds = new Rect(0,0,100,100);
    }
    add(view: View) {
        this.children.push(view);
    }
    layout() {
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


    draw(ctx: CanvasSurface) {
    }

    get_children(): View[] {
        return this.children
    }

    is_parent_view(): boolean {
        return true
    }

    clip_children(): boolean {
        return false;
    }

}
