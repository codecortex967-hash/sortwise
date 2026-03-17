import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Unified Configuration ---
const CONFIG = {
    fillLevels: { plastic: 0, metal: 0, paper: 0, glass: 0, organic: 0 },
    colors: {
        plastic: '#3b82f6', metal: '#64748b', paper: '#eab308', 
        glass: '#06b6d4', organic: '#22c55e', idle: '#7A958F'
    },
    xOffsets: [-2.4, -1.2, 0, 1.2, 2.4],
    categories: ['plastic', 'metal', 'paper', 'glass', 'organic']
};

let isProcessing = false;
let scene, camera, renderer, controls;
let binGroup, compartments = {}, lidPivots = {};
let activeWaste = [];

// --- Initialize 3D Scene ---
function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF2E7DD);
    scene.fog = new THREE.Fog(0xF2E7DD, 10, 50);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Bin Model
    binGroup = new THREE.Group();
    scene.add(binGroup);

    // Outer Container
    const outerGeo = new THREE.BoxGeometry(6.2, 7, 4.2);
    const outerMat = new THREE.MeshPhysicalMaterial({
        color: 0xcccccc, transparent: true, opacity: 0.15, roughness: 0.1, transmission: 0.5, thickness: 1.0
    });
    const outerBin = new THREE.Mesh(outerGeo, outerMat);
    outerBin.position.y = 3.5;
    binGroup.add(outerBin);

    // Compartments
    CONFIG.categories.forEach((cat, i) => {
        // Fill Mesh
        const fillMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors[cat] });
        const fillGeo = new THREE.BoxGeometry(1, 1, 3.8);
        const fillMesh = new THREE.Mesh(fillGeo, fillMat);
        fillMesh.position.set(CONFIG.xOffsets[i], 0.1, 0);
        fillMesh.scale.y = 0.01;
        binGroup.add(fillMesh);
        compartments[cat] = fillMesh;

        // Lid Hinge
        const pivot = new THREE.Group();
        pivot.position.set(CONFIG.xOffsets[i], 7, -2);
        binGroup.add(pivot);
        lidPivots[cat] = pivot;

        const lidGeo = new THREE.BoxGeometry(1.15, 0.1, 4);
        const lidMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors[cat], roughness: 0.3, metalness: 0.6 });
        const lidMesh = new THREE.Mesh(lidGeo, lidMat);
        lidMesh.position.z = 2;
        pivot.add(lidMesh);

        // Dividers
        if (i < 4) {
            const wallGeo = new THREE.BoxGeometry(0.1, 7, 3.8);
            const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
            wall.position.set(CONFIG.xOffsets[i] + 0.6, 3.5, 0);
            binGroup.add(wall);
        }
    });
}

// --- Sync Simulation Logic ---

window.runSyncSimulation = async function(type) {
    if (isProcessing) return;
    if (CONFIG.fillLevels[type] >= 100) {
        showWarning(`${type.toUpperCase()} BIN FULL!`);
        return;
    }

    isProcessing = true;
    updateStatus('PROCESSING', 'orange');
    updateLog(`Drop detected: Activating sensors...`);

    // 1. Sensor to Process Step
    await highlightStep('card-sensor', 'path-1');
    
    // 2. Imaging
    updateLog(`Vision System: Capturing sample...`);
    await highlightStep('card-camera', 'path-2');
    gsap.to('#canvas-container', { opacity: 0.7, duration: 0.1, yoyo: true, repeat: 1 });

    // 3. AI Processor
    updateLog(`AI Processor: Running classification...`);
    highlightHardware('card-pi', true);
    await delay(1200);
    
    // Result Telemetry
    document.getElementById('tel-class').innerText = type.toUpperCase();
    document.getElementById('tel-conf').innerText = `${Math.floor(Math.random() * 15) + 84}%`;
    await highlightArrow('path-3');
    highlightHardware('card-pi', false);

    // 4. Actuation
    updateLog(`Opening ${type.toUpperCase()} compartment...`);
    highlightHardware('card-servo', true);
    highlightHardware('card-wifi', true); // Cloud Sync happens in parallel
    
    // Open Lid in 3D
    const pivot = lidPivots[type];
    pivot.targetRotation = -Math.PI / 1.5;
    
    // Spawn 3D Object
    spawn3DObject(type);
    await delay(1000);
    await highlightArrow('path-4');
    highlightHardware('card-servo', false);
    highlightHardware('card-wifi', false);

    // 5. Analytics & Indicators
    updateLog(`Monitoring capacity & LED status...`);
    highlightHardware('card-fill', true);
    highlightHardware('card-led', true);
    updateFillLevels(type);
    await delay(1000);
    highlightHardware('card-fill', false);
    highlightHardware('card-led', false);

    // Close Lid
    pivot.targetRotation = 0;
    
    // Reset State
    updateStatus('IDLE', 'cyan');
    updateLog(`Cycle complete. System IDLE.`);
    isProcessing = false;
};

// --- Helper Functions ---

async function highlightStep(cardId, arrowId) {
    highlightHardware(cardId, true);
    await delay(600);
    highlightHardware(cardId, false);
    if (arrowId) await highlightArrow(arrowId);
}

async function highlightArrow(id) {
    const arrow = document.getElementById(id);
    if (arrow) {
        arrow.classList.add('active');
        await delay(400);
        arrow.classList.remove('active');
    }
}
function updateLog(msg) {
    document.getElementById('log-content').innerHTML = `> ${msg}`;
}

function updateStatus(text, colorClass) {
    const pill = document.getElementById('master-status-pill');
    pill.innerText = text;
    // Simple state indicator logic
}

function highlightHardware(id, active) {
    const el = document.getElementById(id);
    if (active) el.classList.add('active');
    else el.classList.remove('active');
}

async function animateDataPulse(pathId) {
    const path = document.getElementById(pathId);
    const pulse = document.getElementById('pulse');
    path.classList.add('active');
    pulse.classList.remove('hidden');

    await new Promise(resolve => {
        gsap.to(pulse, {
            duration: 0.6,
            motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5] },
            onComplete: () => {
                pulse.classList.add('hidden');
                path.classList.remove('active');
                resolve();
            }
        });
    });
}

function spawn3DObject(type) {
    let geo;
    if (type === 'organic') geo = new THREE.SphereGeometry(0.4);
    else if (type === 'glass') geo = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 12);
    else geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: CONFIG.colors[type] }));
    const xPos = CONFIG.xOffsets[CONFIG.categories.indexOf(type)] + (Math.random() - 0.5) * 0.2;
    mesh.position.set(xPos, 12, 0);
    mesh.castShadow = true;
    scene.add(mesh);

    activeWaste.push({
        mesh: mesh,
        velocity: 0,
        targetY: 0.2 + (CONFIG.fillLevels[type] / 100) * 6.5
    });
}

function updateFillLevels(type) {
    CONFIG.fillLevels[type] += 10;
    const lv = CONFIG.fillLevels[type];
    
    // UI HUD
    document.getElementById(`f-${type}`).style.width = `${lv}%`;
    
    // 3D Visual
    const fillMesh = compartments[type];
    fillMesh.scale.y = (lv / 100) * 6.8;
    fillMesh.position.y = (lv / 100) * 3.4 + 0.1;

    if (lv === 80) showWarning(`${type.toUpperCase()} COMPARTMENT ALMOST FULL!`);
}

function showWarning(msg) {
    document.getElementById('warning-text').innerText = msg;
    document.getElementById('warning-popup').classList.remove('hidden');
}

window.resetUnified = function() {
    if (isProcessing) return;
    activeWaste.forEach(w => scene.remove(w.mesh));
    activeWaste = [];
    
    CONFIG.categories.forEach(cat => {
        CONFIG.fillLevels[cat] = 0;
        document.getElementById(`f-${cat}`).style.width = '0%';
        compartments[cat].scale.y = 0.01;
        compartments[cat].position.y = 0.1;
    });

    document.getElementById('tel-class').innerText = '---';
    document.getElementById('tel-conf').innerText = '--%';
    updateLog('System reset successful.');
};

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Smooth Lid Animation
    CONFIG.categories.forEach(cat => {
        const pivot = lidPivots[cat];
        if (pivot.targetRotation !== undefined) {
            pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, pivot.targetRotation, 0.1);
        }
    });

    // Physics
    for (let i = activeWaste.length - 1; i >= 0; i--) {
        const w = activeWaste[i];
        if (w.mesh.position.y > w.targetY) {
            w.velocity += 0.02;
            w.mesh.position.y -= w.velocity;
            w.mesh.rotation.x += 0.05;
        } else {
            w.mesh.position.y = w.targetY;
        }
    }

    renderer.render(scene, camera);
}

// Start everything
init3D();
animate();

window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

const delay = ms => new Promise(res => setTimeout(res, ms));
