import {LayerView} from "../../lib/src/components";
import {Point, Rect, Size, SuperArray} from "../../lib/src/common";
import {CoolEvent, BaseView, BaseParentView, KEYBOARD_DOWN, KeyboardEvent} from "../../lib/src/core";
import {randi} from "../../common/util";
import { CanvasSurface } from "../../lib/src/canvas";
// @ts-ignore
import hovercat_json from "./hovercat.json";

import {
    CHERRY_BLOSSOM,
    DEMI_CHROME,
    Doc, DUNE,
    GRAYSCALE_PALETTE,
    INVERTED_PALETTE,
    Sheet,
    Sprite,
    SpriteFont, Tilemap
} from "../tileeditor/app-model";

const SCALE = 3
const CANVAS_SIZE = new Size(30,20)

function log(...args) {
    console.log(...args)
}


class TilemapView extends BaseView {
    private text: string;
    private map: Tilemap;
    private sheet: Sheet;
    constructor(map:Tilemap, sheet:Sheet) {
        super('dialog-view');
        this.map = map
        this.sheet = sheet
        this.text = 'dialog text here'
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        let sprite_w = this.sheet.sprites[0].w
        let map_w = this.map.w * sprite_w * SCALE
        let map_scale = SCALE * sprite_w
        let map_x = (this.size().w - map_w)/2
        let text_w = g.measureText(this.text,'base').w *2
        let text_x = (this.size().w - text_w)/2
        g.draw_tilemap(this.map,this.sheet,map_x,16,map_scale)
        g.fillStandardText(this.text, text_x,150,'base',2)
    }
    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }
    set_visible(visible: boolean) {
        this._visible = visible
    }

    set_text(died: string) {
        this.text = died
    }
}

export async function start() {
    let doc = new Doc()
    doc.reset_from_json(hovercat_json)
    log(doc)


    let level1 = doc.find_tilemap_by_name('level1')
    log("level1 is",level1)
    let level1_sheet = doc.find_sheet_by_name('base-sheet');
    console.log("sheet is",level1_sheet)
    let surface = new CanvasSurface(CANVAS_SIZE.w*8*SCALE,CANVAS_SIZE.h*8*SCALE);
    // surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()

    root.add(new TilemapView(level1,level1_sheet))

    surface.addToPage();
    surface.set_root(root);
    surface.setup_keyboard_input()

    surface.on_input((evt) => {
        if(evt.type === KEYBOARD_DOWN) {
            let e = evt as KeyboardEvent
            log(e)
            // if(e.key === 'ArrowLeft')  turn_to(new Point(-1,0));
            // if(e.key === 'ArrowRight') turn_to(new Point(+1,0));
            // if(e.key === 'ArrowUp')    turn_to(new Point(+0,-1));
            // if(e.key === 'ArrowDown')  turn_to(new Point(+0,+1));
        }
    })

    let clock = 0
    function process_tick() {
        clock += 1
    }

    function restart() {
        log("restarting")
    }
    restart()

    // update player state from input
    // check for intersection with level
    // update player position from physics
    // draw background layer
    // draw foreground layer
    // draw enmies
    // draw draw player sprite

    function refresh() {
        process_tick()
        surface.repaint()
        requestAnimationFrame(refresh)
    }
    requestAnimationFrame(refresh)
}
