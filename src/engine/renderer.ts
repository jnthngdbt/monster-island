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
  // Compresse les hautes lumières au lieu de les saturer, sans délaver la palette.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 90, 260);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

  // Ciel bleuté d'en haut, rebond chaud du sol : les ombres sont froides, pas grises.
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#b0a890', 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#ffe9c4', 2.2);
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
