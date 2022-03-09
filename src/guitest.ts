import {CanvasSurface, CommonEvent, log, ParentView, View} from "./uilib/canvas";
import {ActionButton, BaseParentView, BaseView, LayerView} from "./uilib/components";
import {Callback, gen_id, Point, Rect, Size} from "./uilib/common";
import {
    ButtonBackgroundColor,
    ButtonBackgroundColor_active,
    ButtonBorderColor, StandardLeftPadding,
    StandardTextColor, StandardTextHeight,
    StandardTextStyle
} from "./style";

interface LayoutView {
    hflex:boolean
    vflex:boolean
    layout2(g:CanvasSurface, available:Size):Size
}
class HBox extends BaseParentView implements LayoutView {
    fill: string;
    constructor() {
        super(gen_id('hbox'));
        this.hflex = true
        this.vflex = false
    }
    layout2(g: CanvasSurface, real_available:Size):Size {
        let pad = 10
        this.log("taking all the space", real_available)
        let available = real_available.shrink(pad);

        //split out flex and non-flex children
        let yes_flex = this.children.filter(ch => ch.hflex)
        let non_flex = this.children.filter(ch => !ch.hflex)
        this.log("yes flex",yes_flex)
        this.log("non flex",non_flex)
        //call layout on the non-flex children first
        let sizes:Map<LayoutView,Size> = new Map()
        let total_w = 0
        non_flex.map(ch => {
            let ch2 = ch as unknown as LayoutView
            let size = ch2.layout2(g,available)
            total_w += size.w
            // this.log("size of ch",ch,size)
            sizes.set(ch2,size)
        })
        this.log("first sizes are",sizes)
        this.log("total used is",total_w)
        this.log("avail is",available)
        if(yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size((available.w - total_w) / yes_flex.length, available.h)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as LayoutView
                let size = ch2.layout2(g,flex_avail)
                total_w += size.w
                sizes.set(ch2,size)
            })
        }
        this.log("final sizes",sizes)
        //place all children (they've already set their width and height)
        let nx = pad
        let ny = pad
        let maxh = 0
        this.children.forEach(ch => {
            let size = sizes.get(ch as unknown as LayoutView)
            ch.bounds().x = nx
            ch.bounds().h = size.h
            ch.bounds().w = size.w
            nx += ch.bounds().w
            ch.bounds().y = ny
            maxh = Math.max(ch.bounds().h,maxh)
        })
        //return own size
        this.bounds().w = nx+pad*2
        this.bounds().h = maxh+pad*2
        if(this.vflex) {
            this.bounds().h = real_available.h
            this.log("hbox growing! to ",this.bounds().h)
        }
        let size = new Size(this.bounds().w,this.bounds().h)
        this.log("final self size",this.bounds())
        return size
    }

    draw(g: CanvasSurface) {
        if(this.fill) {
            this.log("DRAWING",this.fill,this.bounds())
            g.fillBackground(this.bounds(),this.fill)
        }
    }

    private log(...args) {
        console.log(this.id+": ",...args)
    }

    hflex: boolean;
    vflex: boolean;
}
class VBox extends BaseParentView implements LayoutView {
    fill: string;
    constructor() {
        super(gen_id('vbox'));
        this.fill = 'gray'
        this.hflex = false
        this.vflex = true
    }

    hflex: boolean;
    vflex: boolean;
    layout2(g: CanvasSurface, available:Size):Size {
        this.log("taking all the space", available)
        let pad = 10
        available = available.shrink(pad);

        let yes_flex = this.children.filter(ch => ch.vflex)
        let non_flex = this.children.filter(ch => !ch.vflex)
        this.log("yes flex",yes_flex)
        this.log("non flex",non_flex)
        //call layout on the non-flex children first
        let sizes:Map<LayoutView,Size> = new Map()
        let total_h = 0
        non_flex.map(ch => {
            let ch2 = ch as unknown as LayoutView
            let size = ch2.layout2(g,available)
            total_h += size.h
            this.log("child is",ch,size)
            sizes.set(ch2,size)
        })
        this.log("first sizes are",sizes)
        this.log("total used is",total_h)
        if(yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size(available.w, (available.h-total_h) / yes_flex.length)
            this.log("orig avail",available)
            this.log("flex avail",flex_avail)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as LayoutView
                let size = ch2.layout2(g,flex_avail)
                total_h += size.h
                sizes.set(ch2,size)
            })
        }
        this.log("final sizes",sizes)
        //place all children (they've already set their width and height)
        let nx = pad
        let ny = pad
        let maxw = 0
        this.children.forEach(ch => {
            let size = sizes.get(ch as unknown as LayoutView)
            ch.bounds().x = nx
            ch.bounds().y = ny
            ch.bounds().w = size.w
            ch.bounds().h = size.h
            ny += ch.bounds().h
            maxw = Math.max(ch.bounds().w,maxw)
        })
        //return own size
        this.bounds().w = maxw+pad*2
        this.bounds().h = ny+pad*2

        this.log("final self size",this.bounds())
        let size = new Size(this.bounds().w,this.bounds().h)
        return size
    }
    draw(g: CanvasSurface) {
        if(this.fill) {
            this.log("DRAWING",this.fill,this.bounds())
            g.fillBackground(this.bounds(),this.fill)
        }
    }
    private log(...args) {
        console.log(this.id+": ",...args)
    }
}

class HSpacer extends BaseView implements LayoutView{
    constructor() {
        super();
        this.hflex = true
        this.vflex = false
    }
    layout2(g: CanvasSurface, available: Size): Size {
        let size = new Size(available.w,0)
        return size
   }

    hflex: boolean;
    vflex: boolean;
}

class GrowPanel extends BaseParentView implements LayoutView {
    private fill:string
    constructor() {
        super(gen_id('grow'));
        this.fill = null
        this.hflex = true
        this.vflex = true
    }

    layout2(g: CanvasSurface, available: Size): Size {
        console.log("grow getting available",available)
        return available
    }

    draw(g: CanvasSurface) {
        if(this.fill) {
            g.fillBackground(this.bounds(),this.fill)
        }
    }


    with_fill(fill: string) {
        this.fill = fill
        return this
    }

    hflex: boolean;
    vflex: boolean;
}

class Button2 implements View, LayoutView {
    private caption: string
    _bounds:Rect
    private id: string;
    hflex:boolean
    vflex:boolean
    private _listeners:Map<string,Callback[]>
    constructor(button1: string) {
        this.id = gen_id("button2")
        this._bounds = new Rect(0,0,200,200)
        this.caption = button1
        this.hflex = false
        this.vflex = false
        this._listeners = new Map()
    }

    bounds(): Rect {
        return this._bounds
    }

    draw(g: CanvasSurface): void {
        g.fillBackground(this._bounds,ButtonBackgroundColor)
        g.strokeBackground(this._bounds,ButtonBorderColor)
        g.fillStandardText(this.caption,StandardLeftPadding,StandardTextHeight);
    }

    input(event: CommonEvent): void {
        if(event.type === "mousedown") {
            this.fire('action',{})
        }
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return g.measureText(this.caption).grow(StandardLeftPadding)
    }

    name(): string {
        return "button2";
    }
    on(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.get(type).push(cb)
    }
    off(type:string, cb:Callback) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.set(type,this._listeners.get(type).filter( c => c != cb))
    }

    visible(): boolean {
        return true
    }

    private log(...args) {
        console.log(this.id + ":  ", ...args)
    }

    private fire(type: string, payload: {}) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        this._listeners.get(type).forEach(cb => cb(payload))
    }
}

class PopupContainer implements View, LayoutView, ParentView{
    hflex: boolean;
    vflex: boolean;
    private _bounds: Rect;
    private _id: string;
    private _children: View[];
    constructor() {
        this._id = gen_id("popupcontainer")
        this._bounds = new Rect(0,0,10,10)
        this._children = []
    }

    is_parent_view(): boolean {
        return true
    }
    get_children(): View[] {
        return this._children
    }
    clip_children(): boolean {
        return false
    }
    add(view:View) {
        this._children.push(view)
    }
    log(...args) {
        console.log(this.name(),...args)
    }

    bounds(): Rect {
        return this._bounds
    }

    draw(g: CanvasSurface): void {
        g.fillBackground(this._bounds,'gray')
        this.log("drawing")
    }

    input(event: CommonEvent): void {
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.log('laying out the child')
        let box = this._children[0]
        this.log("vbox child is",box)
        // @ts-ignore
        let size = box.layout2(g, new Size(100,100))
        this.log("child size is",size)
        box.bounds().w = size.w
        box.bounds().h = size.h
        return new Size(size.w,size.h)
    }

    name(): string {
        return "popup_container";
    }

    off(type: string, cb: Callback): void {
    }

    on(type: string, cb: Callback): void {
    }

    visible(): boolean {
        return true
    }

    open_at(x: number, y: number) {
        this._bounds.x = x
        this._bounds.y = y
    }
}

class DialogContainer implements View, LayoutView, ParentView{
    hflex: boolean;
    vflex: boolean;
    private _bounds: Rect;
    private _id: string;
    private _children: View[];
    constructor() {
        this._id = gen_id("dialog-container")
        this._bounds = new Rect(0,0,10,10)
        this._children = []
    }

    is_parent_view(): boolean {
        return true
    }
    get_children(): View[] {
        return this._children
    }
    clip_children(): boolean {
        return false
    }
    add(view:View) {
        this._children.push(view)
    }
    log(...args) {
        console.log(this.name(),...args)
    }

    bounds(): Rect {
        return this._bounds
    }

    draw(g: CanvasSurface): void {
        g.fillBackground(this._bounds,'gray')
        this.log("drawing")
    }

    input(event: CommonEvent): void {
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.log('dialog laying out')
        let box = this._children[0]
        this.log("vbox child is",box)
        // @ts-ignore
        let size = box.layout2(g, new Size(100,100))
        this.log("child size is",size)
        box.bounds().w = size.w
        box.bounds().h = size.h
        this._bounds.x = (g.w/2-size.w)/2
        this._bounds.y = (g.h/2-size.h)/2
        return new Size(size.w,size.h)
    }

    name(): string {
        return "dialog_container";
    }

    off(type: string, cb: Callback): void {
    }

    on(type: string, cb: Callback): void {
    }

    visible(): boolean {
        return true
    }

    open_at(x: number, y: number) {
        this._bounds.x = x
        this._bounds.y = y
    }
}

export function start() {
    log("starting")
    let surface = new CanvasSurface(640,400);
    surface.debug = false

    let main = new LayerView();
    let app_layer = new LayerView()
    main.add(app_layer)

    let dialog_layer = new LayerView()
    main.add(dialog_layer)

    let popup_layer = new LayerView()
    main.add(popup_layer)

    let root = new VBox();
    root.fill = 'green'
    let toolbar = new HBox();
    toolbar.fill = '#f0ffc0'
    let dialog_button = new Button2("dialog")
    toolbar.add(new Button2("button 1"))
    toolbar.add(dialog_button)
    toolbar.add(new HSpacer())
    toolbar.add(new Button2("Button 3"))
    root.add(toolbar)


    let middle_layer = new HBox()
    middle_layer.vflex = true
    middle_layer.fill = 'aqua'
    // middle_layer.add(new Button2("button 1"))
    // middle_layer.add(new Button2("Button two!g|"))
    middle_layer.add(new GrowPanel().with_fill('red'))
    middle_layer.add(new GrowPanel().with_fill('yellow'))
    root.add(middle_layer)

    dialog_button.on('action',()=>{
        console.log("triggering a dialog",dialog_button)
        let dialog = new DialogContainer()
        let box = new VBox()
        box.add(new Button2("dialog header"))
        box.add(new Button2("dialog body"))
        let tb = new HBox()
        tb.add(new Button2("okay"))
        tb.add(new HSpacer())
        tb.add(new Button2("cancel"))
        box.add(tb)
        dialog.add(box)
        dialog_layer.add(dialog)
        surface.repaint()
    })

    let popup = new PopupContainer();
    let popup_box = new VBox()
    popup_box.add(new Button2("item 1"))
    popup_box.add(new Button2("item 2"))
    popup_box.add(new Button2("item 3"))
    popup.add(popup_box)
    popup.open_at(200,200);
    // popup_layer.add(popup)

    // surface.set_root(root)
    // surface.set_root(toolbar)
    app_layer.add(root)
    surface.set_root(main)
    surface.setup_mouse_input()

    surface.addToPage();
    surface.repaint()

}
