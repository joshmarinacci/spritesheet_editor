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

const SCALE = 5
const CANVAS_SIZE = new Size(20,16)
const TILE_SIZE = 8
const gravity = new Point(0, 0.15)

function log(...args) {
    console.log(...args)
}


class TilemapView extends BaseView {
    map: Tilemap;
    private sheet: Sheet;
    // scroll: Point;
    private cache: Map<string, Sprite>;
    private player: Player;

    constructor(map: Tilemap, sheet: Sheet, player: Player) {
        super('dialog-view');
        this.player = player
        this.map = map
        this.sheet = sheet
        // this.scroll = new Point(0,0)
        log('size is',this.map.w,this.map.h)
        this.cache = new Map()
    }
    draw(g: CanvasSurface): void {
        let tile_w = TILE_SIZE
        let w = this.size().w/SCALE/tile_w
        let h = this.size().h/SCALE/tile_w
        let view_w_tiles = w
        let map_w_pixels = this.map.w * SCALE * tile_w

        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        g.ctx.imageSmoothingEnabled = false
        let tile_x_off = Math.floor(this.player.scroll.x/tile_w/SCALE)
        let scroll_x =  (tile_x_off*tile_w*SCALE)- this.player.scroll.x

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
    private player: any;
    private sprite1: Sprite
    private sprite2: Sprite
    test_point: Point;
    constructor(model: any, spritesheet: Sheet) {
        super('sprite-view')
        this.player = model;
        this.sprite1 = spritesheet.sprites.find(sp => sp.name === 'cat1')
        this.sprite2 = spritesheet.sprites.find(sp => sp.name === 'cat2')
        this.set_size(new Size(TILE_SIZE,TILE_SIZE))
        this.test_point = new Point(0,0)
    }
    draw(g: CanvasSurface): void {
        g.ctx.imageSmoothingEnabled = false
        // g.draw_sprite(0,0,this.sprite1,SCALE)
        let x = 0 - this.player.scroll.x;
        let y = 0;
        g.draw_sprite(x,0,this.sprite2,SCALE)
        //draw the bounds
        g.stroke(new Rect(x,0,this.player.size.w*SCALE,this.player.size.h*SCALE), 'red')
        g.stroke(new Rect(
            x + this.test_point.x*SCALE-this.position().x,
            this.test_point.y*SCALE-this.position().y,5,5),'green')
    }
    position(): Point {
        return new Point(
            this.player.position.x*SCALE,
            this.player.position.y*SCALE,
        )
    }

    layout(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}

class Player {
    position: Point // position in unscaled pixels
    vel: Point // velocity in unscaled pixels per tick
    standing: boolean
    size:Size //size in unscaled pixels
    scroll:Point //scroll in actual screen pixels
    constructor() {
        this.position = new Point(10,5)
        this.vel = new Point(0,0)
        this.standing = false
        this.size = new Size(1*8, 1*8)
        this.scroll = new Point(0,0)
    }
}

let BLOCKS_FALLING:Sprite[] = []
let BLOCKS_SIDEWAYS:Sprite[] = []

function blocks_falling(tile_id: string) {
    return BLOCKS_FALLING.some(sp => sp.id === tile_id)
}

function blocks_sideways(tile_id:string) {
    return BLOCKS_SIDEWAYS.some(sp => sp.id === tile_id)
}


function do_physics(player: Player, map: Tilemap, player_view: PlayerView) {
    {
        if(player.vel.x < 0) {
            //going left
            let player_pos_tiles = player.position.divide_floor(TILE_SIZE)
            //left side =
            let test_x = player.position.x + player.vel.x
            let test_tile_x = Math.floor(test_x / TILE_SIZE)
            let tile_id2 = map.get_pixel(test_tile_x, player_pos_tiles.y)
            if (blocks_sideways(tile_id2)) {
                log("hit side")
                player.vel.x = 0
            }
        } else {
            // log(tile_id2)
            //going right
            let player_pos_tiles = player.position.divide_floor(TILE_SIZE)
            let test_x = player.position.x + player.vel.x + player.size.w
            let test_tile_x = Math.floor(test_x / TILE_SIZE)
            let tile_id2 = map.get_pixel(test_tile_x, player_pos_tiles.y)
            if (blocks_sideways(tile_id2)) {
                log("hit side")
                player.vel.x = 0
            }
        }
        if (player.position.x < 0) player.position.x = 0
        player.position.x += player.vel.x
    }

    //update y
    if(player.vel.y >= 0) {
        //if going down
        //use bottom left corner
        if(player.standing) {
            let test_pixels = player.position.add(new Point(0,player.size.h))
            //if going right, use the bottom right corner
            if(player.vel.x < 0) test_pixels.x += player.size.w
            player_view.test_point.copy_from(test_pixels)

            let test_tiles = test_pixels.divide_floor(TILE_SIZE)
            let tile_id = map.get_pixel(test_tiles.x,test_tiles.y)
            // if standing
            if(!blocks_falling(tile_id)) {
                log("we need to fall")
                player.standing = false
                player.vel.y += gravity.y
                player.position.y += player.vel.y
            } else {
                log("keep standing")
                player.vel.y = 0
                // player.position.y += player.vel.y
            }
        } else {
            let test_pixels = player.position.add(new Point(0,player.size.h))
            //if going right, use the bottom right corner
            if(player.vel.x > 0) test_pixels.x += player.size.w
            player_view.test_point.copy_from(test_pixels)

            let test_tiles = test_pixels.divide_floor(TILE_SIZE)
            let tile_id = map.get_pixel(test_tiles.x,test_tiles.y)
            // player.vel.y += gravity.y
            // test_pixels.y += player.vel.y

            // if falling
            if(blocks_falling(tile_id)) {
                log('we need to stand')
                player.vel.y = 0
                player.position.y += player.vel.y
                player.standing = true
            } else {
                //keep falling
                log("keep falling")
                player.vel.y += gravity.y
                player.position.y += player.vel.y
            }
        }
    } else {
        // if going up
        player.vel.y += gravity.y
        player.position.y += player.vel.y
    }


}

function do_scroll(player: Player) {
    if(player.position.x > 100) {
        player.scroll.x = (player.position.x - 100)*SCALE
    } else {
        player.scroll.x = 0
    }
    if(player.position.x < 0) {
        player.position.x = 0
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

    let player = new Player();
    let tile_view = new TilemapView(level1, level1_sheet, player)
    root.add(tile_view)

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
                    player.vel.y = -3.5
                    player.standing = false
                }
            }
        }
    })

    let clock = 0
    // let max_vel = new Point(1, 10)
    player.position.y = 4
    player.vel.y = 0

    let ground:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'ground')
    let block1:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block1')
    let block2:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block2')
    BLOCKS_FALLING.push(ground)
    BLOCKS_FALLING.push(block1)
    BLOCKS_FALLING.push(block2)
    BLOCKS_SIDEWAYS.push(block1)
    BLOCKS_SIDEWAYS.push(block2)

    function process_tick() {
        clock += 1
        do_physics(player, tile_view.map, player_view)
        do_scroll(player);
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
