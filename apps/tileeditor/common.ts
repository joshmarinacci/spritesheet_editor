import {CanvasSurface,} from "../../lib/src/canvas";
import {Point, Size} from "../../lib/src/common";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";

export function draw_grid(g: CanvasSurface, size: Size, step: number) {
    //draw the grid
    g.ctx.beginPath();
    for (let i = 0; i <= size.w; i += step) {
        g.ctx.moveTo(i + 0.5, 0);
        g.ctx.lineTo(i + 0.5, size.h);
    }
    for (let i = 0; i <= size.h; i += step) {
        g.ctx.moveTo(0, i + 0.5);
        g.ctx.lineTo(size.w, i + 0.5);
    }
    g.ctx.strokeStyle = 'black';
    g.ctx.lineWidth = 1;
    g.ctx.stroke();
}

export function wrap_number(num: number, width: number): Point {
    return new Point(
        num % width,
        Math.floor(num / width)
    )
}