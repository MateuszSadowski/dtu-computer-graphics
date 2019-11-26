// JavaScript source code

onload = init;

let ORBIT_STEP = 0.01;
//TODO: remove these constants
let TRANSLATION_SCALE_FACTOR = 1;
let Z_TRANSLATION_RANGE_FACTOR = 0.1;
let MAX_ORBIT_RADIUS = 25;

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
	var rotation = [0, 0, 0];
	var scaleValues = [1, 1, 1];
	var numOfSubdivisions = 4;
	var orbitRadius = 2;
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
	webglLessonsUI.setupSlider("#orbitR", { value: orbitRadius, slide: updateOrbitRadius(), min: 1, max: MAX_ORBIT_RADIUS, step: 0.01, precision: 2 });
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

	// vertices for sphere
	var va = vec4(0.0, 0.0, 1.0, 1);
	var vb = vec4(0.0, 0.942809, -0.333333, 1);
	var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
	var vd = vec4(0.816497, -0.471405, -0.333333, 1);
	var tetrahedron = [];

	// vetices for quad filling background
	var v1 = vec4(-3, -3, -0.999, 1);
	var v2 = vec4(3, -3, -0.999, 1);
	var v3 = vec4(3, 3, -0.999, 1);
	var v4 = vec4(-3, 3, -0.999, 1);
	var backgroundQuad = [v1, v2, v3, v4];

	// light source
	var lightDirection = vec4(0.0, 0.0, -1.0, 0.0);
	var lightEmission = vec4(0.2, 0.2, 0.2, 1.0);
	var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
	var materialDiffuse = 1.0;
	var materialSpecular = 10.0;
	var materialShininess = 500.0;
	//TODO: Add ambient coefficient

	var g_tex_ready = 0;

	// texture
	initTexture();

	// upload values to shader
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	var vPosition = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

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

	// var uWindowSize = gl.getUniformLocation(program, "u_WindowSize");
	// gl.uniform2fv(uWindowSize, );

	// === setup methods ===
	function initTexture() {
		var cubemap = ["textures/cm_left.png", // POSITIVE_X
			"textures/cm_right.png", // NEGATIVE_X
			"textures/cm_top.png", // POSITIVE_Y
			"textures/cm_bottom.png", // NEGATIVE_Y
			"textures/cm_back.png", // POSITIVE_Z
			"textures/cm_front.png"]; // NEGATIVE_Z

		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.uniform1i(gl.getUniformLocation(program, "u_TexMap"), 0);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		
		for (var i = 0; i < 6; ++i) {
			var image = document.createElement("img");
			image.crossorigin = "anonymous";
			image.textarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
			image.onload = function (event) {
				var image = event.target;
				gl.texImage2D(image.textarget, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
				++g_tex_ready;
			};
			image.src = cubemap[i];
		}
	}

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
	//var eye = vec3(0, 0, 2);
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	// var pMat = ortho(-2, 2, -2, 2, -5, 10);
	var pMat = perspective(90, 1, 0.1, 5);
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

	function draw(type, vertices) {
		initBuffersAndUploadVertices(vertices);
		gl.drawArrays(type, 0, vertices.length);
	}

	function initBuffersAndUploadVertices(vertices) {
		gl.deleteBuffer(gl.vBuffer);
		gl.vBuffer = gl.createBuffer();
		if(!gl.vBuffer) {
			console.log("Failed to create vertex buffer.");
			return -1;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	}

	function render() {
		gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if (g_tex_ready < 6)
			return;

		// sphere
		makeTetrahedron(va, vb, vc, vd, numOfSubdivisions);

		// compute matrices
		// last specified transformation is first to be applied
		var mMat = mat4();
		mMat = mult(mMat, translate(translation[0], translation[1], translation[2]));
		var rMat = mat4();
		rMat = mult(rMat, rotate(rotation[0], vec3(1, 0, 0)));
		rMat = mult(rMat, rotate(rotation[1], vec3(0, 1, 0)));
		rMat = mult(rMat, rotate(rotation[2], vec3(0, 0, 1)));
		mMat = mult(mMat, rMat);
		mMat = mult(mMat, scale(scaleValues[0], scaleValues[1], scaleValues[2]));
		var mvMat = mult(vMat, mMat);
		var mvpMat = mult(pMat, mvMat);

		var N = normalMatrix(mvMat, false);
		var uNMatrix = gl.getUniformLocation(program, "u_NMatrix");
		gl.uniformMatrix3fv(uNMatrix, false, flatten(N));

		var uMVMatrix = gl.getUniformLocation(program, "u_mvMatrix");
		gl.uniformMatrix4fv(uMVMatrix, false, flatten(mvMat));

		var uMVPMatrix = gl.getUniformLocation(program, "u_mvpMatrix");
		gl.uniformMatrix4fv(uMVPMatrix, false, flatten(mvpMat));

		var texMat = mult(inverse4(rMat), inverse4(pMat));
		var uTexMatrix = gl.getUniformLocation(program, "u_texMatrix");
		gl.uniformMatrix4fv(uTexMatrix, false, flatten(texMat));

		var uEyePosition = gl.getUniformLocation(program, "u_EyePosition");
		gl.uniform3fv(uEyePosition, flatten(eye));

		// gl.drawArrays(gl.TRIANGLES, 0, tetrahedron.length);
		// draw(gl.TRIANGLE_FAN, backgroundQuad);
		draw(gl.TRIANGLES, tetrahedron);
	}

	function tick() {
		render();
		requestAnimationFrame(tick);
	}

	// === start program ===
	tick();
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
	return WebGLUtils.setupWebGL(canvas);
}