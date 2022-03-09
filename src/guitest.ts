import {CanvasSurface, CommonEvent, log, ParentView, View} from "./uilib/canvas";
import {BaseParentView, LayerView} from "./uilib/components";
import {Callback, gen_id, Rect, Size} from "./uilib/common";
import {ButtonBackgroundColor, ButtonBorderColor, StandardLeftPadding, StandardTextHeight} from "./style";

//Padding: a simple wrapper view that mirrors the hbox,vbox of the child?
//Border: the same but w/ drawing a border
interface LayoutView {
    hflex:boolean
    vflex:boolean
    layout2(g:CanvasSurface, available:Size):Size
}

abstract class SuperParentView implements View, ParentView, LayoutView {
    hflex: boolean
    vflex: boolean
    id: string
    protected _bounds: Rect;
    protected _children:View[]
    private _listeners:Map<string,Callback[]>
    _name: string
    constructor(id:string) {
        this.id = id
        this._bounds = new Rect(0,0,100,100)
        this._children = []
        this._name = 'unnamed'
        this._listeners = new Map<string, Callback[]>()
    }

    protected log(...args) {
        console.log(this.name(),...args)
    }

    bounds(): Rect {
        return this._bounds
    }

    clip_children(): boolean {
        return false;
    }

    draw(g: CanvasSurface): void {
    }

    get_children(): View[] {
        return this._children
    }
    add(view:View) {
        this._children.push(view)
    }

    input(event: CommonEvent): void {
    }

    is_parent_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }


    name(): string {
        return this._name
    }

    on(type:string, cb:Callback) {
        this._get_listeners(type).push(cb)
    }
    off(type:string, cb:Callback) {
        this._listeners.set(type,this._get_listeners(type).filter(c => c != cb))
    }
    fire(type:string, payload:any) {
        this._get_listeners(type).forEach(cb => cb(payload))
    }

    visible(): boolean {
        return true
    }

    abstract layout2(g: CanvasSurface, available: Size): Size

    private _get_listeners(type: string) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        return this._listeners.get(type)
    }
}
abstract class SuperChildView implements View, LayoutView {
    protected _bounds: Rect;
    hflex: boolean;
    vflex: boolean;
    _name:string
    private _listeners:Map<string,Callback[]>
    private id: string;
    constructor(id:string) {
        this.id = id
        this._bounds = new Rect(0,0,100,100)
        this._name = 'unnamed'
        this._listeners = new Map<string, Callback[]>()
    }
    protected log(...args) {
        console.log(`${this.name()}:`,...args)
    }
    private _get_listeners(type: string) {
        if(!this._listeners.has(type)) this._listeners.set(type,[])
        return this._listeners.get(type)
    }
    on(type:string, cb:Callback) {
        this._get_listeners(type).push(cb)
    }
    off(type:string, cb:Callback) {
        this._listeners.set(type,this._get_listeners(type).filter(c => c != cb))
    }
    fire(type:string, payload:any) {
        this._get_listeners(type).forEach(cb => cb(payload))
    }
    bounds(): Rect {
        return this._bounds
    }
    input(event: CommonEvent): void {
    }
    layout(g: CanvasSurface, parent: View): void {
    }
    name(): string {
        return this._name
    }
    visible(): boolean {
        return true
    }
    abstract layout2(g: CanvasSurface, available: Size): Size
    abstract draw(g: CanvasSurface): void
}

class Label extends SuperChildView {
    private caption: string
    constructor(caption: string) {
        super(gen_id("label"))
        this._name = 'label'
        this.caption = caption
        this.hflex = false
        this.vflex = false
    }
    draw(g: CanvasSurface): void {
        g.fillStandardText(this.caption,StandardLeftPadding,StandardTextHeight);
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return g.measureText(this.caption).grow(StandardLeftPadding)
    }
}
class Header extends SuperChildView {
    private caption: string
    constructor(caption: string) {
        super(gen_id("header"))
        this._name = 'header'
        this.caption = caption
        this.hflex = true
        this.vflex = false
    }
    draw(g: CanvasSurface): void {
        let size = g.measureText(this.caption)
        let x = (this.bounds().w - size.w)/2
        g.fillStandardText(this.caption,x,StandardTextHeight);
    }
    layout2(g: CanvasSurface, available: Size): Size {
        let text_size = g.measureText(this.caption).grow(StandardLeftPadding)
        return new Size(available.w,text_size.h)
    }
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
        // this.log("taking all the space", real_available)
        let available = real_available.shrink(pad);

        //split out flex and non-flex children
        // @ts-ignore
        let yes_flex = this.children.filter(ch => ch.hflex)
        // @ts-ignore
        let non_flex = this.children.filter(ch => !ch.hflex)
        // this.log("yes flex",yes_flex)
        // this.log("non flex",non_flex)
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
        // this.log("first sizes are",sizes)
        // this.log("total used is",total_w)
        // this.log("avail is",available)
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
        // this.log("final sizes",sizes)
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
            // this.log("hbox growing! to ",this.bounds().h)
        }
        let size = new Size(this.bounds().w,this.bounds().h)
        // this.log("final self size",this.bounds())
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
        // this.log("taking all the space", available)
        let pad = 10
        available = available.shrink(pad);

        // @ts-ignore
        let yes_flex = this.children.filter(ch => ch.vflex)
        // @ts-ignore
        let non_flex = this.children.filter(ch => !ch.vflex)
        // this.log("yes flex",yes_flex)
        // this.log("non flex",non_flex)
        //call layout on the non-flex children first
        let sizes:Map<LayoutView,Size> = new Map()
        let total_h = 0
        non_flex.map(ch => {
            let ch2 = ch as unknown as LayoutView
            let size = ch2.layout2(g,available)
            total_h += size.h
            // this.log("child is",ch,size)
            sizes.set(ch2,size)
        })
        // this.log("first sizes are",sizes)
        // this.log("total used is",total_h)
        if(yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size(available.w, (available.h-total_h) / yes_flex.length)
            // this.log("orig avail",available)
            // this.log("flex avail",flex_avail)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as LayoutView
                let size = ch2.layout2(g,flex_avail)
                total_h += size.h
                sizes.set(ch2,size)
            })
        }
        // this.log("final sizes",sizes)
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

        // this.log("final self size",this.bounds())
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
class HSpacer extends SuperChildView {
    constructor() {
        super("h-spacer");
        this.hflex = true
        this.vflex = false
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return new Size(available.w, 0)
    }
    draw(g: CanvasSurface) { }
}
class GrowPanel extends SuperParentView {
    private fill:string
    constructor() {
        super(gen_id('grow'));
        this.fill = null
        this.hflex = true
        this.vflex = true
    }
    layout2(g: CanvasSurface, available: Size): Size {
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
}
class Button2 extends SuperChildView {
    private caption: string
    constructor(button1: string) {
        super(gen_id("button2"))
        this._name = 'button2'
        this.caption = button1
        this.hflex = false
        this.vflex = false
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
    layout2(g: CanvasSurface, available: Size): Size {
        return g.measureText(this.caption).grow(StandardLeftPadding)
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
class DialogContainer extends SuperParentView {
    constructor() {
        super("dialog-container")
        this._name = 'dialog-container'
    }
    is_parent_view(): boolean {
        return true
    }
    clip_children(): boolean {
        return false
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this.bounds(),'gray')
        // this.log("drawing")
    }
    layout2(g: CanvasSurface, available: Size): Size {
        // this.log('dialog laying out')
        let box = this._children[0]
        // this.log("vbox child is",box)
        // @ts-ignore
        let size = box.layout2(g, new Size(100,100))
        // this.log("child size is",size)
        box.bounds().w = size.w
        box.bounds().h = size.h
        this._bounds.x = (g.w/2-size.w)/2
        this._bounds.y = (g.h/2-size.h)/2
        return new Size(size.w,size.h)
    }
    open_at(x: number, y: number) {
        this._bounds.x = x
        this._bounds.y = y
    }
}
class FixedGridPanel extends SuperChildView {
    private sw: number;
    private sh: number;
    constructor(w: number, h: number) {
        super(gen_id("fixed-grid"))
        this.hflex = false;
        this.vflex = false
        this.sw = w
        this.sh = h
        this._bounds = new Rect(0,0,w,h)
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this.bounds(),'#ccccff')
        g.ctx.strokeStyle = 'black'
        g.ctx.beginPath()
        for(let i=0; i<this.sw; i+=25) {
            g.ctx.moveTo(i,0)
            g.ctx.lineTo(i,this.sh)
        }
        for(let i=0; i<this.sh; i+=25) {
            g.ctx.moveTo(0,i)
            g.ctx.lineTo(this.sw,i)
        }
        g.ctx.stroke()
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return new Size(this.sw,this.sh)
    }
}
class ScrollView extends SuperParentView {
    constructor() {
        super(gen_id("scroll-view"))
        this._name = 'scroll-view'
        this.hflex = false
        this.vflex = false
    }

    clip_children(): boolean {
        return true
    }

    draw(g: CanvasSurface): void {
        g.fillBackground(this.bounds(),'magenta')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return new Size(300,300)
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
    root.add(new Header("cool guitest demo"))
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
    middle_layer.add(new GrowPanel().with_fill('red'))
    let scroll = new ScrollView()
    scroll.add(new FixedGridPanel(500,500))
    middle_layer.add(scroll)
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
    popup_box.add(new Label("popup"))
    popup_box.add(new Button2("item 1"))
    popup_box.add(new Button2("item 2"))
    popup_box.add(new Button2("item 3"))
    popup.add(popup_box)
    popup.open_at(200,200);
    popup_layer.add(popup)
    app_layer.add(root)


    surface.set_root(main)
    surface.setup_mouse_input()
    surface.addToPage();
    surface.repaint()
}
