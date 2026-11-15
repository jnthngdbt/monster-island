import * as THREE from 'three';
import { GAME_TITLE } from './data/meta';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight('#ffffff', '#6cc24a', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 1.5);
sun.position.set(3, 5, 2);
scene.add(sun);

const cube = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.MeshStandardMaterial({ color: '#7be07b', flatShading: true }),
);
scene.add(cube);

const title = document.createElement('h1');
title.textContent = GAME_TITLE;
title.style.cssText = 'margin:24px;font-family:system-ui,sans-serif;color:#fff;text-shadow:0 3px 0 #2a6;';
ui.appendChild(title);

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  cube.rotation.y = t / 1000;
  cube.rotation.x = t / 2000;
  renderer.render(scene, camera);
});
