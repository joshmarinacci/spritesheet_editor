import {Callback, gen_id, Rect} from "./util";
import {CanvasSurface, CommonEvent, InputView, ParentView, View} from "./canvas";
import {
    ButtonBackgroundColor_active,
    ButtonBorderColor,
    ButtonBackgroundColor,
    StandardTextColor,
    StandardTextStyle,
    StandardTextHeight,
    StandardVerticalMargin,
    StandardLeftPadding,
    StandardSelectionColor,
    StandardPanelBackgroundColor
} from "./style";

export class Label implements View {
    bounds: Rect;
    id: string;
    text: string;

    visible(): boolean {
        return true;
    }

    constructor(text: string) {
        this.id = gen_id('label')
        this.bounds = new Rect(0, 0, 100, StandardTextHeight+StandardVerticalMargin);
        this.text = text;
    }

    draw(ctx: CanvasSurface) {
        ctx.ctx.fillStyle = StandardTextColor;
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.text, 0, StandardTextHeight);
    }

    get_bounds(): Rect {
        return this.bounds
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

export class CustomLabel extends Label {
    private cb: Callback;
    constructor(text:string,cb:Callback) {
        super(text);
        this.cb = cb
    }
    override draw(ctx: CanvasSurface) {
        this.text = this.cb({})
        super.draw(ctx);
    }
}
export class ActionButton implements View, InputView {
    bounds: Rect
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
        this.bounds = new Rect(0, 0, 100, StandardTextHeight+StandardVerticalMargin);
        this.cb = cb;
        this.hover = false
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds, this.hover?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackground(this.bounds,ButtonBorderColor)
        ctx.ctx.fillStyle = StandardTextColor
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.title, StandardLeftPadding, StandardTextHeight);
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
    id: string
    private title: string
    selected:boolean
    cb:any

    constructor(title: string, cb) {
        this.title = title;
        this.id = "a toggle button";
        this.bounds = new Rect(0, 0, 100, 30);
        this.selected = false;
        this.cb = cb;
    }

    visible(): boolean {
        return true;
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds, this.selected?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackground(this.bounds,ButtonBorderColor)
        ctx.ctx.fillStyle = StandardTextColor
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.title, StandardLeftPadding, StandardTextHeight);
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

export class SelectList implements View, InputView {
    private data: any[];
    private id: string;
    private bounds: Rect;
    private renderer: any;
    private listeners: any[];
    private selected_index: number;
    constructor(data:any[], renderer) {
        this.id = 'tree'
        this.bounds = new Rect(0,0,10,10)
        this.data = data
        this.renderer = renderer
        this.listeners = []
        this.selected_index = -1
    }
    on(type,cb) {
        this.listeners.push(cb)
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this.bounds,'#ddd')
        this.data.forEach((item,i) => {
            if (i === this.selected_index) {
                g.fillRect(0,30*i,this.get_bounds().w,25, StandardSelectionColor)
            }
            g.ctx.fillStyle = StandardTextColor
            g.ctx.font = StandardTextStyle
            let str = this.renderer(item)
            g.ctx.fillText(str, StandardLeftPadding, i*30 + 20)
        })
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            let pt = event.pt;
            let y = Math.floor(pt.y / 30)
            let item = this.data[y]
            console.log("clicked on the item",item)
            this.selected_index = y
            this.listeners.forEach(cb => cb(item,y))
            event.ctx.repaint()
        }
    }

    is_input_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    visible(): boolean {
        return true
    }

    set_data(data: any[]) {
        this.data = data
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
        g.fillBackground(this.bounds,StandardPanelBackgroundColor)
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
