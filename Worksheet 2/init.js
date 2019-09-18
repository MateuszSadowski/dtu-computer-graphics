onload = init;

let CANVAS_WIDTH = 512;
let CANVAS_HEIGHT = 512;
let MAX_VERTICES = 1000;
let bgColors = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), vec3(1, 1, 1)];
DrawingMode = {
    "points": 0,
    "triangles": 1
}

var gl;
var numOfPoints = 0;
var index = 0;
var drawingMode = DrawingMode.points;
var pointIndices = [];
var triangleIndices = [];
var trianglePointsDrawn = 0;

function init() {
    //Set up canvas
    var canvas = document.getElementById("c");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    let chooseColorMenu = document.getElementById("choose-color-menu");
    let clearCanvasMenu = document.getElementById("clear-canvas-menu");
    let clearCanvasButton = document.getElementById("clear-canvas-button");
    canvas.addEventListener("click", function(ev) {
        var boundingBox = ev.target.getBoundingClientRect();
        mousePosition = vec2(2 * (ev.clientX - boundingBox.left) / canvas.width - 1, 2 * (canvas.height - ev.clientY + boundingBox.top - 1) / canvas.height - 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);        
        gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec2'], flatten(mousePosition));
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec3'], flatten(bgColors[chooseColorMenu.selectedIndex]));
        addIndex(index);
        numOfPoints = Math.max(numOfPoints, ++index);
        index %= MAX_VERTICES;
        render();
    });
    clearCanvasButton.addEventListener("click", function() {
        var bgColor = bgColors[clearCanvasMenu.selectedIndex];
        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
        numOfPoints = 0;
        index = 0;
        render();
    });


    //Set up WebGL context
    gl = setupWebGL(canvas);
    var bgColor = bgColors[clearCanvasMenu.selectedIndex];
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Initialize shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //Set up arrays of indices for different drawing mode

    //Provide data for shaders
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES*sizeof['vec2'], gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES*sizeof['vec3'], gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    // vColor = vec3(1, 1, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, numOfPoints);
}

function addIndex(index) {
    if(drawingMode === DrawingMode.points) {
        pointIndices.push(index);
    } else if (drawingMode === DrawingMode.triangles && trianglePointsDrawn < 2) {
        pointIndices.push(index);
        trianglePointsDrawn++;
    } else if (drawingMode === DrawingMode.triangles && trianglePointsDrawn === 2) {
        trianglePointsDrawn.push(index);
        pointIndices.pop();
        pointIndices.pop();
        trianglePointsDrawn = 0;
    }
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}
