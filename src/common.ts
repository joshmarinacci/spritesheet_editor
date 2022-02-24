/*

- [ ] datastructure has tile is pixels, sheet is tiles, tilemap is tile ids
- [ ] left pane edits single tile
- [ ] right pane edits tile map
- [ ] bottom pane is selected tile in list of all tiles
- [ ] exports big JSON file
- [ ] four colors to choose from
- [ ] just draw directly into canvas
- [ ] view is a subset of a canvas that you can pick against



*/

let doc = {
    palette:{
        0:'#ff00ff',
        1:'#f0f0f0',
        2:'#d0d0d0',
        3:'#909090',
        4:'#404040',
    },
    tiles:[
        {
            id:'sprite1',
            width:8,
            height:8,
            data:null,
        },
        {
            id:'sprite2',
            width:8,
            height:8,
            data:null,
        }
    ],
    maps:[
        {
            id:'map1',
            width:8,
            height:8,
            data:null,
        }

    ]
}

console.log("hi from typescript");

export const foo = 'baz';


class MainView {

}


export function start() {
    let canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
}
