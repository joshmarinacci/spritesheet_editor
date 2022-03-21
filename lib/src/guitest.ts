import {CanvasSurface} from "./canvas";
import {
    ActionButton,
    GrowPanel,
    HBox,
    Header,
    HSpacer,
    Label,
    LayerView,
    PopupContainer,
    ScrollView, SelectList,
    VBox
} from "./components";
import {gen_id, Point, Size} from "./common";
import {BaseView, BaseParentView} from "./core";

class DialogContainer extends BaseParentView {
    constructor() {
        super("dialog-container")
        this._name = 'dialog-container'
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'gray')
    }
    layout2(g: CanvasSurface, available: Size): Size {
        let box = this._children[0]
        let size = box.layout2(g, new Size(100,100))
        this.set_size(size)
        this.set_position(new Point(
            (g.w-size.w)/2,
            (g.h-size.h)/2
        ))
        return new Size(size.w,size.h)
    }
    open_at(x: number, y: number) {
        this.set_position(new Point(x,y))
    }
}
class FixedGridPanel extends BaseView {
    private sw: number;
    private sh: number;
    constructor(w: number, h: number) {
        super(gen_id("fixed-grid"))
        this.sw = w
        this.sh = h
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ccccff')
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
        this.set_size(new Size(this.sw,this.sh))
        return this.size()
    }
}

class LCDView extends BaseView {
    constructor() {
        super("lcd-view");
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ccc')
        let text = 'LCD View'
        let size = g.measureText(text,'base')
        let x = (this.size().w - size.w)/2
        let y = (this.size().h - size.h)/2
        // g.fillRect(x,y,size.w,size.h,'aqua')
        g.fillStandardText(text,x,y+size.h,'base')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(200,60))
        return this.size()
    }
}

function make_toolbar(surf:CanvasSurface) {
    let toolbar = new HBox()
    toolbar.fill = '#aaa'
    toolbar._name = 'toolbar'

    toolbar.add(new ActionButton("prev"))
    toolbar.add(new ActionButton("play"))
    toolbar.add(new ActionButton("next"))

    toolbar.add(new HSpacer())
    toolbar.add(new LCDView())
    toolbar.add(new HSpacer())
    let volume = new ActionButton('volume')
    volume.on('action',()=>{
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
        let dialog_layer = surf.find_by_name('dialog-layer')
        // @ts-ignore
        dialog_layer.add(dialog)
    })
    toolbar.add(volume)

    return toolbar
}

function make_statusbar() {
    let status_bar = new HBox()
    status_bar._name = 'statusbar'
    status_bar.fill = '#aaa'
    status_bar.vflex = false
    status_bar.hflex = true
    status_bar.add(new Label("cool status bar"))
    status_bar.add(new HSpacer())
    status_bar.add(new ActionButton("blah"))
    return status_bar
}

/*
itunes like app

vbox
    toolbar
        prev, playpause, next
        spacer
        custom display
        spacer
        volume slider
        dropdown for output list

    hbox
        source list
        add button
        table view

    status bar
dialog for choosing files to add
    header: file add
    body: just fixed size panel
    toolbar
        cancel dismiss

 */
export function start() {
    console.log("guitest: starting")
    let surface = new CanvasSurface(640,480, 1.0);
    surface.debug = false

    let main = new LayerView();
    let app_layer = new LayerView()
    main.add(app_layer)

    let dialog_layer = new LayerView()
    dialog_layer._name = 'dialog-layer'
    main.add(dialog_layer)

    let popup_layer = new LayerView()
    main.add(popup_layer)

    let root = new VBox();
    root._name = 'root'
    root.add(make_toolbar(surface))

    let middle_layer = new HBox()
    middle_layer.vflex = true
    middle_layer._name = 'middle'
    let source_list = new SelectList(['A','B','C'],()=>"cool source")
    source_list.vflex = false

    let scroll = new ScrollView()
    scroll.set_content(source_list)
    scroll.set_pref_width(220)
    scroll.vflex = true
    middle_layer.add(scroll)

    let song_list = new SelectList(['X,Y,Z'],()=>"cool song")
    song_list.hflex = true
    middle_layer.add(song_list)
    root.add(middle_layer)
    root.add(make_statusbar())

    // dialog_button.on('action',()=>{
    //     console.log("triggering a dialog",dialog_button)
    //     let dialog = new DialogContainer()
    //     let box = new VBox()
    //     box.add(new ActionButton("dialog header"))
    //     box.add(new ActionButton("dialog body"))
    //     let tb = new HBox()
    //     tb.add(new ActionButton("okay"))
    //     tb.add(new HSpacer())
    //     tb.add(new ActionButton("cancel"))
    //     box.add(tb)
    //     dialog.add(box)
    //     dialog_layer.add(dialog)
    //     surface.repaint()
    // })

    let popup = new PopupContainer();
    let popup_box = new VBox()
    popup_box.add(new Label("popup"))
    popup_box.add(new ActionButton("item 1"))
    popup_box.add(new ActionButton("item 2"))
    popup_box.add(new ActionButton("item 3"))
    popup.add(popup_box)
    popup.open_at(200,200);
    // popup_layer.add(popup)
    app_layer.add(root)


    surface.set_root(main)
    surface.setup_mouse_input()
    surface.addToPage();
    surface.repaint()

    // unit test 1
    //click button1 with a fake mouse click through the canvas.
    //add callback to button1 to confirm the test worked
    // function test1(value) {
    //     console.log("starting test1")
    //     return new Promise((res,rej)=>{
    //         button1.on('action',() => {
    //             console.log("test complete")
    //             res(value)
    //         })
    //         surface.dispatch_fake_mouse_event('mousedown', new Point(60,60))
    //     })
    // }

    function wait(number: number) {
        return new Promise((res,rej)=>{
            setTimeout(()=>{
                res(0)
            },number)
        })
    }
    // async function run_all_tests() {
    //     console.log("starting tests")
    //     // await wait(500)
    //     // console.log('continuing')
    //     let val = await test1(99)
    //     console.assert(val === 99,'test1 failed')
    //     // console.log("test1 passed")
    //     console.log("end of tests")
    // }
    // wait(1000).then(run_all_tests)
}

