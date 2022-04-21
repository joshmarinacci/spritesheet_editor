import {CheckButton, HBox, KeystrokeCaptureView, Label, LayerView, TextLine, VBox,} from "../../lib/src/components";
import {
    BaseParentView, BaseView,
    COMMAND_CHANGE,
    CoolEvent, KEYBOARD_CATEGORY,
    KEYBOARD_DOWN, KeyboardEvent, Point, POINTER_CATEGORY,
    POINTER_DOWN, POINTER_DRAG, PointerEvent, Size,
    View,
    with_props
} from "../../lib/src/core"
import {DebugLayer} from "../../lib/src/debug";

import {CanvasSurface,} from "../../lib/src/canvas";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {BlockStyle, Paragraph, RichTextArea, TextStyle} from "./richtext";

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

let plain:TextStyle = {
    font: "base",
    underline: false,
    color:'black',
    weight:'plain'
}
let link:TextStyle = {
    font:"base",
    underline: true,
    color: 'blue',
    weight:'plain',
}
let bold:TextStyle = {
    font: "base",
    underline: false,
    color:'black',
    weight:'bold'
}
let block_plain:BlockStyle = {
    background_color: "white",
    border_width: 0,
    border_color: "black",
    padding_width: 5,
}
let block_header:BlockStyle = {
    background_color: 'cyan',
    border_width: 1,
    border_color: "#444444",
    padding_width: 10
}
let DOC:Paragraph[] = [
    {
        runs:[
            {
                text:"This is some very cool and long text to read that will definitely need to be wrapped.",
                style: plain,
            },
            {
                text:"And this is some more text to read, now in BOLD!",
                style: bold
            },
        ],
        style: block_plain,
    },
    {
        runs:[
            {
                text:"In the second paragraph.", style: plain
            },
            {
                text: "Text can be underlined too.", style: link
            }
        ],
        style: block_plain,
    },
    {
        runs:[
            {
                text:"Third paragraph just has a single run of text in it.",
                style: plain
            }
        ],
        style: block_header,
    }
]

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

const LIST_ITEM_PAD = 3;
class ListItemView extends BaseParentView {
    private list: CompoundListView;
    constructor(listView: CompoundListView) {
        super("list-item-view");
        this.set_name('list-item-view')
        this.list = listView
    }
    override can_receive_mouse(): boolean {
        return true
    }

    input(event: CoolEvent) {
        if(event.type === POINTER_DOWN) {
            this.list.set_selected_view(this)
        }
    }

    draw(g: CanvasSurface) {
        if(this.list.selected_view() === this) {
            g.fillBackgroundSize(this.size(), 'blue')
        } else {
            g.fillBackgroundSize(this.size(), 'white')
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout(g,new Size(available.w-LIST_ITEM_PAD*2,available.h))
            ch.set_position(new Point(LIST_ITEM_PAD,LIST_ITEM_PAD))
        })
        let y = 0
        this.get_children().forEach(ch => {
            y = ch.position().y + ch.size().h + LIST_ITEM_PAD
        })
        this.set_size(new Size(available.w,y))
        return this.size()
    }
}

class CompoundListView extends BaseParentView {
    private sel: ListItemView;
    constructor() {
        super("compound-list-view");
    }
    input(event: CoolEvent) {
        if(event.category === KEYBOARD_CATEGORY) {
            let e = event as KeyboardEvent
            if(e.type === KEYBOARD_DOWN) {
                if (e.code === 'ArrowDown') {
                    let n = this._children.indexOf(this.sel)
                    if (n >= 0) {
                        if (n < this._children.length - 1) {
                            n = n + 1
                            this.sel = this._children[n] as ListItemView
                        }
                    }
                }
                if(e.code === 'ArrowUp') {
                    let n = this._children.indexOf(this.sel)
                    if (n >= 1) {
                        n = n -1
                        this.sel = this._children[n] as ListItemView
                    }
                }
            }
        }
        if(event.type === POINTER_DOWN) {
            event.ctx.set_keyboard_focus(this)
        }
    }

    override draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),'#f0f0f0')
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout(g,available)
        })
        let y = 0;
        this.get_children().forEach(ch => {
            ch.set_position(new Point(0,y))
            y += ch.size().h
            // y += 30
        })
        this.set_size(available)
        return this.size()
    }

    add_item(view: View) {
        let item_view = new ListItemView(this);
        item_view.add(view)
        this.add(item_view)
    }

    set_selected_view(sel: ListItemView) {
        this.sel = sel
    }

    selected_view() {
        return this.sel
    }
}

class DividerView extends BaseView {
    private splitView: SplitView;
    constructor(splitView: SplitView) {
        super("divider-view");
        this.splitView = splitView
    }
    input(event: CoolEvent) {
        if(event.category === POINTER_CATEGORY) {
            if(event.type === POINTER_DRAG) {
                let e = event as PointerEvent
                this.splitView.split_value += e.delta.x
            }
        }
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#888888')
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(10,available.h))
        return this.size()
    }
}

class SplitView extends BaseView {
    first:View
    divider:View
    second:View
    split_value: number;
    constructor() {
        super("split-view");
        this.divider = new DividerView(this)
        this.split_value = 200
    }

    override draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),'red')
    }

    clip_children(): boolean {
        return false;
    }
    is_parent_view(): boolean {
        return true
    }
    get_children(): View[] {
        return [this.first,this.divider,this.second]
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        let ch_w = this.split_value
        let ch_h = available.h
        if(this.first) {
            this.first.layout(g, new Size(ch_w,ch_h))
            this.first.set_position(new Point(0,0))
        }
        let dsize = this.divider.layout(g, new Size(10,available.h))
        this.divider.set_position(new Point(ch_w,0))
        if(this.second) {
            this.second.layout(g, new Size(this.size().w - dsize.w - ch_w,ch_h))
            this.second.set_position(new Point(ch_w+dsize.w,0))
        }
        return this.size()
    }
    can_receive_mouse(): boolean {
        return false;
    }

    set_first(view: View) {
        this.first = view
    }

    set_second(view: View) {
        this.second = view
    }
}

function make_main_view():View {
    let root = with_props(new SplitView(), {hflex:true, vflex:true, name:'banana-split'}) as SplitView
    root.set_first(with_props(new RichTextArea(), {doc:DOC}))
    let list_view = with_props(new CompoundListView(), {name:'main-view', vflex:true, hflex:true}) as CompoundListView
    DATA.forEach(td => list_view.add_item(make_item_view(td)))
    root.set_second(list_view)
    return root
}

export function start() {
    let root = new LayerView('root-layer')
    let main_view:View = make_main_view();
    root.add(new KeystrokeCaptureView(main_view))
    let popup_layer = new LayerView('popup-layer')
    root.add(popup_layer)
    root.add(new DebugLayer())
    let surface = new CanvasSurface(800, 400);
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'base','base')
    surface.load_jsonfont(basefont_data,'bold','bold')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()

}
