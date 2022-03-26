import {CanvasSurface} from "./canvas";
import {Callback, Point, Rect, Size} from "./common";

type EventCategory = string
type EventType = string
type EventDirection = "down" | "up"



export class CoolEvent {
    type:EventType
    category:EventCategory
    timestamp:number
    details:any
    ctx:CanvasSurface
    target:any
    direction:EventDirection
    stopped: any;
}

type Modifiers = {
    shift:boolean
    alt:boolean
    ctrl:boolean
    meta:boolean
}

export const POINTER_CATEGORY:EventCategory = "POINTER_CATEGORY"
export const POINTER_MOVE:EventType = "POINTER_MOVE"
export const POINTER_DRAG:EventType = "POINTER_DRAG"
export const POINTER_DOWN:EventType = "POINTER_DOWN"
export const POINTER_UP:EventType = "POINTER_UP"
export class PointerEvent extends CoolEvent {
    position:Point
    delta:Point
    modifiers:Modifiers
}

export const KEYBOARD_CATEGORY:EventCategory = "KEYBOARD_CATEGORY"
export const KEYBOARD_DOWN:EventType = 'KEYBOARD_DOWN'
export const KEYBOARD_UP:EventType = 'KEYBOARD_UP'
export class KeyboardEvent extends CoolEvent {
    key:string
    code:string
    modifiers:Modifiers
}

export const SCROLL_CATEGORY:EventCategory = "SCROLL_CATEGORY"
export const SCROLL_EVENT:EventType = "SCROLL_EVENT"
export class ScrollEvent extends CoolEvent {
    delta:Point
}

export const FOCUS_CATEGORY:EventCategory = "FOCUS_CATEGORY"
export const FOCUS_GAINED:EventType = "FOCUS_GAINED"
export const FOCUS_LOST:EventType = "FOCUS_LOST"
export class FocusEvent extends CoolEvent {
}

export const COMMAND_CATEGORY:EventCategory = "COMMAND_CATEGORY"
export const COMMAND_ACTION:EventType = "action"
export class CommandEvent extends CoolEvent {
}

export const CLIPBOARD_CATEGORY:EventCategory = "CLIPBOARD_CATEGORY"
export const ClipboardCopy:EventType = "ClipboardCopy"
export const ClipboardCut:EventType = "ClipboardCut"
export const ClipboardPaste:EventType = "ClipboardPaste"
export class ClipboardEvent extends CoolEvent {
    content:any
    mimetype:string
}

export class CommonEvent {
    type: string
    pt: Point
    button: number
    ctx: CanvasSurface
    details?: any
    delta?: Point;

    constructor(type: string, pt: Point, ctx: CanvasSurface) {
        this.type = type
        this.pt = pt
        this.ctx = ctx
    }

    translate(x: number, y: number): CommonEvent {
        let ce = new CommonEvent(this.type, this.pt.translate(x, y), this.ctx)
        ce.button = this.button
        ce.details = this.details
        ce.delta = this.delta
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
    layout(g: CanvasSurface, available: Size): Size
    draw(g: CanvasSurface): void
    visible(): boolean
    input(event: CoolEvent): void
    on(type: string, cb: Callback): void
    off(type: string, cb: Callback): void
    name(): string
}

export interface ParentView {
    is_parent_view(): boolean,

    get_children(): View[]

    clip_children(): boolean,
}

export abstract class BaseParentView implements View, ParentView {
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

    remove(view: View) {
        this._children = this._children.filter(ch => ch !== view)
    }

    input(event: CoolEvent): void {
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

    abstract layout(g: CanvasSurface, available: Size): Size

    private _get_listeners(type: string) {
        if (!this._listeners.has(type)) this._listeners.set(type, [])
        return this._listeners.get(type)
    }
}

export abstract class BaseView implements View {
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

    input(event: CoolEvent): void {
    }

    name(): string {
        return this._name
    }

    visible(): boolean {
        return this._visible
    }

    abstract layout(g: CanvasSurface, available: Size): Size

    abstract draw(g: CanvasSurface): void
}
