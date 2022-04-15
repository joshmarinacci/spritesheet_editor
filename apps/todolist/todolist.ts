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
            { text:"And this is some more text."},
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

type ItRes = {
    value:any,
    done:boolean,
}
class WhitespaceIterator {
    n:number
    private text: string;
    private done: boolean;
    constructor(text: string) {
        this.n = 0;
        this.text = text;
        this.done = false
    }
    next():ItRes {
        if(this.done) return { value:null, done:true}
        let chunk = ""
        while(true) {
            let ch = this.text[this.n]
            this.n++
            if(this.n > this.text.length) {
                this.done = true
                return {
                    value:chunk,
                    done:false
                }
            }
            if(ch === ' ') {
                return {
                    value:chunk,
                    done:false
                }
            } else {
                chunk += ch
            }
        }
    }

}

function make_line(txt: string, w:number, h:number, x: number, y: number):LineBox {
    let line:LineBox = {
        type: "line",
        background_color: "transparent",
        position: new Point(x,y),
        size: new Size(w,h),
        spans: [],
    }
    let span:SpanBox = {
        color: "black",
        font: "base",
        position: new Point(0,h),
        text: txt,
        type: "span",
        weight: "plain"
    }
    line.spans.push(span)
    return line
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
            background_color: "white",
            lines: [],
            position: new Point(x,y),
            size: new Size(root.size.w-pad*2, 100),
            type: "block",
        }
        // log('text is',para.runs)
        let ly = pad
        let lh = 20

        function to_chunks(text: string) {
            return new WhitespaceIterator(text)
        }

        let curr_text = ""
        let curr_x = 0
        let curr_w = 0
        let avail_w = block.size.w

        para.runs.forEach((run:TextRun) => {
            let chunks = to_chunks(run.text)
            let res = chunks.next()


            while(res.done === false) {
                let m = g.measureText(res.value,'base')
                if(curr_x + curr_w + m.w < avail_w) {
                    curr_text += ' ' + res.value
                    curr_w += m.w + g.measureText(" ",'base').w
                } else {
                    let line = make_line(curr_text, curr_w, lh, curr_x, ly)
                    block.lines.push(line)
                    curr_text = res.value
                    curr_w = m.w
                    curr_x = 0
                    ly += lh
                }
                res = chunks.next()
            }
            if(curr_w > 0) {
                block.lines.push(make_line(curr_text,curr_w, lh, curr_x,ly))
                curr_text = ""
                curr_x = curr_w
                curr_w = 0
            }
        })
        block.size.h = ly + lh + pad + pad
        root.blocks.push(block)
        y = block.position.y + block.size.h + pad
    })

    return root
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
