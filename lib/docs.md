# guilib

Until I come up with a better name, this is GUI lib. It is a classic style GUI toolkit (not framework), in the style
of Swing, Cocoa, and Win32.  You have a tree of components, the components are drawn, inputs come in. It's designed
to be very clean and easy to understand, while still pretty fast.  Currently targets HTML canvas, but any raster 
destination should be possible (Linux framebuffer, SDL surface, memory buffer). Usable for apps and games.

# getting started

Create a canvas surface, init the inputs, add some components, then go.

```typescript
    let surface = new CanvasSurface(1200,700);

```


# the rules of making custom Views

All Views must
* have a constructor that takes a JSON object to set internal properties, 
  using defaults if the desired field is not in the input object.
* use `propname()` and `set_propname()` for property getters and setters, when applicable
* have an id and name field

In general you don't need to worry about these rules if you extend the BaseView or BaseParentView classes
since they take care of most of the work. 
