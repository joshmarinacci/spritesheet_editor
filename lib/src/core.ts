//Padding: a simple wrapper view that mirrors the hbox,vbox of the child?
//Border: the same but w/ drawing a border
/*
- [ ] Unit test that button receives clicks correctly and repaints
- [ ] Move all code back to canvas and components and common
- [ ] Add tabbed panel layout. Unit tests.
- [ ] Add drop down button. Requires tracking the current transform
- [ ] Add text box stub. Insert only.
- [ ] Always repaint after any input
- [ ] Think about baseline alignment
- [ ] Add resizable window container
 */
import {CanvasSurface} from "./canvas";
import {Callback, Point, Rect, Size} from "./common";

export class CommonEvent {
    type: string
    pt: Point
    button: number
    ctx: CanvasSurface
    details?: any

    constructor(type: string, pt: Point, ctx: CanvasSurface) {
        this.type = type
        this.pt = pt
        this.ctx = ctx
    }

    translate(x: number, y: number): CommonEvent {
        let ce = new CommonEvent(this.type, this.pt.translate(x, y), this.ctx)
        ce.button = this.button
        ce.details = this.details
        return ce
    }
}

export interface View {
    hflex: boolean
    vflex: boolean
    size():Size
    set_size(size:Size)
    position():Point
    set_position(point:Point)
    layout2(g: CanvasSurface, available: Size): Size
    draw(g: CanvasSurface): void
    visible(): boolean
    input(event: CommonEvent): void
    on(type: string, cb: Callback): void
    off(type: string, cb: Callback): void
    name(): string
}

export interface ParentView {
    is_parent_view(): boolean,

    get_children(): View[]

    clip_children(): boolean,
}

export abstract class SuperParentView implements View, ParentView {
    hflex: boolean
    vflex: boolean
    id: string
    protected _visible: boolean
    protected _children: View[]
    private _listeners: Map<string, Callback[]>
    _name: string
    private _size: Size;
    private _position: Point;

    constructor(id: string) {
        this.id = id
        this._size = new Size(100,100)
        this._position = new Point(0,0)
        this._children = []
        this._name = 'unnamed'
        this._listeners = new Map<string, Callback[]>()
        this._visible = true
    }

    protected log(...args) {
        console.log(this.name(), ...args)
    }

    size():Size {
        return this._size
    }
    set_size(size: Size) {
        this._size = size
    }
    position(): Point {
        return this._position
    }
    set_position(point: Point) {
        this._position = point
    }

    clip_children(): boolean {
        return false;
    }

    draw(g: CanvasSurface): void {
    }

    get_children(): View[] {
        return this._children
    }

    add(view: View) {
        this._children.push(view)
    }

    input(event: CommonEvent): void {
    }

    is_parent_view(): boolean {
        return true
    }

    name(): string {
        return this._name
    }

    on(type: string, cb: Callback) {
        this._get_listeners(type).push(cb)
    }

    off(type: string, cb: Callback) {
        this._listeners.set(type, this._get_listeners(type).filter(c => c != cb))
    }

    fire(type: string, payload: any) {
        this._get_listeners(type).forEach(cb => cb(payload))
    }

    visible(): boolean {
        return this._visible
    }

    abstract layout2(g: CanvasSurface, available: Size): Size

    private _get_listeners(type: string) {
        if (!this._listeners.has(type)) this._listeners.set(type, [])
        return this._listeners.get(type)
    }
}

export abstract class SuperChildView implements View {
    hflex: boolean;
    vflex: boolean;
    protected _visible: boolean
    _name: string
    private _listeners: Map<string, Callback[]>
    private id: string;
    private _size: Size;
    private _position: Point;

    constructor(id: string) {
        this.id = id
        this._size = new Size(100,100)
        this._position = new Point(0,0)
        this._visible = true
        this._name = 'unnamed'
        this._listeners = new Map<string, Callback[]>()
    }

    protected log(...args) {
        console.log(`${this.name()}:`, ...args)
    }

    private _get_listeners(type: string) {
        if (!this._listeners.has(type)) this._listeners.set(type, [])
        return this._listeners.get(type)
    }

    on(type: string, cb: Callback) {
        this._get_listeners(type).push(cb)
    }

    off(type: string, cb: Callback) {
        this._listeners.set(type, this._get_listeners(type).filter(c => c != cb))
    }

    fire(type: string, payload: any) {
        this._get_listeners(type).forEach(cb => cb(payload))
    }

    size():Size {
        return this._size
    }
    set_size(size: Size) {
        this._size = size
    }
    position(): Point {
        return this._position
    }
    set_position(point: Point) {
        this._position = point
    }

    input(event: CommonEvent): void {
    }

    name(): string {
        return this._name
    }

    visible(): boolean {
        return this._visible
    }

    abstract layout2(g: CanvasSurface, available: Size): Size

    abstract draw(g: CanvasSurface): void
}
