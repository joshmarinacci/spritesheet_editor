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
    map: Tilemap;
    private sheet: Sheet;
    scroll: Point;
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

class PlayerView extends BaseView {
    private model: any;
    private sprite1: Sprite
    private sprite2: Sprite
    constructor(model: any, spritesheet: Sheet) {
        super('sprite-view')
        this.model = model;
        this.sprite1 = spritesheet.sprites.find(sp => sp.name === 'cat1')
        this.sprite2 = spritesheet.sprites.find(sp => sp.name === 'cat2')
        this.set_size(new Size(8*SCALE,8*SCALE))
    }
    draw(g: CanvasSurface): void {
        g.ctx.imageSmoothingEnabled = false
        g.draw_sprite(0,0,this.sprite1,SCALE)
        g.draw_sprite(8 * SCALE,0,this.sprite2,SCALE)
        //draw the bounds
        g.stroke(new Rect(0,0,this.model.size.w,this.model.size.h), 'red')
    }
    position(): Point {
        return new Point(
            this.model.position.x,
            this.model.position.y,
        )
    }

    layout(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}

class Player {
    position: Point // position in pixels
    vel: Point // velocity in pixels per tick
    standing: boolean
    size:Size //size in pixels
    constructor() {
        this.position = new Point(100,100)
        this.vel = new Point(0,0)
        this.standing = false
        this.size = new Size(2*8*SCALE, 1*8*SCALE)
    }
}


export async function start() {
    let doc = new Doc()
    doc.reset_from_json(hovercat_json)
    doc.set_palette(PICO8)
    log(doc)


    let level1 = doc.find_tilemap_by_name('level1')
    log("level1 is", level1)
    let level1_sheet = doc.find_sheet_by_name('base-sheet');
    console.log("sheet is", level1_sheet)
    let surface = new CanvasSurface(CANVAS_SIZE.w * 8 * SCALE, CANVAS_SIZE.h * 8 * SCALE);
    // surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()

    let tile_view = new TilemapView(level1, level1_sheet)
    root.add(tile_view)

    let player = new Player();
    let player_view = new PlayerView(player, level1_sheet)
    root.add(player_view)

    surface.addToPage();
    surface.set_root(root);
    surface.setup_keyboard_input()

    surface.on_input((evt) => {
        if (evt.type === KEYBOARD_DOWN) {
            let e = evt as KeyboardEvent
            // log(e)
            if (e.key === 'ArrowLeft') {
                player.vel.x = -1
            }
            if (e.key === 'ArrowRight') {
                player.vel.x = 1
            }
            // if(e.key === 'ArrowUp')    turn_to(new Point(+0,-1));
            // if(e.key === 'ArrowDown')  turn_to(new Point(+0,+1));
            if (e.code === 'Space') {
                if (player.standing) {
                    player.vel.y = -8
                    player.standing = false
                }
            }
        }
    })

    let clock = 0
    let gravity = new Point(0, 0.2)
    let max_vel = new Point(1, 10)
    let bottom = 15 * 8 * SCALE
    player.position.y = bottom
    player.vel.y = -8

    let ground:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'ground')
    let block1:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block1')
    let block2:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block2')

    function blocks_falling(tile_id: string) {
        if (tile_id === ground.id) return true
        if(tile_id === block1.id) return true
        if(tile_id === block2.id) return true
        return false
    }

    function blocks_sideways(tile_id:string) {
        if(tile_id === block1.id) return true
        if(tile_id === block2.id) return true
    }

    function process_tick() {
        clock += 1
        // auto scroll
        // tile_view.scroll.x += 0.2
        let map_w_pixels = tile_view.map.w * SCALE * 8
        if(tile_view.scroll.x > map_w_pixels - tile_view.size().w) {
            tile_view.scroll.x = 0
        }

        //update y
        if(!player.standing) {
            //if falling
            player.vel.y += gravity.y
            // don't fall faster than max velocity
            if (player.vel.y > max_vel.y) player.vel.y = max_vel.y
            // move player down
            player.position.y += player.vel.y

            // check tile below the user
            {
                //left edge
                let player_pos_tiles = player.position.divide_floor(8 * SCALE)
                // log(player_pos_tiles)
                let tile_id = tile_view.map.get_pixel(player_pos_tiles.x, player_pos_tiles.y)
                if (blocks_falling(tile_id)) {
                    log("hit ground")
                    player.vel.y = 0
                    player.standing = true
                    player.position.y = (player_pos_tiles.y - 1) * 8 * SCALE
                }
            }
            {
                //right edge
                let player_pos_tiles = player.position.add(new Point(player.size.w,0)).divide_floor(8 * SCALE)
                let tile_id = tile_view.map.get_pixel(player_pos_tiles.x, player_pos_tiles.y)
                if (blocks_falling(tile_id)) {
                    log("hit ground")
                    player.vel.y = 0
                    player.standing = true
                    player.position.y = (player_pos_tiles.y - 1) * 8 * SCALE
                }
            }
        }

        //update x
        {
            let player_pos_tiles = player.position.divide_floor(8*SCALE)
            if(player.vel.x < 0) {
                //going left
                //left side =
                let test_x = player.position.x + player.vel.x
                let test_tile_x = Math.floor(test_x / (8 * SCALE))
                let tile_id2 = tile_view.map.get_pixel(test_tile_x, player_pos_tiles.y)
                if (blocks_sideways(tile_id2)) {
                    log("hit side")
                    player.vel.x = 0
                }
            } else {
                // log(tile_id2)
                //going right
                let test_x = player.position.x + player.vel.x + player.size.w
                let test_tile_x = Math.floor(test_x / (8 * SCALE))
                let tile_id2 = tile_view.map.get_pixel(test_tile_x, player_pos_tiles.y)
                if (blocks_sideways(tile_id2)) {
                    log("hit side")
                    player.vel.x = 0
                }
            }
            player.position.x += player.vel.x
            if (player.position.x < 0) player.position.x = 0
        }

        // don't fall off the bottom of the screen
        if(player.position.y > bottom) {
            player.position.y = bottom
        }

    }

    function restart() {
        log("restarting")
    }
    restart()

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
