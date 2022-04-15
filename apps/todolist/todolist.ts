import {
    ActionButton,
    CheckButton,
    HBox,
    KeystrokeCaptureView, Label,
    LayerView, TextLine,
    VBox,
} from "../../lib/src/components";
import {BaseView, COMMAND_CHANGE, View, with_props} from "../../lib/src/core"
import {Point, Size} from "../../lib/src/common"
import {DebugLayer} from "../../lib/src/debug";

import {CanvasSurface, log,} from "../../lib/src/canvas";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";

type TodoItem = {
    desc:string,
    completed:boolean,
    tags:string[],
}
let DATA:TodoItem[] = [
    {
        desc:"first item",
        completed:false,
        tags:[],
    },
    {
        desc:"second item",
        completed:true,
        tags:['never'],
    },
    {
        desc:"third item",
        completed:false,
        tags:['good','better','best'],
    },
]

let TEXT = "this is some very cool and long text to read"


type TextRun = {
    text:string
}
type Paragraph = {
    runs:TextRun[]
}
let DOC:Paragraph[] = [
    {
        runs:[
            { text:"This is some very cool and long text to read that will definitely need to be wrapped." },
            { text:"And this is some more text"},
        ]
    },
    {
        runs:[
            {
                text:"In the second paragraph."
            },
            {
                text: "Text is cool here too."
            }
        ]
    },
    {
        runs:[
            {
                text:"Third paragraph just has a single run of text in it."
            }
        ]
    }
]

type SpanBox = {
    type:string,
    position:Point,
    text:string,
    font:string,
    color:string,
    weight:string,
}

type LineBox = {
    type:string,
    size:Size,
    position:Point,
    background_color:string,
    spans:SpanBox[],
}
type BlockBox = {
    type:string,
    size:Size,
    position:Point,
    background_color:string,
    lines:LineBox[],
}
type RootBox = {
    type:string,
    size:Size,
    position:Point,
    background_color:string,
    blocks:BlockBox[],
}
function do_layout(doc: Paragraph[], size: Size, g: CanvasSurface) {
    let pad = 5
    log('doc',doc)
    let root:RootBox = {
        background_color: "yellow",
        blocks: [],
        position: new Point(pad,pad),
        size: new Size(size.w-pad*2,size.h-pad*2),
        type: "root"
    }

    let y = pad
    let x = pad
    doc.forEach(para => {
        // log("para",para)
        let block:BlockBox = {
            background_color: "blue",
            lines: [],
            position: new Point(x,y),
            size: new Size(root.size.w-pad*2, 50),
            type: "block",
        }
        // log('text is',para.runs)
        let ly = pad
        let lh = 20
        para.runs.forEach((run:TextRun) => {
            log('run',run)
            let m = g.measureText(run.text,'base')
            log(m)
            let line:LineBox = {
                type: "line",
                background_color: "red",
                position: new Point(pad,pad+ly),
                size: new Size(m.w,lh),
                spans: [
                ],
            }
            let span:SpanBox = {
                color: "black",
                font: "base",
                position: new Point(pad,lh),
                text: run.text,
                type: "span",
                weight: "plain"
            }
            line.spans.push(span)
            block.lines.push(line)
            ly += 20
        })
        root.blocks.push(block)
        y = block.position.y + block.size.h + pad
    })

    return root
/*
    let pad = 5
    let line_height = 30
    let root:RootBox = {
        type:'root',
        size: size.add(new Point(0,0)),
        position:new Point(0,0),
        background_color:'yellow',
        blocks:[
            {
                type:'block',
                position: new Point(pad,pad),
                size: new Size(size.w-pad*2,line_height*2+pad*2),
                background_color:'blue',
                lines:[
                    {
                        type:'line',
                        position: new Point(pad,pad+line_height*0),
                        size: new Size(size.w - pad*4, line_height-5),
                        background_color: 'red',
                        spans:[
                            {
                                type:'span',
                                position: new Point(5,20),
                                text:'This is some text',
                                font:'base',
                                color:'black',
                                weight:'plain',
                            }
                        ]
                    },
                    {
                        type:'line',
                        position: new Point(5,pad+line_height*1),
                        size: new Size(size.w - pad*4, line_height-5),
                        background_color: 'red',
                        spans:[
                            {
                                type:'span',
                                position: new Point(5,20),
                                text:'This is some other text that is also cool',
                                font:'base',
                                color:'black',
                                weight:'plain',
                            }
                        ]
                    },
                ]
            }
        ]
    }
    return root

 */
}

function do_render(root: any, g: CanvasSurface) {
    let pos = root.position as Point
    let size = root.size as Size
    g.fillRect(pos.x,pos.y,size.w,size.h,root.background_color)
    g.ctx.save()
    g.ctx.translate(pos.x,pos.y)
    root.blocks.forEach(blk => {
        let pos = blk.position as Point
        let size = blk.size as Size
        g.fillRect(pos.x,pos.y,size.w,size.h,blk.background_color)
        g.ctx.save()
        g.ctx.translate(pos.x,pos.y)
        blk.lines.forEach(ln => {
            let pos = ln.position as Point
            let size = ln.size as Size
            g.fillRect(pos.x,pos.y,size.w,size.h,ln.background_color)
            g.ctx.save()
            g.ctx.translate(pos.x,pos.y);
            ln.spans.forEach(spn => {
                let pos = spn.position
                g.fillStandardText(spn.text,pos.x,pos.y, 'base')
            })
            g.ctx.restore()
        })
        g.ctx.restore()
    })
    g.ctx.restore()
}

class RichTextArea extends BaseView {
    _doc:Paragraph[]
    render_tree_root:any
    constructor() {
        super("rich-text-area");
        this._doc = []
    }

    doc():Paragraph[] {
        return this._doc
    }
    set_doc(doc:Paragraph[]) {
        this._doc = doc
        this.log("doc was set")
        // Hard coded doc with three paragraphs, only plain text. Do layout to render tree and draw it. Redo-layout when width changes.
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'green')
        do_render(this.render_tree_root, g)
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        this.render_tree_root = do_layout(this._doc, this.size(), g)

        return this.size()
    }

}

function make_item_view(td: TodoItem):View {
    let box = with_props(new VBox(),{fill:'yellow'}) as VBox
    let row = with_props(new HBox(), {fill:'#eee', hflex:true}) as HBox
    let cb = with_props(new CheckButton(), {caption:'c', selected:td.completed})
    cb.on(COMMAND_CHANGE,(e)=>td.completed = e.target.selected())
    row.add(cb)
    row.add(with_props(new Label(),{caption:td.desc}))
    box.add(row)
    let row2 = new HBox()
    row2.add(with_props(new Label(), {caption:'tags'}))
    box.add(row2)
    return box
}

function make_main_view():View {
    let root = with_props(new HBox(), {hflex:true, vflex:true}) as HBox

    root.add(with_props(new RichTextArea(), {doc:DOC}))
    // let list_view = with_props(new VBox(), {name:'main-view', vflex:true}) as VBox
    // DATA.forEach(td => list_view.add(make_item_view(td)))
    // root.add(list_view)

    root.add(with_props(new TextLine(),{text:'stuff here'}))
    return root
}

export function start() {
    let root = new LayerView('root-layer')
    let main_view:View = make_main_view();
    root.add(new KeystrokeCaptureView(main_view))

    let popup_layer = new LayerView('popup-layer')
    root.add(popup_layer)
    root.add(new DebugLayer())
    let surface = new CanvasSurface(600, 400);
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()

}
