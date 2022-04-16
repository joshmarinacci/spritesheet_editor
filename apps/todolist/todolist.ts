import {CheckButton, HBox, KeystrokeCaptureView, Label, LayerView, TextLine, VBox,} from "../../lib/src/components";
import {
    BaseParentView,
    COMMAND_CHANGE,
    CoolEvent, KEYBOARD_CATEGORY,
    KEYBOARD_DOWN, KeyboardEvent,
    POINTER_DOWN,
    View,
    with_props
} from "../../lib/src/core"
import {Point, Size} from "../../lib/src/common"
import {DebugLayer} from "../../lib/src/debug";

import {CanvasSurface,} from "../../lib/src/canvas";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {Paragraph, RichTextArea} from "./richtext";

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

let DOC:Paragraph[] = [
    {
        runs:[
            { text:"This is some very cool and long text to read that will definitely need to be wrapped." },
            { text:"And this is some more text to read, now in BOLD!", weight:'bold'},
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

function make_main_view():View {
    let root = with_props(new HBox(), {hflex:true, vflex:true}) as HBox
    root.add(with_props(new RichTextArea(), {doc:DOC}))
    let list_view = with_props(new CompoundListView(), {name:'main-view', vflex:true, hflex:true}) as CompoundListView
    DATA.forEach(td => list_view.add_item(make_item_view(td)))
    root.add(list_view)
    // root.add(with_props(new TextLine(),{text:'stuff here'}))
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
