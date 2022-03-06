import {CanvasSurface, CommonEvent, ParentView, View} from "./canvas";
import {
    ButtonBackgroundColor,
    ButtonBackgroundColor_active,
    ButtonBorderColor,
    StandardLeftPadding,
    StandardPanelBackgroundColor,
    StandardSelectionColor,
    StandardTextColor,
    StandardTextHeight,
    StandardTextStyle,
    StandardVerticalMargin
} from "../style";
import {Callback, gen_id, Rect} from "./common";

export class BaseView implements View {
    _bounds: Rect;
    id:string
    _name:string
    private _listeners:Map<string,Callback[]>
    constructor(bounds?:Rect) {
        this._bounds = bounds || new Rect(0, 0, 100, 100)
        this.id = gen_id('baseview')
        this._name = 'BaseView'
        this._listeners = new Map()
    }
    on(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.get(type).push(cb)
    }
    off(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.set(type,this._listeners.get(type).filter( c => c != cb))
    }
    name() {
        return this._name
    }
    draw(g: CanvasSurface): void {
    }
    bounds(): Rect {
        return this._bounds
    }
    input(event: CommonEvent): void {
    }
    layout(g: CanvasSurface, parent: View): void {
    }
    visible(): boolean {
        return true
    }
}
export class Label extends BaseView{
    text: string;
    constructor(text: string) {
        super(new Rect(0, 0, 100, StandardTextHeight+StandardVerticalMargin))
        this.text = text;
    }
    draw(ctx: CanvasSurface) {
        ctx.ctx.fillStyle = StandardTextColor;
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.text, 0, StandardTextHeight);
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
export class ActionButton extends BaseView{
    private title: string
    private cb: any
    hover:boolean

    constructor(title: string, cb?:any) {
        super(new Rect(0, 0, 100, StandardTextHeight+StandardVerticalMargin))
        this.title = title;
        this.cb = cb;
        this.hover = false
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this._bounds, this.hover?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackground(this._bounds,ButtonBorderColor)
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

    layout(g: CanvasSurface, parent: View): void {
    }

}
export class ToggleButton extends BaseView {
    title: string
    selected:boolean
    cb:any

    constructor(title: string, cb) {
        super(new Rect(0,0,100,30))
        this.title = title;
        this.selected = false;
        this.cb = cb;
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this._bounds, this.selected?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackground(this._bounds,ButtonBorderColor)
        ctx.ctx.fillStyle = StandardTextColor
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.title, StandardLeftPadding, StandardTextHeight);
    }

    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            this.cb(event)
        }
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

export class SelectList implements View {
    private data: any[];
    private id: string;
    private _bounds: Rect;
    private renderer: any;
    private _listeners:Map<string,Callback[]>
    private selected_index: number;
    constructor(data:any[], renderer) {
        this.id = 'tree'
        this._bounds = new Rect(0,0,10,10)
        this.data = data
        this.renderer = renderer
        this.selected_index = -1
        this._listeners = new Map()
    }
    name(): string {
        return "SelectList";
    }
    on(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.get(type).push(cb)
    }
    off(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.set(type,this._listeners.get(type).filter( c => c != cb))
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this._bounds,'#ddd')
        this.data.forEach((item,i) => {
            if (i === this.selected_index) {
                g.fillRect(0,30*i,this.bounds().w,25, StandardSelectionColor)
            }
            g.ctx.fillStyle = StandardTextColor
            g.ctx.font = StandardTextStyle
            let str = this.renderer(item)
            g.ctx.fillText(str, StandardLeftPadding, i*30 + 20)
        })
    }

    bounds(): Rect {
        return this._bounds
    }

    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            let pt = event.pt;
            let y = Math.floor(pt.y / 30)
            let item = this.data[y]
            this.selected_index = y
            // @ts-ignore
            this._listeners.get('change').forEach(cb => cb(item,y))
            event.ctx.repaint()
        }
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
    _bounds: Rect
    children: View[];
    private _visible: boolean;
    private _listeners:Map<string,Callback[]>

    constructor(id: string, bounds?: Rect) {
        this.id = id
        this._bounds = bounds || new Rect(0, 0, 100, 100)
        this.children = []
        this._visible = true;
        this._listeners = new Map()
    }

    add(view: View) {
        this.children.push(view);
    }

    clip_children(): boolean {
        return false;
    }

    draw(g: CanvasSurface): void {
        // console.log('drawing base view',this.id, this.visible())
        g.fillBackground(this._bounds,StandardPanelBackgroundColor)
    }

    bounds(): Rect {
        return this._bounds
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

    input(event: CommonEvent): void {
    }

    name(): string {
        return "BaseParentView";
    }

    on(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.get(type).push(cb)
    }
    off(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.set(type,this._listeners.get(type).filter( c => c != cb))
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
            ch.bounds().x = x;
            ch.bounds().y = y;
            x += ch.bounds().w + 5
            my = Math.max(my,ch.bounds().h)
        })
        this._bounds.w = x;
        this._bounds.h = my;
    }
}
export class LayerView extends BaseParentView{
    constructor() {
        super(gen_id('layer'),new Rect(0,0,100,100))
    }

    layout(g: CanvasSurface, parent: View): void {
        if(parent) {
            this._bounds.w = parent.bounds().w
            this._bounds.h = parent.bounds().h
        } else {
            this._bounds.w = g.canvas.width
            this._bounds.h = g.canvas.height
        }
    }
}

