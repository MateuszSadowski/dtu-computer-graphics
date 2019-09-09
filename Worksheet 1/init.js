onload = init;

var gl;
var vertices;

var rotation = 0.0;
var vRotation;

function init() {
    var canvas = document.getElementById("c");
    canvas.width = 512;
    canvas.height = 512;
    // var gl = canvas.getContext("webgl");
    gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //Set up data for vertex shader
    vertices = [vec2(0.5, 0.0), vec2(0.0, 0.5), vec2(-0.5, 0.0), vec2(0.0, -0.5) ];
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    vRotation = gl.getUniformLocation(program, "u_Rotation");

    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    //Set rotation
    rotation += 0.05;
    gl.uniform1f(vRotation, rotation);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);

    requestAnimFrame(render);
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}
