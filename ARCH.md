

The goal is to write a performant visualizer 

The inputs are net.schedule and net.dot

net.schedule:
```
{
    "schedule": [
        {
            "op_code": "L1_COPY_IN",    // Label of node
            "op_magic": 10000           // ID

        },
        {
            "op_code": "CONV",          // Label of node
            "op_magic": 10032           // ID

        },
    ]
}
```

net.dot
```
digraph program {
L1_COPY_IN_10000 [id="10000"]
L1_COPY_IN_10001 [id="10001"]
L1_COPY_IN_10002 [id="10002"]
CONV_10032 [id="10032"]
...
CONV_10099 [id="10099"]
L1_COPY_IN_10000 -> CONV_10032;
L1_COPY_IN_10000 -> CONV_10045;
L1_COPY_IN_10000 -> CONV_10045;
L1_COPY_IN_10000 -> CONV_10045;
....
CONV_10032 -> COPY_OUT_10100;
}
```

The goal is to write three files.
1. index.html
2. script.js
3. styles.css

### Achitecture:

* There should be a simple `server.py` script which serves the three files above.

* Should contain a fully wide canvas which renders the dot graph and
  the edges.

* Should allow the user to zoom in and out with the scroll wheel,
   drag around the canvas using event listeners for mouseup/down etc.

* Should be performant so that when very large graphs are rendered there isn't
  lag when the user scrolls around.

### Features

* An input slider to color the nodes in schedule order as given by `schedule.json`.

* An input slider control and play/pause button to control the speed of animating the schedule.

* A search bar which will look for nodes whose label contains the substring being searched.

### Requirements

* No third-party dependencies are, just `css`, `js` and `html`
* Simple UI
* Simple, cleanly factored, extensible implementation.
* 

### Design

Lets use JavaScript classes to neatly divide up the responsibility.
There should be a VizState class, a class used to manage the CanvasView,
scrolling and dragging which moves around the camera etc. 


