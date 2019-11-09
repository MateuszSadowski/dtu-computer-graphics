// JavaScript source code

onload = init;

let ORBIT_STEP = 0.01;
//TODO: remove these constants
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
	gl.vBuffer = null;
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	// gl.frontFace(gl.CW);

	// === setup UI ===
	var translation = [0, 0, 0];
	var rotation = [128, 140, 26];
	var scaleValues = [1, 1, 1];
	var numOfSubdivisions = 4;
	var orbitRadius = 4.5;
	var orbitAngle = 0;
	var shouldOrbit = 0;

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
	webglLessonsUI.setupSlider("#orbitR", { value: orbitRadius, slide: updateOrbitRadius(), min: 0, max: 5, step: 0.01, precision: 2 });
	// buttons
	var decreaseSubdivisionButton = document.getElementById("dec-sub");
	decreaseSubdivisionButton.addEventListener("click", () => {
		if (numOfSubdivisions > 0) {
			numOfSubdivisions--;
			render();
		}
	})
	var increaseSubdivisionButton = document.getElementById("inc-sub");
	increaseSubdivisionButton.addEventListener("click", () => {
		if (numOfSubdivisions < 9) {
			numOfSubdivisions++;
		}
		render();
	})
	var toggleOrbitButton = document.getElementById("orbit");
	toggleOrbitButton.addEventListener("click", () => {
		shouldOrbit = (shouldOrbit + 1) % 2;
		orbit();
	})

	function updatePosition(index) {
		return function (event, ui) {
			translation[index] = ui.value / TRANSLATION_SCALE_FACTOR;
			render();
		};
	}

	function updateRotation(index) {
		return function (event, ui) {
			rotation[index] = ui.value;
			render();
		};
	}

	function updateScale(index) {
		return function (event, ui) {
			scaleValues[index] = ui.value;
			render();
		};
	}

	function updateOrbitRadius() {
		return function (event, ui) {
			orbitRadius = ui.value;
			render();
		};
	}

	// load model data
	var a_Position = gl.getAttribLocation(program, 'a_Position');
	var a_Normal = gl.getAttribLocation(program, 'a_Normal');
	var a_Color = gl.getAttribLocation(program, 'a_Color');
	var model = initVertexBuffers(gl, program);
	readOBJFile("./teapot.obj", model, gl, 60, true);
	
	var g_objDoc = null; // The information of OBJ file
	var g_drawingInfo = null; // The information for drawing 3D model

	function initVertexBuffers(gl, program) {
		var o = new Object();
		o.vertexBuffer = createEmptyArrayBuffer(gl, a_Position, 3, gl.FLOAT);
		o.normalBuffer = createEmptyArrayBuffer(gl, a_Normal, 3, gl.FLOAT);
		o.colorBuffer = createEmptyArrayBuffer(gl, a_Color, 4, gl.FLOAT);
		o.indexBuffer = gl.createBuffer();
		return o;
	}

	function createEmptyArrayBuffer(gl, a_attribute, num, type) {
		var buffer = gl.createBuffer(); // Create a buffer object

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
		gl.enableVertexAttribArray(a_attribute); // Enable the assignment

		return buffer;
	}

	// Read a file
	function readOBJFile(fileName, gl, model, scale, reverse) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function () {
			if (request.readyState === 4 && request.status !== 404) {
				onReadOBJFile(request.responseText, fileName, gl, model, scale, reverse);
			}
		}
		request.open('GET', fileName, true); // Create a request to get file
		request.send(); // Send the request
	}

	// OBJ file has been read
	function onReadOBJFile(fileString, fileName, gl, o, scale, reverse) {
		var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
		var result = objDoc.parse(fileString, scale, reverse);
		if (!result) {
			g_objDoc = null; g_drawingInfo = null;
			console.log("OBJ file parsing error.");
			return;
		}
		g_objDoc = objDoc;
	}

	function onReadComplete(gl, model, objDoc) {
		// Acquire the vertex coordinates and colors from OBJ file
		var drawingInfo = objDoc.getDrawingInfo();

		// Write date into the buffer object
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

		// Write the indices to the buffer object
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

		return drawingInfo;
	}

	// vertices for sphere
	var va = vec4(0.0, 0.0, 1.0, 1);
	var vb = vec4(0.0, 0.942809, -0.333333, 1);
	var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
	var vd = vec4(0.816497, -0.471405, -0.333333, 1);
	var tetrahedron = [];

	// light source
	var lightDirection = vec4(0.0, 0.0, -1.0, 0.0);
	var lightEmission = vec4(1.0, 1.0, 1.0, 1.0);
	var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
	var materialDiffuse = 1.0;
	var materialSpecular = 1.0;
	var materialShininess = 100.0;
	//TODO: Add ambient coefficient

	// upload values to shader
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	// var vPosition = gl.getAttribLocation(program, "a_Position");
	// gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	// gl.enableVertexAttribArray(vPosition);

	var uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
	gl.uniform4fv(uLightPosition, lightDirection);

	var uLightEmission = gl.getUniformLocation(program, "u_LightEmission");
	gl.uniform4fv(uLightEmission, lightEmission);

	var uLightAmbinet = gl.getUniformLocation(program, "u_LightAmbient");
	gl.uniform4fv(uLightAmbinet, lightAmbient);

	var uMaterialDiffuse = gl.getUniformLocation(program, "u_MaterialDiffuse");
	gl.uniform1f(uMaterialDiffuse, materialDiffuse);

	var uMaterialSpecular = gl.getUniformLocation(program, "u_MaterialSpecular");
	gl.uniform1f(uMaterialSpecular, materialSpecular);

	var uMaterialShininess = gl.getUniformLocation(program, "u_MaterialShininess");
	gl.uniform1f(uMaterialShininess, materialShininess);

	// === setup methods ===
	function orbit() {
		if (shouldOrbit) {
			eye = vec3(orbitRadius * Math.sin(orbitAngle), 0, orbitRadius * Math.cos(orbitAngle));
			vMat = lookAt(eye, at, up);
			render();
			orbitAngle += ORBIT_STEP;
			requestAnimationFrame(orbit);
		} else {
			render();
		}
	}

	var eye = vec3(orbitRadius * Math.sin(orbitAngle), 0, orbitRadius * Math.cos(orbitAngle));
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	// var pMat = ortho(-2, 2, -2, 2, -50, 50);
	var pMat = perspective(45, 1, 0.1, 10);
	var vMat = lookAt(eye, at, up);
	
	function makeTetrahedron(a, b, c, d, n) {
		tetrahedron = [];
		divideTriangle(a, b, c, n);
		divideTriangle(d, c, b, n);
		divideTriangle(a, d, b, n);
		divideTriangle(a, c, d, n);
	}

	function divideTriangle(a, b, c, count) {
		if (count > 0) {
			var ab = normalize(mix(a, b, 0.5), true);
			var ac = normalize(mix(a, c, 0.5), true);
			var bc = normalize(mix(b, c, 0.5), true);
			divideTriangle(a, ab, ac, count - 1);
			divideTriangle(ab, b, bc, count - 1);
			divideTriangle(bc, c, ac, count - 1);
			divideTriangle(ab, bc, ac, count - 1);
		}
		else {
			triangle(a, b, c);
		}
	}

	function triangle(a, b, c) {
		tetrahedron.push(a);
		tetrahedron.push(b);
		tetrahedron.push(c);
	}

	function render() {
		gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) { // OBJ and all MTLs are available
			g_drawingInfo = onReadComplete(gl, model, g_objDoc);
		}
		if (!g_drawingInfo) return;

		// makeTetrahedron(va, vb, vc, vd, numOfSubdivisions);
		// gl.deleteBuffer(gl.vBuffer);
		// gl.vBuffer = gl.createBuffer();
		// gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		// gl.bufferData(gl.ARRAY_BUFFER, flatten(tetrahedron), gl.STATIC_DRAW);

		// compute matrices
		// last specified transformation is first to be applied
		var mMat = mat4();
		mMat = mult(mMat, translate(translation[0], translation[1], translation[2]));
		mMat = mult(mMat, rotate(rotation[0], vec3(1, 0, 0)));
		mMat = mult(mMat, rotate(rotation[1], vec3(0, 1, 0)));
		mMat = mult(mMat, rotate(rotation[2], vec3(0, 0, 1)));
		mMat = mult(mMat, scale(scaleValues[0], scaleValues[1], scaleValues[2]));
		var mvMat = mult(vMat, mMat);
		var mvpMat = mult(pMat, mvMat);

		var N = normalMatrix(mvMat, false);
		var uNMatrix = gl.getUniformLocation(program, "u_NMatrix");
		gl.uniformMatrix3fv(uNMatrix, false, flatten(N));

		var umvMatrix = gl.getUniformLocation(program, "u_mvMatrix");
		gl.uniformMatrix4fv(umvMatrix, false, flatten(mvMat));

		var umvpMatrix = gl.getUniformLocation(program, "u_mvpMatrix");
		gl.uniformMatrix4fv(umvpMatrix, false, flatten(mvpMat));

		// gl.drawArrays(gl.TRIANGLES, 0, tetrahedron.length);
		gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
	}

	// === start program ===
	render();
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
	return WebGLUtils.setupWebGL(canvas);
}