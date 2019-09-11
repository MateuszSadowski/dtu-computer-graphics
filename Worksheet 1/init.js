onload = init;

let CIRCLE_RADIUS = 0.3;
let CIRCLE_POINTS = 50;
let UPPER_BOUND = 0.6;
let LOWER_BOUND = -0.6;
let TRANSLATION_STEP = 0.01;

var gl;
var vertices = [];
var colors = [];

var translation = 0.0;
var vTranslation;
var bounceUp = true;

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
    var center = vec2(0, 0);
    colors.push(vec3(1, 1, 1));
    vertices.push(center);
    for (let i = 0; i <= CIRCLE_POINTS; i++) {
        var j = 2 * i * Math.PI / CIRCLE_POINTS;
        vertices.push(vec2(
            CIRCLE_RADIUS * Math.sin(j),
            CIRCLE_RADIUS * Math.cos(j)
        ));
        colors.push(getRandomRGB());
    }
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    vTranslation = gl.getUniformLocation(program, "u_Translation");

    //Set up data for fragment shader
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    bounce();
    gl.uniform1f(vTranslation, translation);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);

    requestAnimFrame(render);
}

function bounce() {
    if(translation >= UPPER_BOUND) {
        bounceUp = false;
    } else if(translation <= LOWER_BOUND) {
        bounceUp = true;
    }
    if(bounceUp) {
        translation += TRANSLATION_STEP;
    } else {
        translation -= TRANSLATION_STEP;
    }
}

function getRandomRGB() {
    // var rgb = vec3(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
    var rgb = vec3(0, 1, 0);
    return rgb;
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}
