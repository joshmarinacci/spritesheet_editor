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
    SelectList,
    VBox
} from "./components";
import {gen_id, Point, Size} from "./common";
import {BaseParentView, BaseView, CommonEvent, View} from "./core";
// @ts-ignore
import basefont_data from "./base_font.json";
import {DebugLayer} from "./debug";
import {randi} from "../../common/util";

class FixedGridPanel extends BaseView {
    private sw: number;
    private sh: number;
    constructor(size:Size) {
        super(gen_id("fixed-grid"))
        this.sw = size.w
        this.sh = size.h
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

function open_songs_dialog(surf:CanvasSurface) {
    return ()=>{
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
        let scroll = new ScrollView()
        scroll.hflex = true
        scroll.vflex = true
        scroll.set_content(new FixedGridPanel(new Size(600,600)))
        body.add(scroll)
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
    }
}

function make_toolbar(surf:CanvasSurface) {
    let toolbar = new HBox()
    toolbar.fill = '#aaa'
    toolbar._name = 'toolbar'
    toolbar.valign = 'center'


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
    add_songs.on('action',open_songs_dialog(surf))
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

function make_random_word(min,max) {
    let len = randi(min,max)
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.toLowerCase();
    var charactersLength = characters.length;
    for ( let i = 0; i < len; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        if(i === 0) {
            result = result.toUpperCase()
        }
    }
    return result;
}
function make_random_words(min,max) {
    let count = randi(min,max)
    let res = ''
    for(let i=0; i<count; i++) {
        res += make_random_word(3,12) + ' '
    }
    return res
}

class TableHeaderView extends BaseView {
    constructor() {
        super(gen_id('table-header-view'));
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'aqua')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(available.w,20))
        return this.size()
    }
}
class TableGridView extends BaseView {
    constructor(data: any[]) {
        super(gen_id('table-grid-view'));
    }
    draw(g: CanvasSurface): void {
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return undefined;
    }

}

class TableView extends BaseParentView {
    private data: any[];
    private header: View;
    private scroll: ScrollView;
    private grid: TableGridView;
    constructor(songs: any[]) {
        super(gen_id('table-view'))
        this.data = songs
        this.header = new TableHeaderView()
        this.add(this.header)
        this.scroll = new ScrollView()
        this.add(this.scroll)
        this.grid = new TableGridView(this.data)
        this.hflex = true
        this.vflex = true
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(200,200))
        return this.size()
    }
}

function make_song_list(surface: CanvasSurface) {
    let songs = []
    for(let i=0; i<100; i++) {
        songs.push({
            type:'song',
            artist:make_random_words(1,3),
            title: make_random_word(2,8),
            album: make_random_word(5,15),
        })
    }
    let song_list = new TableView(songs);
    // let song_list = new SelectList(songs,(s)=>`${s.artist} - ${s.title} - ${s.album}`)
    song_list._name = 'song-list'
    song_list.hflex = true
    return song_list
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

    middle_layer.add(make_song_list(surface))
    root.add(middle_layer)
    root.add(make_statusbar())

    app_layer.add(root)


    let dl = new DebugLayer()
    dl.set_visible(false)
    main.add(dl)
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

