uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec2 pixels;
uniform vec3 uMin;
float PI = 3.1415926;
attribute float aRandom;

void main () {
	vUv = uv;


	vec3 pos = position;
	pos += aRandom * (0.5 * sin(time) + 0.5) * normal;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}