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

export async function start() {
    let doc = new Doc()
    doc.reset_from_json(hovercat_json)
    log(doc)


    let level1 = doc.find_tilemap_by_name('level1')
    log("level1 is",level1)
    let surface = new CanvasSurface(CANVAS_SIZE.w*8*SCALE,CANVAS_SIZE.h*8*SCALE);
    // surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()

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
