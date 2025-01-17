import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import stageUrl from '../public/squidoon_stage.glb?url';

function createGridTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const smallGridSize = size / 80; // 80x80の細かいグリッド
  ctx.strokeStyle = 'rgba(74, 144, 226, 0.3)';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= size; x += smallGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  for (let y = 0; y <= size; y += smallGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const mainGridSize = size / 16;
  ctx.strokeStyle = 'rgba(74, 144, 226, 0.9)';
  ctx.lineWidth = 2;

  for (let x = 0; x <= size; x += mainGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  for (let y = 0; y <= size; y += mainGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createCubeGridTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const smallGridSize = size / 80;
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.2)';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= size; x += smallGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  for (let y = 0; y <= size; y += smallGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const mainGridSize = size / 16;
  ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
  ctx.lineWidth = 2;

  for (let x = 0; x <= size; x += mainGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  for (let y = 0; y <= size; y += mainGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Physics settings
const gravity = new THREE.Vector3(0, -15, 0);
const spheres: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];
const sphereSpeed = 15;
const deleteHeight = -5;

// Collision objects
let collisionObjects: THREE.Mesh[] = [];

// Raycaster for collision detection
const raycaster = new THREE.Raycaster();

// Sphere creation settings
const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0xff5500,
  roughness: 1,
});

// Shoot function
function shootSphere() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  sphere.position.copy(camera.position);
  sphere.position.y -= 0.25;
  sphere.position.add(direction.multiplyScalar(1));

  const velocity = direction.multiplyScalar(sphereSpeed);

  scene.add(sphere);
  spheres.push({ mesh: sphere, velocity: velocity });
}

function drawImpactCircle(texture: THREE.CanvasTexture, uv: THREE.Vector2) {
  const canvas = texture.image;
  const ctx = canvas.getContext('2d')!;

  const x = uv.x * canvas.width;
  const y = (1 - uv.y) * canvas.height;

  const mainRadius = 50;
  ctx.beginPath();
  ctx.arc(x, y, mainRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 60, 0, 1)';
  ctx.fill();

  const splatCount = 12;
  for (let i = 0; i < splatCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 50 + mainRadius;

    const splatX = x + Math.cos(angle) * distance;
    const splatY = y + Math.sin(angle) * distance;

    const splatRadius = Math.random() * 15 + 5;

    ctx.beginPath();
    ctx.arc(splatX, splatY, splatRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 60, 0, 1)';
    ctx.fill();

    if (Math.random() < 0.5) {
      const dropletAngle = angle + (Math.random() - 0.5);
      const dropletDistance = distance + Math.random() * 10;
      const dropletX = x + Math.cos(dropletAngle) * dropletDistance;
      const dropletY = y + Math.sin(dropletAngle) * dropletDistance;

      ctx.beginPath();
      ctx.arc(dropletX, dropletY, Math.random() * 3 + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 60, 0, 1)';
      ctx.fill();
    }
  }

  texture.needsUpdate = true;
}

function updateSpheres(deltaTime: number) {
  const removeIndices: number[] = [];

  spheres.forEach((sphere, index) => {
    const oldPosition = sphere.mesh.position.clone();

    sphere.velocity.add(gravity.clone().multiplyScalar(deltaTime));

    const movement = sphere.velocity.clone().multiplyScalar(deltaTime);
    sphere.mesh.position.add(movement);

    raycaster.set(oldPosition, movement.normalize());
    const intersects = raycaster.intersectObjects(collisionObjects);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.distance < movement.length()) {
        console.log('Hit object:', hit.object.name);

        if (hit.uv) {
          console.log('UV coordinates:', hit.uv);

          const hitMesh = hit.object as THREE.Mesh;
          const material = hitMesh.material as THREE.MeshStandardMaterial;
          if (material.map) {
            drawImpactCircle(material.map as THREE.CanvasTexture, hit.uv);
          }
        }

        removeIndices.push(index);
      }
    }

    if (sphere.mesh.position.y < deleteHeight) {
      removeIndices.push(index);
    }
  });

  const uniqueIndices = Array.from(new Set(removeIndices)).sort((a, b) => b - a);

  uniqueIndices.forEach(index => {
    scene.remove(spheres[index].mesh);
    spheres.splice(index, 1);
  });
}

const cameraSpeed = 0.15;
const keysPressed: { [key: string]: boolean } = {};

window.addEventListener('keydown', (event) => {
  keysPressed[event.key.toLowerCase()] = true;

  if (event.code === 'Space') {
    shootSphere();
  }
});

window.addEventListener('keyup', (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.5;

controls.enableZoom = false;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI;
controls.minPolarAngle = 0;

function updateCameraTarget() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.multiplyScalar(1);
  controls.target.copy(camera.position).add(direction);
}

function updateCamera() {
  const moveSpeed = cameraSpeed;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const moveDirection = new THREE.Vector3();

  if (keysPressed['w']) {
    moveDirection.add(forward);
  }
  if (keysPressed['s']) {
    moveDirection.sub(forward);
  }
  if (keysPressed['a']) {
    moveDirection.sub(right);
  }
  if (keysPressed['d']) {
    moveDirection.add(right);
  }

  if (moveDirection.length() > 0) {
    moveDirection.normalize();
    const movement = moveDirection.multiplyScalar(moveSpeed);
    camera.position.add(movement);
    updateCameraTarget();
  }
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app')!.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const floorTexture = createGridTexture();
floorTexture.wrapS = THREE.ClampToEdgeWrapping;
floorTexture.wrapT = THREE.ClampToEdgeWrapping;

const cubeTexture = createCubeGridTexture();
cubeTexture.wrapS = THREE.ClampToEdgeWrapping;
cubeTexture.wrapT = THREE.ClampToEdgeWrapping;

const loader = new GLTFLoader();
loader.load(
  stageUrl,
  (gltf: GLTF) => {
    console.log('Model loaded successfully:', gltf);

    // Log all mesh names in the model
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        console.log('Found mesh:', child.name);
        // 衝突判定用オブジェクトに追加
        if (child.name === 'Plane' || child.name === 'Cube') {
          collisionObjects.push(child);
        }
      }
    });

    // Example of targeting specific meshes by name
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 床
        if (child.name === 'Plane') {
          child.material = new THREE.MeshStandardMaterial({
            map: floorTexture,
            metalness: 0.2,
            roughness: 0.6,
          });
        }
        // キューブ
        else if (child.name === 'Cube') {
          child.material = new THREE.MeshStandardMaterial({
            map: cubeTexture,
            metalness: 0.3,
            roughness: 0.4,
          });
        }
      }
    });

    scene.add(gltf.scene);

    // Adjust camera position based on model size
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    console.log('Model size:', size);
    console.log('Model center:', center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = maxDim / (4 * Math.tan(fov / 2));

    camera.position.copy(center);
    camera.position.y = 2; // キャラクターの目線の高さに設定
    camera.position.z += cameraDistance * 1.1;
    camera.lookAt(center);
    controls.target.copy(center);

    updateCameraTarget();

  },
  (progress: { loaded: number; total: number }) => {
    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
  },
  (error: unknown) => {
    console.error('Error loading model:', error);
  }
);

// Animation loop
let lastTime = 0;
function animate(currentTime: number = 0) {
  const deltaTime = (currentTime - lastTime) / 1000; // 秒単位のデルタタイム
  lastTime = currentTime;

  requestAnimationFrame(animate);
  updateCamera();
  updateSpheres(deltaTime);
  controls.update();
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// Clear all paint function
function clearAllPaint() {
  collisionObjects.forEach(object => {
    const material = object.material as THREE.MeshStandardMaterial;
    if (material.map) {
      if (object.name === 'Plane') {
        material.map = createGridTexture();
      } else if (object.name === 'Cube') {
        material.map = createCubeGridTexture();
      }

      material.map.needsUpdate = true;
    }
  });

  // クリア後にボタンからフォーカスを外す
  const clearButton = document.querySelector('.clear-button') as HTMLButtonElement;
  clearButton?.blur();
}

// Add clear button event listener
document.querySelector('.clear-button')?.addEventListener('click', clearAllPaint);

animate();
