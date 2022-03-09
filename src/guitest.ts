import {CanvasSurface} from "./uilib/canvas";
import {ActionButton, GrowPanel, HBox, Header, HSpacer, Label, LayerView, VBox} from "./uilib/components";
import {gen_id, Point, Rect, Size} from "./uilib/common";
import {SuperChildView, SuperParentView} from "./uilib/core";

class PopupContainer extends SuperParentView {
    constructor() {
        super(gen_id("popupcontainer"))
        this._name ="popup_container"
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this._bounds,'gray')
    }
    layout2(g: CanvasSurface, available: Size): Size {
        // this.log('laying out the child')
        let box = this._children[0]
        // this.log("vbox child is",box)
        // @ts-ignore
        let size = box.layout2(g, new Size(100,100))
        // this.log("child size is",size)
        box.bounds().w = size.w
        box.bounds().h = size.h
        return new Size(size.w,size.h)
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
    console.log("guitest: starting")
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
    let dialog_button = new ActionButton("dialog")
    let button1 = new ActionButton('button 1')
    toolbar.add(button1)
    toolbar.add(dialog_button)
    toolbar.add(new HSpacer())
    toolbar.add(new ActionButton("Button 3"))
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
        box.add(new ActionButton("dialog header"))
        box.add(new ActionButton("dialog body"))
        let tb = new HBox()
        tb.add(new ActionButton("okay"))
        tb.add(new HSpacer())
        tb.add(new ActionButton("cancel"))
        box.add(tb)
        dialog.add(box)
        dialog_layer.add(dialog)
        surface.repaint()
    })

    let popup = new PopupContainer();
    let popup_box = new VBox()
    popup_box.add(new Label("popup"))
    popup_box.add(new ActionButton("item 1"))
    popup_box.add(new ActionButton("item 2"))
    popup_box.add(new ActionButton("item 3"))
    popup.add(popup_box)
    popup.open_at(200,200);
    popup_layer.add(popup)
    app_layer.add(root)


    surface.set_root(main)
    surface.setup_mouse_input()
    surface.addToPage();
    surface.repaint()

    // unit test 1
    //click button1 with a fake mouse click through the canvas.
    //add callback to button1 to confirm the test worked
    function test1(value) {
        console.log("starting test1")
        return new Promise((res,rej)=>{
            button1.on('action',() => {
                console.log("test complete")
                res(value)
            })
            surface.dispatch_fake_mouse_event('mousedown', new Point(60,60))
        })
    }

    function wait(number: number) {
        return new Promise((res,rej)=>{
            setTimeout(()=>{
                res(0)
            },number)
        })
    }
    async function run_all_tests() {
        console.log("starting tests")
        // await wait(500)
        // console.log('continuing')
        let val = await test1(99)
        console.assert(val === 99,'test1 failed')
        // console.log("test1 passed")
        console.log("end of tests")
    }
    wait(1000).then(run_all_tests)
}

