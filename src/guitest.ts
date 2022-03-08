import {CanvasSurface, CommonEvent, log, View} from "./uilib/canvas";
import {ActionButton, BaseParentView, BaseView} from "./uilib/components";
import {Callback, gen_id, Rect, Size} from "./uilib/common";
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
    layout2(g: CanvasSurface, available:Size):Size {
        let pad = 10
        // this.log("taking all the space", available)
        available = available.shrink(pad);

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
            sizes.set(ch2,size)
        })
        this.log("first sizes are",sizes)
        this.log("total used is",total_w)
        if(yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size(total_w / yes_flex.length, available.h)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as LayoutView
                let size = ch2.layout2(g,flex_avail)
                total_w += size.w
                sizes.set(ch2,size)
            })
        }
        console.log("final sizes",sizes)
        //place all children (they've already set their width and height)
        let nx = pad
        let ny = pad
        let maxh = 0
        this.children.forEach(ch => {
            let size = sizes.get(ch as unknown as LayoutView)
            ch.bounds().x = nx
            ch.bounds().h = size.h
            nx += ch.bounds().w
            ch.bounds().y = ny
            maxh = Math.max(ch.bounds().h,maxh)
        })
        //return own size
        this.bounds().w = nx+pad*2
        this.bounds().h = maxh+pad*2
        let size = new Size(this.bounds().w,this.bounds().h)
        size.maxh = false
        size.maxw = false
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
class VBox extends BaseParentView {
    constructor() {
        super(gen_id('vbox'));
    }
    layout2(g: CanvasSurface, available:Size):Size {
        // this.log("taking all the space", available)
        let pad = 10
        available = available.shrink(pad);
        let sizes = this.children.map(ch => {
            // @ts-ignore
            if(ch.layout2) {
                // @ts-ignore
                return [ch,ch.layout2(g,available)]
            } else {
                console.warn("child doesnt have layout 2",ch)
                return [ch,null]
            }
        })
        this.log("child sizes",sizes)
        let x = pad
        let y = pad
        let total = 0
        sizes.forEach(args => {
            console.log('checking child h',args[1].h)
            total += args[1].h
        })
        this.log('we need space',total,'and ahve',available.h)
        let leftover = available.h - total
        this.log("leftover is",leftover)
        let maxw = 0
        let grow_count = 0
        sizes.forEach(args => {
            let size = args[1]
            console.log("size",size)
            if(size.maxh) grow_count+=1
        })
        this.log("grow count",grow_count)
        sizes.forEach(args => {
            let ch = args[0]
            let size = args[1]
            this.log("setting child",ch)
            this.log('to size',size)
            ch.bounds().x = x
            ch.bounds().y = y
            ch.bounds().w = size.w
            ch.bounds().h = size.h
            if(size.maxh) {
                ch.bounds().h = leftover/grow_count
                // console.log("new h",ch.bounds().h)
                // ch.bounds().h = 300
            }
            if(size.maxw) {
                ch.bounds().w = available.w
            }
            maxw = Math.max(maxw,ch.bounds().w)
            y += size.h
        })


        let size = new Size(maxw+pad*2,y+pad*2)
        size.maxh = false
        size.maxw = false
        return size
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
        let size = new Size(0,20)
        size.maxh = false
        size.maxw = true
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
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let size = new Size(10,10)
        size.maxw = true
        size.maxh = true
        return size
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

class Button2 implements View, LayoutView {
    private caption: string
    _bounds:Rect
    private id: string;
    hflex:boolean
    vflex:boolean
    constructor(button1: string) {
        this.id = gen_id("button2")
        this._bounds = new Rect(0,0,200,200)
        this.caption = button1
        this.hflex = false
        this.vflex = false
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
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return g.measureText(this.caption).grow(StandardLeftPadding)
    }

    name(): string {
        return "button2";
    }
    off(type: string, cb: Callback): void {
    }
    on(type: string, cb: Callback): void {
    }

    visible(): boolean {
        return true
    }

    private log(...args) {
        console.log(this.id + ":  ", ...args)
    }
}

export function start() {
    log("starting")
    let surface = new CanvasSurface(640,400);
    surface.debug = false


    // let root = new VBox();
    let toolbar = new HBox();
    toolbar.fill = '#f0ffc0'
    toolbar.add(new Button2("button 1"))
    toolbar.add(new Button2("Button two!g|"))
    toolbar.add(new HSpacer())
    toolbar.add(new Button2("Button 3"))
    // toolbar.add(new Label("a text label"))

    // root.add(toolbar)


    // let middle_layer = new HBox()
    // middle_layer.fill = 'aqua'
    // middle_layer.add(new GrowPanel().with_fill('red'))
    // middle_layer.add(new GrowPanel().with_fill('yellow'))
    //
    // root.add(middle_layer)
    //
    // surface.set_root(root)
    surface.set_root(toolbar)

    surface.addToPage();
    surface.repaint()

}
