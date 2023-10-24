import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
import dancer from './model.glb' 

import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'


import './extend'

console.log(THREE.extendMaterial, '312')

export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true,
		 })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
		 
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 100
		)
 
		this.camera.position.set(2, 2, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

		this.addObjects()		 
		//this.resize()
		this.render()
		this.setupResize()
		this.addLights()
		this.settings()
 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01).onChange(val => {
			this.material2.uniforms.progress.value = val
		})
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		this.imageAspect = 853/1280
		let a1, a2
		if(this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect
			a2 = 1
		} else {
			a1 = 1
			a2 = (this.height / this.width) * this.imageAspect
		} 


		this.material.uniforms.resolution.value.x = this.width
		this.material.uniforms.resolution.value.y = this.height
		this.material.uniforms.resolution.value.z = a1
		this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {






		let floor = new THREE.Mesh(
			new THREE.PlaneGeometry(15, 15, 100, 100),
			new THREE.MeshStandardMaterial({color: 0xffffff})
		)
		floor.rotation.x = -Math.PI * 0.5
		floor.position.y = -1.1
		this.scene.add(floor)

		floor.castShadow = false
		floor.receiveShadow = true


		let that = this
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader,
			wireframe: true
		})
		
		this.geometry = new THREE.IcosahedronGeometry(1,10).toNonIndexed()
		//this.geometry = new THREE.SphereGeometry(1, 32,32).toNonIndexed()



		this.material2 = new THREE.MeshStandardMaterial({
			color: 0xff0000
		})



		this.material2 = THREE.extendMaterial( THREE.MeshStandardMaterial, {

			class: THREE.CustomMaterial,  // In this case ShaderMaterial would be fine too, just for some features such as envMap this is required
		  
			vertexHeader: `
			attribute float aRandom;
			attribute vec3 aCenter;
			uniform float time;
			uniform float progress;



			 mat4 rotationMatrix(vec3 axis, float angle) {
				axis = normalize(axis);
				float s = sin(angle);
				float c = cos(angle);
				float oc = 1.0 - c;
				
				return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
								oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
								oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
								0.0,                                0.0,                                0.0,                                1.0);
		  }
		  
		  vec3 rotate(vec3 v, vec3 axis, float angle) {
			  mat4 m = rotationMatrix(axis, angle);
			  return (m * vec4(v, 1.0)).xyz;
		  }


			`,
			vertex: {
				transformEnd: /*glsl */`
				float prog = (position.y + 100.) /2.;
				float locprog = clamp((progress - 0.8 * prog) / 0.2, 0., 1. );

				locprog = progress;

				transformed = transformed - aCenter;
				// transformed += 3. * normal * aRandom*(locprog);
				transformed *= (1. - locprog);
				 
				// transformed += progress * aRandom * normal;
				//transformed = transformed - aCenter;
				 transformed += aCenter;
				 
				transformed = rotate(transformed, vec3(0.0, 1.0, 0.0), aRandom * ( locprog) * 3.14 * 1. );
				 
				`
			
			},
			 
			uniforms: {
			 roughness: 0.75,
				time: {
					mixed: true,    // Uniform will be passed to a derivative material (MeshDepthMaterial below)
					linked: true,   // Similar as shared, but only for derivative materials, so wavingMaterial will have it's own, but share with it's shadow material
					value: 0
				},
				progress: {
					mixed: true,    // Uniform will be passed to a derivative material (MeshDepthMaterial below)
					linked: true,   // Similar as shared, but only for derivative materials, so wavingMaterial will have it's own, but share with it's shadow material
					value: 0
				},
			}
		
		} );
		

		this.material2.uniforms.diffuse.value = new THREE.Color(0xff0000)
		

		this.gltf.load(dancer, gltf => {
			this.dancer =  

			this.objects = [gltf.scene.getObjectByName('Object_4'), gltf.scene.getObjectByName('Object_5')]
			
			
			
			this.objects.forEach(o => {
				let s = 0.005
				o.scale.set(s,s,s)
			//this.dancer.material = new THREE.MeshBasicMaterial({color: 0xff0000})
			
			this.scene.add(o)
			o.castShadow = true

		
			o.customDepthMaterial = THREE.extendMaterial( THREE.MeshDepthMaterial, {

				template: this.material2
			
			} );

			let geometry = o.geometry.toNonIndexed()
			o.geometry = geometry.toNonIndexed()
			o.material = this.material2

		let len = geometry.attributes.position.count

		let randoms = new Float32Array(len ),
			centers = new Float32Array(len * 3)
		for (let i = 0; i < len; i += 3 ) {
			let r = Math.random()
			randoms[i] = r
			randoms[i + 1] = r
			randoms[i + 2] = r


			let x = this.geometry.attributes.position.array[i * 3]
			let y = this.geometry.attributes.position.array[i * 3 + 1]
			let z = this.geometry.attributes.position.array[i * 3 + 2]



			let x1 = this.geometry.attributes.position.array[i * 3 + 3]
			let y1 = this.geometry.attributes.position.array[i * 3 + 4]
			let z1 = this.geometry.attributes.position.array[i * 3 + 5]
			let x2 = this.geometry.attributes.position.array[i * 3 + 6]
			let y2 = this.geometry.attributes.position.array[i * 3 + 7]
			let z2 = this.geometry.attributes.position.array[i * 3 + 8]


			let center = new THREE.Vector3(x, y,z).add(new THREE.Vector3(x1, y1, z1))
			.add(new THREE.Vector3(x2, y2, z2)).divideScalar(3)


			centers.set([center.x, center.y, center.z], i * 3)
			centers.set([center.x, center.y, center.z], (i + 1) * 3)
			centers.set([center.x, center.y, center.z], (i + 2) * 3)
		}


		geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))

		geometry.setAttribute('aCenter', new THREE.BufferAttribute(centers, 1))

		this.plane = new THREE.Mesh(this.geometry, this.material2)
		
		this.plane.customDepthMaterial = THREE.extendMaterial( THREE.MeshDepthMaterial, {

			template: this.material2
		
		} );
		this.plane.castShadow = this.plane.receiveShadow = true
			})
			
			 
			
			
			
		 
		})

 





		// this.scene.add(this.plane)
 
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.8)
		this.scene.add(light1)
	
	
		const light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 3, 0.3)
		light.position.set(0, 2, 2)
		light.target.position.set(0,0,0)

		light.castShadow = true
		light.shadow.camera.near = 0.1
		light.shadow.camera.far = 9
		light.shadow.bias = 0.0001

		light.shadow.mapSize.width = 2048
		light.shadow.mapSize.height = 2048

		this.scene.add(light)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.04
		this.material.uniforms.time.value = this.time
		this.material2.uniforms.time.value = this.time
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 