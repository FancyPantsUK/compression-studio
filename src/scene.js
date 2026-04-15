import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { gsap } from 'gsap'
import earthVertexShader      from './shaders/earth/vertex.glsl'
import earthFragmentShader    from './shaders/earth/fragment.glsl'
import atmosphereVertexShader from './shaders/atmosphere/vertex.glsl'
import atmosphereFragmentShader from './shaders/atmosphere/fragment.glsl'

/**
 * Loaders
 */
const loadingBarElement = document.querySelector('.loading-bar')

let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    () => {
        window.setTimeout(() => {
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)
        window.setTimeout(() => { sceneReady = true }, 2000)
    },
    (itemUrl, itemsLoaded, itemsTotal) => {
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)
const textureLoader = new THREE.TextureLoader(loadingManager)

/**
 * Base
 */
const debugObject = {}
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uAlpha: { value: 1 } },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Earth
 */
const earthDayTexture = textureLoader.load('/earth/day.jpg')
earthDayTexture.colorSpace = THREE.SRGBColorSpace
earthDayTexture.anisotropy  = 8

const earthNightTexture = textureLoader.load('/earth/night.jpg')
earthNightTexture.colorSpace = THREE.SRGBColorSpace
earthNightTexture.anisotropy  = 8

const earthSpecularCloudsTexture = textureLoader.load('/earth/specularClouds.jpg')
earthSpecularCloudsTexture.anisotropy = 8

const earthGeometry = new THREE.SphereGeometry(2, 64, 64)

const earthMaterial = new THREE.ShaderMaterial({
    vertexShader:   earthVertexShader,
    fragmentShader: earthFragmentShader,
    uniforms: {
        uDayTexture:              new THREE.Uniform(earthDayTexture),
        uNightTexture:            new THREE.Uniform(earthNightTexture),
        uSpecularCloudsTexture:   new THREE.Uniform(earthSpecularCloudsTexture),
        uSunDirection:            new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor:      new THREE.Uniform(new THREE.Color('#00aaff')),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color('#ff6600')),
    }
})
export const earth = new THREE.Mesh(earthGeometry, earthMaterial)
scene.add(earth)

const atmosphereMaterial = new THREE.ShaderMaterial({
    side:        THREE.BackSide,
    transparent: true,
    vertexShader:   atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
        uSunDirection:            new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor:      new THREE.Uniform(new THREE.Color('#00aaff')),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color('#ff6600')),
    }
})
const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial)
atmosphere.scale.set(1.04, 1.04, 1.04)
atmosphere.raycast = () => {}
scene.add(atmosphere)

// Sun direction
const sunSpherical = new THREE.Spherical(1, Math.PI * 0.233, Math.PI * 0.8)
const sunDirection  = new THREE.Vector3()
const updateSun = () => {
    sunDirection.setFromSpherical(sunSpherical)
    earthMaterial.uniforms.uSunDirection.value.copy(sunDirection)
    atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection)
}
updateSun()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4.5, 1.35, - 4.5)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 3.5
controls.maxDistance = 12

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Scene points + animate
 */
const raycaster = new THREE.Raycaster()
const clock = new THREE.Clock()

export const initScene = (POINTS) => {
    const scenePoints = POINTS.map(cfg => ({
        position: cfg.position,
        element: document.querySelector(`.point-${cfg.idx}`)
    }))

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        // Slowly rotate Earth
        earth.rotation.y = elapsedTime * 0.05

        // Update controls
        controls.update()

        // Update points only when the scene is ready
        if(sceneReady) {
            for(const point of scenePoints) {
                const screenPosition = point.position.clone()
                screenPosition.project(camera)

                raycaster.setFromCamera(screenPosition, camera)
                const intersects = raycaster.intersectObject(earth, false)

                if(intersects.length === 0) {
                    point.element.classList.add('visible')
                } else {
                    const intersectionDistance = intersects[0].distance
                    const pointDistance = point.position.distanceTo(camera.position)

                    if(intersectionDistance < pointDistance) {
                        point.element.classList.remove('visible')
                    } else {
                        point.element.classList.add('visible')
                    }
                }

                const translateX = screenPosition.x * sizes.width * 0.5
                const translateY = - screenPosition.y * sizes.height * 0.5
                point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
            }
        }

        renderer.render(scene, camera)
        window.requestAnimationFrame(tick)
    }

    tick()
}
