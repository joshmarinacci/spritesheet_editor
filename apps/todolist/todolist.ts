import {
    CheckButton,
    HBox,
    KeystrokeCaptureView, Label,
    LayerView,
    VBox,
} from "../../lib/src/components";
import {COMMAND_CHANGE, View, with_props} from "../../lib/src/core"
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
    let main_view = with_props(new VBox(), {name:'main-view', hflex:true, vflex:true}) as VBox
    DATA.forEach(td => main_view.add(make_item_view(td)))
    // let td:TodoItem = {
    //     completed: false,
    //     desc: "really cool",
    //     tags: []
    // }
    // main_view.add(make_item_view(td))
    return main_view
}

export function start() {
    let root = new LayerView('root-layer')
    let main_view:View = make_main_view();
    root.add(new KeystrokeCaptureView(main_view))

    let popup_layer = new LayerView('popup-layer')
    root.add(popup_layer)
    root.add(new DebugLayer())
    let surface = new CanvasSurface(400, 600);
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()

}
