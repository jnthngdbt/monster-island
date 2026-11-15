import * as THREE from 'three';
import { PALETTE } from '../data/palette';

export type RenderContext = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
};

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 90, 260);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

  const hemi = new THREE.HemisphereLight('#ffffff', '#5c8a3a', 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff4d6', 1.8);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera;
  s.left = -30;
  s.right = 30;
  s.top = 30;
  s.bottom = -30;
  s.near = 1;
  s.far = 200;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, sun, hemi };
}
