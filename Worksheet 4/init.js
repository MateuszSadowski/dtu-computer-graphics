// JavaScript source code

onload = init;

let TRANSLATION_SCALE_FACTOR = 200;
let Z_TRANSLATION_RANGE_FACTOR = 10;

function init() {
	var canvas = document.getElementById("c");
	var gl = setupWebGL(canvas);
	if (!gl) {
		return;
	}

	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

	var translation = [0, 0, 0];
	var rotation = [128, 140, 26];
	var scaleValues = [1, 1, 1];

	// setup UI
	// https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
	webglLessonsUI.setupSlider("#x", { value: translation[0], slide: updatePosition(0), min: -gl.canvas.width, max: gl.canvas.width });
	webglLessonsUI.setupSlider("#y", { value: translation[1], slide: updatePosition(1), min: -gl.canvas.height, max: gl.canvas.height });
	webglLessonsUI.setupSlider("#z", { value: translation[2], slide: updatePosition(2), min: -gl.canvas.height * Z_TRANSLATION_RANGE_FACTOR, max: gl.canvas.height * Z_TRANSLATION_RANGE_FACTOR });
	webglLessonsUI.setupSlider("#angleX", { value: rotation[0], slide: updateRotation(0), max: 360 });
	webglLessonsUI.setupSlider("#angleY", { value: rotation[1], slide: updateRotation(1), max: 360 });
	webglLessonsUI.setupSlider("#angleZ", { value: rotation[2], slide: updateRotation(2), max: 360 });
	webglLessonsUI.setupSlider("#scaleX", { value: scaleValues[0], slide: updateScale(0), min: -5, max: 5, step: 0.01, precision: 2 });
	webglLessonsUI.setupSlider("#scaleY", { value: scaleValues[1], slide: updateScale(1), min: -5, max: 5, step: 0.01, precision: 2 });
	webglLessonsUI.setupSlider("#scaleZ", { value: scaleValues[2], slide: updateScale(2), min: -5, max: 5, step: 0.01, precision: 2 });

	// vertices for a cube
	var cube = [
		vec4(1.0, 1.0, 1.0, 1.0),
		vec4(-1.0, 1.0, 1.0, 1.0),
		vec4(-1.0, -1.0, 1.0, 1.0),
		vec4(1.0, -1.0, 1.0, 1.0),
		vec4(1.0, -1.0, -1.0, 1.0),
		vec4(1.0, 1.0, -1.0, 1.0),
		vec4(-1.0, 1.0, -1.0, 1.0),
		vec4(-1.0, -1.0, -1.0, 1.0)
	];
	var indices = [
		0, 1, 2,
		0, 2, 3,
		0, 3, 4,
		0, 4, 5,
		0, 5, 6,
		0, 6, 1,
		1, 6, 7,
		1, 7, 2,
		7, 4, 3,
		7, 3, 2,
		4, 7, 6,
		4, 6, 5
	];

	function updatePosition(index) {
		return function (event, ui) {
			translation[index] = ui.value / TRANSLATION_SCALE_FACTOR;
			render(indices.length, 0);
		};
	}

	function updateRotation(index) {
		return function (event, ui) {
			rotation[index] = ui.value;
			render(indices.length, 0);
		};
	}

	function updateScale(index) {
		return function (event, ui) {
			scaleValues[index] = ui.value;
			render(indices.length, 0);
		};
	}
	var eye = vec3(0, 20, 20);
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	var pMat = ortho(-2, 2, -2, 2, -50, 50);
	// TODO: Enable perspective
	// var pMat = perspective(45, 1, 0, 20);
	var vMat = lookAt(eye, at, up);

	function render(numPoints, offset) {
		gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// compute matrices
		// last specified transformation is first to be applied
		var mMat = mat4();
		mMat = mult(mMat, translate(translation[0], translation[1], translation[2]));
		mMat = mult(mMat, rotate(rotation[0], vec3(1, 0, 0)));
		mMat = mult(mMat, rotate(rotation[1], vec3(0, 1, 0)));
		mMat = mult(mMat, rotate(rotation[2], vec3(0, 0, 1)));
		mMat = mult(mMat, scale(scaleValues[0], scaleValues[1], scaleValues[2]));
		var mvpMat = mult(pMat, mult(vMat, mMat));

		var uMatrix = gl.getUniformLocation(program, "u_Matrix");
		gl.uniformMatrix4fv(uMatrix, false, flatten(mvpMat));

		gl.drawElements(gl.TRIANGLES, numPoints, gl.UNSIGNED_BYTE, offset);
	}

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(cube), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var iBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

	// colors
	var vertexColors = [
		[0.0, 0.0, 0.0, 1.0], // black
		[1.0, 0.0, 0.0, 1.0], // red
		[1.0, 1.0, 0.0, 1.0], // yellow
		[0.0, 1.0, 0.0, 1.0], // green
		[0.0, 0.0, 1.0, 1.0], // blue
		[1.0, 0.0, 1.0, 1.0], // magenta
		[1.0, 1.0, 1.0, 1.0], // white
		[0.0, 1.0, 1.0, 1.0] // cyan
	];

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

	var aColor = gl.getAttribLocation(program, "a_Color");
	gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aColor);

	render(indices.length, 0);
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
	return WebGLUtils.setupWebGL(canvas);
}