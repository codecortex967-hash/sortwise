import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const COLORS = {
    bin: 0x2c3e50,
    plastic: 0x0088ff,
    metal: 0x888888,
    paper: 0xffd700,
    glass: 0x00d4ff,
    organic: 0x44cc44,
    ground: 0x1a1a24
};

const FILL_STATE = {
    plastic: 0,
    metal: 0,
    paper: 0,
    glass: 0,
    organic: 0
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f13);
scene.fog = new THREE.Fog(0x0f0f13, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 30;
controls.minDistance = 5;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// --- Environment ---
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshPhongMaterial({ color: COLORS.ground });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid Helper
const grid = new THREE.GridHelper(100, 40, 0x444455, 0x222233);
scene.add(grid);

// --- Bin Model ---
const binGroup = new THREE.Group();
scene.add(binGroup);

// Outer Container
const outerGeo = new THREE.BoxGeometry(6.2, 7, 4.2);
const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    transmission: 0.5,
    thickness: 1.0
});
const outerBin = new THREE.Mesh(outerGeo, outerMat);
outerBin.position.y = 3.5;
binGroup.add(outerBin);

// Compartments
const compartments = {};
const lidPivots = {};

const categoryList = ['plastic', 'metal', 'paper', 'glass', 'organic'];
const xOffsets = [-2.4, -1.2, 0, 1.2, 2.4];

categoryList.forEach((cat, i) => {
    // Fill Visual
    const fillMat = new THREE.MeshStandardMaterial({ color: COLORS[cat] });
    const fillGeo = new THREE.BoxGeometry(1, 1, 3.8);
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.position.set(xOffsets[i], 0.1, 0);
    fillMesh.scale.y = 0.01;
    binGroup.add(fillMesh);
    compartments[cat] = fillMesh;

    // Lid Pivot Group
    const lidPivot = new THREE.Group();
    lidPivot.position.set(xOffsets[i], 7, -2);
    binGroup.add(lidPivot);
    lidPivots[cat] = lidPivot;

    const lidGeo = new THREE.BoxGeometry(1.15, 0.1, 4);
    const lidMat = new THREE.MeshStandardMaterial({ color: COLORS[cat], roughness: 0.3, metalness: 0.6 });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.z = 2; // Offset from pivot
    lidPivot.add(lidMesh);
    
    // Internal Dividers
    if (i < 4) {
        const wallGeo = new THREE.BoxGeometry(0.1, 7, 3.8);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(xOffsets[i] + 0.6, 3.5, 0);
        binGroup.add(wall);
    }
});

// --- Simulation Functions ---
let activeWaste = [];

window.spawnWaste = function(type) {
    if (FILL_STATE[type] >= 100) {
        document.getElementById('status-message').innerText = `${type.toUpperCase()} BIN FULL!`;
        return;
    }

    const status = document.getElementById('status-message');
    status.innerText = `Scanning item: ${type.toUpperCase()}...`;
    
    // Simulate AI detection delay
    setTimeout(() => {
        openLid(type);
        
        let wasteGeo;
        if (type === 'organic') {
            wasteGeo = new THREE.SphereGeometry(0.4);
        } else if (type === 'glass') {
            wasteGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 12);
        } else {
            wasteGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        }

        const wasteMat = new THREE.MeshStandardMaterial({ color: COLORS[type] });
        const piece = new THREE.Mesh(wasteGeo, wasteMat);
        
        const xPos = xOffsets[categoryList.indexOf(type)] + (Math.random() - 0.5) * 0.2;
        piece.position.set(xPos, 12, 0);
        piece.castShadow = true;
        scene.add(piece);
        
        activeWaste.push({
            mesh: piece,
            velocity: 0,
            type: type,
            targetY: 0.2 + (FILL_STATE[type] / 100) * 6.5
        });

        status.innerText = `Segregating ${type.toUpperCase()}...`;
        
        // Update fill logic
        updateFill(type);
    }, 800);
};

function openLid(type) {
    const pivot = lidPivots[type];
    pivot.targetRotation = -Math.PI / 1.5;
    setTimeout(() => {
        pivot.targetRotation = 0;
    }, 1500);
}

function updateFill(type) {
    FILL_STATE[type] += 10;
    if (FILL_STATE[type] > 100) FILL_STATE[type] = 100;
    
    const level = FILL_STATE[type];
    
    // UI Update
    document.getElementById(`fill-${type}`).style.width = level + '%';
    document.getElementById(`label-${type}`).innerText = level + '%';
    
    // Visual Fill Update
    const fillMesh = compartments[type];
    fillMesh.scale.y = (level / 100) * 6.8;
    fillMesh.position.y = (level / 100) * 3.4 + 0.1;
    
    if (level === 80) {
        const popup = document.getElementById('warning-popup');
        document.getElementById('warning-text').innerText = `${type.toUpperCase()} COMPARTMENT ALMOST FULL!`;
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('hidden'), 3000);
    }
}

window.resetSimulation = function() {
    activeWaste.forEach(w => scene.remove(w.mesh));
    activeWaste = [];
    
    categoryList.forEach(cat => {
        FILL_STATE[cat] = 0;
        document.getElementById(`fill-${cat}`).style.width = '0%';
        document.getElementById(`label-${cat}`).innerText = '0%';
        compartments[cat].scale.y = 1;
        compartments[cat].position.y = 0.1;
    });
    
    document.getElementById('status-message').innerText = "Simulation Reset.";
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Animation Lids
    categoryList.forEach(cat => {
        const pivot = lidPivots[cat];
        if (pivot.targetRotation !== undefined) {
            pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, pivot.targetRotation, 0.1);
        }
    });
    
    // Animate Falling Waste
    for (let i = activeWaste.length - 1; i >= 0; i--) {
        const w = activeWaste[i];
        if (w.mesh.position.y > w.targetY) {
            w.velocity += 0.02; // gravity
            w.mesh.position.y -= w.velocity;
            w.mesh.rotation.x += 0.05;
            w.mesh.rotation.z += 0.03;
        } else {
            w.mesh.position.y = w.targetY;
            // Optionally remove from tracking but keep in scene
        }
    }
    
    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
