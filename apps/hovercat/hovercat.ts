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
    INVERTED_PALETTE, PICO8,
    Sheet,
    Sprite,
    SpriteFont, Tilemap
} from "../tileeditor/app-model";

const SCALE = 3
const CANVAS_SIZE = new Size(20,16)

function log(...args) {
    console.log(...args)
}


class TilemapView extends BaseView {
    private map: Tilemap;
    private sheet: Sheet;
    private scroll: Point;
    private cache: Map<string, Sprite>;
    constructor(map:Tilemap, sheet:Sheet) {
        super('dialog-view');
        this.map = map
        this.sheet = sheet
        this.scroll = new Point(0,0)
        log('size is',this.map.w,this.map.h)
        this.cache = new Map()
    }
    draw(g: CanvasSurface): void {
        let tile_w = 8
        let w = this.size().w/SCALE/tile_w
        let h = this.size().h/SCALE/tile_w
        let view_w_tiles = w
        let map_w_pixels = this.map.w * SCALE * tile_w
        this.scroll.x += 0.5
        if(this.scroll.x > map_w_pixels - this.size().w) {
            this.scroll.x = 0
        }

        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        g.ctx.imageSmoothingEnabled = false
        let tile_x_off = Math.floor(this.scroll.x/tile_w/SCALE)
        let scroll_x =  (tile_x_off*tile_w*SCALE)- this.scroll.x

        for(let i=0; i<w+1; i++) {
            for(let j=0; j<h; j++) {
                let x = i*tile_w*SCALE + scroll_x
                let y = j*tile_w*SCALE
                // g.fillRect(x,y,8,8, 'red');
                let tile_id = this.map.get_pixel(i+tile_x_off,j)
                if(!this.cache.has(tile_id)) {
                    let tile = this.sheet.sprites.find((t:Sprite) => t.id === tile_id);
                    this.cache.set(tile_id,tile)
                }
                let tile = this.cache.get(tile_id)
                let scale = tile_w*SCALE
                if(tile) {
                    g.ctx.drawImage(tile._img,x,y, scale, scale)
                }
            }
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }
    set_visible(visible: boolean) {
        this._visible = visible
    }
}

export async function start() {
    let doc = new Doc()
    doc.reset_from_json(hovercat_json)
    doc.set_palette(PICO8)
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
