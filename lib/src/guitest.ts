import {CanvasSurface} from "./canvas";
import {
    ActionButton,
    DialogContainer,
    DialogLayer,
    HBox,
    HSpacer,
    Label,
    LayerView,
    PopupContainer,
    PopupLayer,
    ScrollView,
    SelectList, ToggleButton,
    VBox
} from "./components";
import {gen_id, Point, Size} from "./common";
import {BaseParentView, BaseView, CommonEvent, ParentView, View} from "./core";
// @ts-ignore
import basefont_data from "./base_font.json";

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
        this._name = 'lcd-view'
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

class DropdownButton extends ActionButton {
    private data: any[];
    private renderer: (v:any) => string;
    private selected_index: number;
    constructor(data: string[], selected:number, param2: (v:any) => string) {
        super(gen_id('dropdown'))
        this.data = data
        this.selected_index = selected
        this.renderer = param2
        this.caption = 'invalid'
        if(this.selected_index >= 0 && this.selected_index < this.data.length) {
            this.caption = this.renderer(this.data[this.selected_index])
        }
        this.on('action',(evt:CommonEvent)=>{
            let popup = new PopupContainer();
            let popup_box = new VBox()
            this.data.map(item => new ActionButton(this.renderer(item)))
                .forEach((btn,i) => {
                    btn.on('action',(evt2)=>{
                        let popup_layer = evt2.ctx.find_by_name('popup-layer') as PopupLayer
                        popup_layer.remove(popup)
                        this.selected_index = i
                        if(this.selected_index >= 0 && this.selected_index < this.data.length) {
                            this.caption = this.renderer(this.data[this.selected_index])
                        }
                    })
                    popup_box.add(btn)
                })
            popup.add(popup_box)
            let pt = evt.ctx.view_to_local(new Point(0,this.size().h),this)
            popup.set_position(pt)
            let popup_layer = evt.ctx.find_by_name('popup-layer') as LayerView
            popup_layer.add(popup)
        })
    }

}

class FontIcon extends BaseView {
    private codepoint: number

    constructor(codepoint: number) {
        super(gen_id('fonticon'))
        this.codepoint = codepoint
    }

    draw(g: CanvasSurface): void {
        g.draw_glyph(this.codepoint,0,0,'base','black')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(16,16))
        return this.size()
    }
}

function make_toolbar(surf:CanvasSurface) {
    let toolbar = new HBox()
    toolbar.fill = '#aaa'
    toolbar._name = 'toolbar'


    toolbar.add(new ActionButton(`⏪`))
    toolbar.add(new ActionButton(`▶`))
    toolbar.add(new ActionButton(`⏩`))
    toolbar.add(new FontIcon(0x1D160))

    toolbar.add(new HSpacer())
    toolbar.add(new LCDView())
    toolbar.add(new HSpacer())
    let data = ['zero','mid','loud','bleeding ears']
    let volume = new DropdownButton(data,0,(v)=>v.toString())
    toolbar.add(volume)
    let add_songs = new ActionButton('add songs')
    add_songs.on('action',()=>{
        let dialog = new DialogContainer()
        let box = new VBox()
        box.vflex = true
        box.halign = 'stretch'
        box.add(new ActionButton("dialog header"))
        let body = new VBox()
        body.halign = 'right'
        body.vflex = true
        body.fill = 'white'
        body.add(new ActionButton("dialog body"))
        box.add(body)
        let tb = new HBox()
        tb.add(new ActionButton("okay"))
        tb.add(new HSpacer())
        let cancel = new ActionButton('cancel')
        cancel.on('action',()=>{
            let dialog_layer = surf.find_by_name('dialog-layer') as LayerView
            dialog_layer.remove(dialog)
        })
        tb.add(cancel)
        box.add(tb)
        dialog.add(box)
        let dialog_layer = surf.find_by_name('dialog-layer')
        // @ts-ignore
        dialog_layer.add(dialog)
    })
    toolbar.add(add_songs)

    toolbar.add(new FontIcon(2764))

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

class DebugLensGlass extends BaseView {
    private draw_names: boolean;
    private draw_sizes: boolean;
    private draw_bounds: boolean;
    constructor(size: Size) {
        super(gen_id('debug-glass'));
        this.set_size(size)
    }
    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
    override draw(g: CanvasSurface) {
        let root = g.get_root()
        g.ctx.save()
        g.ctx.beginPath()
        let size = this.size()
        g.ctx.rect(0,0,size.w,size.h);
        g.ctx.clip()
        let trans = g.view_to_local(new Point(0,0),this)
        g.ctx.translate(-trans.x,-trans.y)
        this.draw_outline(g, root)
        g.ctx.restore()
    }
    private draw_outline(g: CanvasSurface, view: View) {
        if(view.name() === 'debug-layer') return
        let pos = view.position()
        let size = view.size()
        g.ctx.save()
        if(this.draw_bounds) {
            g.ctx.strokeStyle = 'black'
            g.ctx.lineWidth = 1
            let s = 3
            g.ctx.beginPath()
            g.ctx.rect(pos.x + s, pos.y + s, size.w - s * 2, size.h - s * 2)
            g.ctx.moveTo(pos.x, pos.y)
            g.ctx.lineTo(pos.x + size.w, pos.y + size.h)
            g.ctx.moveTo(pos.x + size.w, pos.y)
            g.ctx.lineTo(pos.x, pos.y + size.h)
            g.ctx.stroke()
        }
        function draw_debug_text(g,pos,text) {
            let metrics = g.measureText(text,'base')
            g.ctx.save()
            g.ctx.translate(pos.x,pos.y)
            g.ctx.fillStyle = 'white'
            g.ctx.fillRect(0,0, metrics.w + 4, 10 + 4+4)
            g.ctx.strokeStyle = 'black'
            g.ctx.lineWidth = 1
            g.ctx.strokeRect(0,0,metrics.w+4,10+4+4)
            g.ctx.fillStyle = 'black'
            g.fillStandardText(text,4,10+4+4,'base')
            g.ctx.restore()

        }
        if(this.draw_names) {
            draw_debug_text(g,pos.add(new Point(5,5)),view.name())
        }
        if(this.draw_sizes) {
            let size = view.size()
            let text = `${size.w.toFixed(1)} x ${size.h.toFixed(1)}`
            draw_debug_text(g,pos.add(new Point(5,25)),text)
        }

        function is_parent(view: View) {
            // @ts-ignore
            return view.is_parent_view && view.is_parent_view()
        }
        function as_parent(view: View):ParentView {
            return view as unknown as ParentView
        }

        if(is_parent(view)) {
            let parent = as_parent(view)
            g.ctx.save()
            g.ctx.translate(pos.x,pos.y)
            parent.get_children().forEach((ch:View) => {
                this.draw_outline(g,ch)
            })
            g.ctx.restore()
        }
        g.ctx.restore()
    }


    set_draw_names(selected: boolean) {
        this.draw_names = selected
    }

    set_draw_sizes(selected: boolean) {
        this.draw_sizes = selected
    }

    set_draw_bounds(selected: boolean) {
        this.draw_bounds = selected
    }
}

class ResizeHandle extends BaseView {
    private lens: DebugLens;
    constructor(lens: DebugLens) {
        super(gen_id('debug-lense'))
        this.lens = lens
        this.set_size(new Size(20,20))
    }

    override input(event: CommonEvent) {
        if(event.type === 'mousedrag') {
            this.lens.set_size(this.lens.size().add(event.delta))
            event.ctx.repaint()
        }
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#888')
        g.draw_glyph(2921,2,0,'base','black')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }

}

class DebugLens extends BaseParentView {
    private vbox: VBox;
    private glass: DebugLensGlass;
    private resize_handle: ResizeHandle;
    constructor() {
        super(gen_id('debug-window'));
        this._name = 'debug-window'
        this.set_size(new Size(400,300))
        let vbox = new VBox()
        this.vbox = vbox
        let names = new ToggleButton('names')
        vbox.add(names)
        names.on('action',()=> this.glass.set_draw_names(names.selected))
        let sizes = new ToggleButton('sizes')
        vbox.add(sizes)
        sizes.on('action',()=>this.glass.set_draw_sizes(sizes.selected))
        let bounds = new ToggleButton('bounds')
        vbox.add(bounds)
        bounds.on('action',()=>this.glass.set_draw_bounds(bounds.selected))
        this.add(vbox)
        this.glass = new DebugLensGlass(this.size())
        this.add(this.glass)
        this.resize_handle = new ResizeHandle(this)
        this.add(this.resize_handle)
    }
    input(event: CommonEvent) {
        if(event.type === 'mousedown') {
            // console.log('starting at',event)
        }
        if(event.type === 'mousedrag') {
            this.set_position(this.position().add(event.delta))
            event.ctx.repaint()
        }
    }
    override draw(g: CanvasSurface) {
        g.ctx.save()
        g.ctx.fillStyle = '#888'
        let s = this.size()
        g.ctx.fillRect(0,0,s.w,20)
        g.ctx.fillRect(0,0,80,s.h)
        g.ctx.fillRect(s.w-20,0,20,s.h)
        g.ctx.fillRect(0,s.h-20,s.w,20)
        g.ctx.strokeStyle = '#444'
        g.ctx.strokeRect(0,0,this.size().w,this.size().h)
        g.fillStandardText('debug lens',10,15,'base')
        g.ctx.restore()

        // g.fillBackgroundSize(this.size(),'#ccc')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout2(g,available)
        })
        let s = this.size()
        this.vbox.set_position(new Point(0,20))
        this.glass.set_position(new Point(80,20))
        this.glass.set_size(new Size(s.w-80-20,s.h-20-20))
        this.resize_handle.set_position(new Point(s.w-20,s.h-20))
        return this.size()
    }

}
class DebugLayer extends LayerView {
    constructor() {
        super("debug-layer");
        this._name = 'debug-layer'
        this.add(new DebugLens())
    }
}

export function start() {
    let surface = new CanvasSurface(1024,720, 1.0);
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.debug = false

    let main = new LayerView();
    let app_layer = new LayerView()
    main.add(app_layer)

    let dialog_layer = new DialogLayer()
    dialog_layer._name = 'dialog-layer'
    main.add(dialog_layer)

    let popup_layer = new PopupLayer()
    popup_layer._name = 'popup-layer'
    main.add(popup_layer)

    let root = new VBox();
    root._name = 'root'
    root.add(make_toolbar(surface))

    let middle_layer = new HBox()
    middle_layer.vflex = true
    middle_layer._name = 'middle'
    let source_list = new SelectList(['Library','Playlists','Radio'],(v)=>v)
    source_list._name = 'source-list'
    source_list.vflex = false

    let scroll = new ScrollView()
    scroll.set_content(source_list)
    scroll.set_pref_width(220)
    scroll.vflex = true
    middle_layer.add(scroll)

    let song_list = new SelectList(['X,Y,Z'],()=>"cool song")
    song_list._name = 'song-list'
    song_list.hflex = true
    middle_layer.add(song_list)
    root.add(middle_layer)
    root.add(make_statusbar())

    app_layer.add(root)


    main.add(new DebugLayer())
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

