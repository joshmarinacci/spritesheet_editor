import {Point, Size} from "../../lib/src/common";
import {
    Sprite,
    Tilemap
} from "../tileeditor/app-model";

const TILE_SIZE = 8

export const Physics = {
    gravity:new Point(0,0.15),
    BLOCKS_FALLING:[] as Sprite[],
    BLOCKS_SIDEWAYS: [] as Sprite[],
}

export class Player {
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


function blocks_falling(tile_id: string) {
    return Physics.BLOCKS_FALLING.some(sp => sp.id === tile_id)
}

function blocks_sideways(tile_id:string) {
    return Physics.BLOCKS_SIDEWAYS.some(sp => sp.id === tile_id)
}

function log(...args) {
    console.log(...args)
}

export function do_physics(player: Player, map: Tilemap) {
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
            // player_view.test_point.copy_from(test_pixels)

            let test_tiles = test_pixels.divide_floor(TILE_SIZE)
            let tile_id = map.get_pixel(test_tiles.x,test_tiles.y)
            // if standing
            if(!blocks_falling(tile_id)) {
                log("we need to fall")
                player.standing = false
                player.vel.y += Physics.gravity.y
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
            // player_view.test_point.copy_from(test_pixels)

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
                player.vel.y += Physics.gravity.y
                player.position.y += player.vel.y
            }
        }
    } else {
        // if going up
        player.vel.y += Physics.gravity.y
        player.position.y += player.vel.y
    }

    if(player.position.x < 0) {
        player.position.x = 0
    }

    if(player.position.x + player.size.w > map.w * TILE_SIZE) {
        player.position.x = 0
    }

}

