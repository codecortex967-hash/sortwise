const CONFIG = {
    fillLevels: {
        plastic: 0,
        metal: 0,
        paper: 0,
        glass: 0,
        organic: 0
    },
    colors: {
        plastic: '#0088ff',
        metal: '#888888',
        paper: '#ffd700',
        glass: '#00d4ff',
        organic: '#44cc44',
        idle: '#00f2ff',
        error: '#ff4444'
    }
};

let isProcessing = false;

// --- Simulation Logic ---

function updateLog(message) {
    const log = document.getElementById('log-content');
    log.innerHTML = `> ${message}`;
}

function highlightCard(id, active = true) {
    const card = document.getElementById(id);
    if (active) {
        card.classList.add('active');
        card.querySelector('.status').innerText = 'OPERATING...';
    } else {
        card.classList.remove('active');
        card.querySelector('.status').innerText = 'IDLE';
    }
}

function animatePulse(pathId) {
    const path = document.getElementById(pathId);
    const pulse = document.getElementById('pulse');
    
    path.classList.add('active');
    pulse.classList.remove('hidden');

    gsap.to(pulse, {
        duration: 0.8,
        motionPath: {
            path: path,
            align: path,
            alignOrigin: [0.5, 0.5]
        },
        ease: "power2.inOut",
        onComplete: () => {
            pulse.classList.add('hidden');
            path.classList.remove('active');
        }
    });
}

window.simulateDrop = async function(type) {
    if (isProcessing) return;
    
    // Check if bin is full
    if (CONFIG.fillLevels[type] >= 100) {
        showAlert(`${type.toUpperCase()} COMPARTMENT FULL!`);
        return;
    }

    isProcessing = true;
    updateLog(`Object detected. Initializing Hardware Flow...`);
    
    // 1. Ultrasonic Activation
    highlightCard('card-sensor', true);
    document.getElementById('system-led').style.background = '#ffd700'; // Yellow sensing
    await delay(1000);
    animatePulse('path-sensor-pi');
    await delay(800);
    highlightCard('card-sensor', false);

    // 2. Camera Trigger
    updateLog(`Hardware Flow: Capturing waste high-res image...`);
    highlightCard('card-camera', true);
    await delay(500);
    // Camera Flash effect
    gsap.to('.blueprint-canvas', { backgroundColor: 'rgba(255,255,255,0.2)', duration: 0.1, yoyo: true, repeat: 1 });
    animatePulse('path-camera-pi');
    await delay(800);
    highlightCard('card-camera', false);

    // 3. AI Processing (Pi)
    updateLog(`Hardware Flow: Processing YOLOv8 Neural Network...`);
    highlightCard('card-pi', true);
    await delay(1500);
    
    // Finalizing Telemetry
    document.getElementById('tel-class').innerText = type.toUpperCase();
    const conf = Math.floor(Math.random() * 15) + 84;
    document.getElementById('tel-conf').innerText = `${conf}%`;
    highlightCard('card-pi', false);

    // 4. Actuation (Servo)
    updateLog(`Hardware Flow: Command sent to Servo [Segregation Flip]...`);
    animatePulse('path-pi-servo');
    await delay(800);
    highlightCard('card-servo', true);
    document.getElementById('system-led').style.background = CONFIG.colors[type];
    await delay(1000);
    highlightCard('card-servo', false);

    // 5. Monitoring (Fill Sensors)
    updateLog(`Hardware Flow: Updating bin capacity telemetry...`);
    animatePulse('path-pi-fill');
    await delay(800);
    highlightCard('card-fill', true);
    
    // Update logic
    CONFIG.fillLevels[type] += 10;
    document.getElementById(`bar-${type}`).style.width = `${CONFIG.fillLevels[type]}%`;
    await delay(1000);
    highlightCard('card-fill', false);

    // 6. Data Communication
    updateLog(`Hardware Flow: Synching local data to cloud dashboard...`);
    animatePulse('path-pi-led');
    await delay(800);
    highlightCard('card-led', true);
    await delay(1000);
    highlightCard('card-led', false);

    // Final State
    updateLog(`Cycle Complete. System IDLE.`);
    document.getElementById('system-led').style.background = '#00f2ff';
    isProcessing = false;
    
    if (CONFIG.fillLevels[type] === 80) {
        showAlert(`${type.toUpperCase()} compartment almost full - Collection required.`);
    }
};

window.resetSimulation = function() {
    if (isProcessing) return;
    
    // Reset Data
    Object.keys(CONFIG.fillLevels).forEach(key => {
        CONFIG.fillLevels[key] = 0;
        const bar = document.getElementById(`bar-${key}`);
        if (bar) bar.style.width = '0%';
    });

    // Reset UI
    document.getElementById('tel-class').innerText = 'Awaiting...';
    document.getElementById('tel-conf').innerText = '--%';
    document.getElementById('system-led').style.background = CONFIG.colors.idle;
    
    updateLog('System Memory Cleared. Awaiting waste input...');
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showAlert(msg) {
    document.getElementById('alert-msg').innerText = msg;
    document.getElementById('alert-overlay').classList.remove('hidden');
}

window.closeAlert = function() {
    document.getElementById('alert-overlay').classList.add('hidden');
};

// Tooltip initialization or hover effects can be added here
const cards = document.querySelectorAll('.comp-card');
cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        if (!isProcessing) {
            updateLog(`Selected Component: ${card.querySelector('.label').innerText}`);
        }
    });
});
