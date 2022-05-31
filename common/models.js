import { log } from "../lib/src/canvas";
export class GridModel {
    constructor(size) {
        this.w = size.w;
        this.h = size.h;
        this.data = [];
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
    }
    get_xy(x, y) {
        let n = this.xy_to_n(x, y);
        return this.data[n];
    }
    set_xy(x, y, value) {
        let n = this.xy_to_n(x, y);
        this.data[n] = value;
    }
    fill_all(cb) {
        this.data = this.data.map((v) => cb(v));
    }
    fill_row(row, cb) {
        for (let i = 0; i < this.h; i++) {
            this.set_xy(i, row, cb(this.get_xy(i, row)));
        }
    }
    fill_col(col, cb) {
        for (let v = 0; v < this.h; v++) {
            this.set_xy(col, v, cb(this.get_xy(col, v)));
        }
    }
    xy_to_n(x, y) {
        return x + y * this.h;
    }
    forEach(cb) {
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                cb(this.get_xy(i, j), i, j);
            }
        }
    }
    dump() {
        log("grid model", this.w, this.h);
        log(this.data);
    }
    get_at(pt) {
        return this.get_xy(pt.x, pt.y);
    }
    set_at(pt, value) {
        return this.set_xy(pt.x, pt.y, value);
    }
}
