import {BaseView, COMMAND_CHANGE, View, with_props} from "../../lib/src/core"
import {Point, Size} from "../../lib/src/common"
import {CanvasSurface,} from "../../lib/src/canvas";

type TextRun = {
    text: string,
    color?: string,
    weight?:string,
}
export type Paragraph = {
    runs: TextRun[]
}


type SpanBox = {
    type: string,
    position: Point,
    text: string,
    font: string,
    color: string,
    weight: string,
}
type LineBox = {
    type: string,
    size: Size,
    position: Point,
    background_color: string,
    spans: SpanBox[],
}
type BlockBox = {
    type: string,
    size: Size,
    position: Point,
    background_color: string,
    lines: LineBox[],
}
type RootBox = {
    type: string,
    size: Size,
    position: Point,
    background_color: string,
    blocks: BlockBox[],
}
type ItRes = {
    value: any,
    done: boolean,
}

class WhitespaceIterator {
    n: number
    private text: string;
    private done: boolean;

    constructor(text: string) {
        this.n = 0;
        this.text = text;
        this.done = false
    }

    next(): ItRes {
        if (this.done) return {value: null, done: true}
        let chunk = ""
        while (true) {
            let ch = this.text[this.n]
            this.n++
            if (this.n > this.text.length) {
                this.done = true
                return {
                    value: chunk,
                    done: false
                }
            }
            if (ch === ' ') {
                return {
                    value: chunk,
                    done: false
                }
            } else {
                chunk += ch
            }
        }
    }

}

function make_line_box(txt: string, w: number, h: number, pt: Point, color?: string, weight?:string): LineBox {
    let line: LineBox = {
        type: "line",
        background_color: color || "transparent",
        position: pt.clone(),
        size: new Size(w, h),
        spans: [],
    }
    let span: SpanBox = {
        color: "black",
        font: (weight==='bold')?"bold":"base",
        position: new Point(0, h),
        text: txt,
        type: "span",
        weight: "plain"
    }
    line.spans.push(span)
    return line
}

function do_layout(doc: Paragraph[], size: Size, g: CanvasSurface) {
    let pad = 5
    let root: RootBox = {
        background_color: "yellow",
        blocks: [],
        position: new Point(pad, pad),
        size: new Size(size.w - pad * 2, size.h - pad * 2),
        type: "root"
    }

    let y = pad
    let x = pad
    doc.forEach(para => {
        let block: BlockBox = {
            background_color: "white",
            lines: [],
            position: new Point(x, y),
            size: new Size(root.size.w - pad * 2, 100),
            type: "block",
        }
        let line_height = 20

        let curr_text = ""
        let curr_pos = new Point(pad, pad)
        let curr_w = 0
        let avail_w = block.size.w

        para.runs.forEach((run: TextRun) => {
            let font = (run.weight === 'bold')?'bold':'base'
            let chunks = new WhitespaceIterator(run.text)
            let res = chunks.next()
            while (res.done === false) {
                let m = g.measureText(res.value, font)
                if (curr_pos.x + curr_w + m.w < avail_w) {
                    curr_text += ' ' + res.value
                    curr_w += m.w + g.measureText(" ", font).w
                } else {
                    let line = make_line_box(curr_text, curr_w, line_height, curr_pos, run.color, run.weight)
                    block.lines.push(line)
                    curr_text = res.value
                    curr_w = m.w
                    curr_pos.x = 0
                    curr_pos.y += line_height
                }
                res = chunks.next()
            }
            if (curr_w > 0) {
                block.lines.push(make_line_box(curr_text, curr_w, line_height, curr_pos, run.color, run.weight))
                curr_text = ""
                curr_pos.x = curr_w
                curr_w = 0
            }
        })
        block.size.h = curr_pos.y + line_height + pad + pad
        root.blocks.push(block)
        y = block.position.y + block.size.h + pad
    })

    return root
}

function do_render(root: any, g: CanvasSurface) {
    let pos = root.position as Point
    let size = root.size as Size
    g.fillRect(pos.x, pos.y, size.w, size.h, root.background_color)
    g.ctx.save()
    g.ctx.translate(pos.x, pos.y)
    root.blocks.forEach(blk => {
        let pos = blk.position as Point
        let size = blk.size as Size
        g.fillRect(pos.x, pos.y, size.w, size.h, blk.background_color)
        g.ctx.save()
        g.ctx.translate(pos.x, pos.y)
        blk.lines.forEach(ln => {
            let pos = ln.position as Point
            let size = ln.size as Size
            g.fillRect(pos.x, pos.y, size.w, size.h, ln.background_color)
            g.ctx.save()
            g.ctx.translate(pos.x, pos.y);
            ln.spans.forEach(spn => {
                let pos = spn.position
                g.fillStandardText(spn.text, pos.x, pos.y, spn.font)
            })
            g.ctx.restore()
        })
        g.ctx.restore()
    })
    g.ctx.restore()
}

export class RichTextArea extends BaseView {
    _doc: Paragraph[]
    render_tree_root: any

    constructor() {
        super("rich-text-area");
        this._doc = []
    }

    doc(): Paragraph[] {
        return this._doc
    }

    set_doc(doc: Paragraph[]) {
        this._doc = doc
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), 'green')
        do_render(this.render_tree_root, g)
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        this.render_tree_root = do_layout(this._doc, this.size(), g)
        return this.size()
    }
}