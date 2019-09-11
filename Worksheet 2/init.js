onload = init;

let CANVAS_WIDTH = 512;
let CANVAS_HEIGHT = 512;

var gl;

let MAX_VERTICES = 1000;

var numOfPoints = 0;
var index = 0;

function init() {
    //Set up canvas
    var canvas = document.getElementById("c");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.addEventListener("click", function(ev) {
        var boundingBox = ev.target.getBoundingClientRect();
        mousePosition = vec2(2 * (ev.clientX - boundingBox.left) / canvas.width - 1, 2 * (canvas.height - ev.clientY + boundingBox.top - 1) / canvas.height - 1);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec2'], flatten(mousePosition));
        numOfPoints = Math.max(numOfPoints, ++index);
        index %= MAX_VERTICES;
        render();
    });

    //Set up WebGL context
    gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Initialize shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //Provide data for shaders
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES*sizeof['vec2'], gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, numOfPoints);
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}
