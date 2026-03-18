// Configuration
const SERVER_URL = 'http://10.200.204.165:3000'; // Change this to your server IP
const CALL_TYPE = 'nurse'; // Filter for nurse calls only
const CALL_TTL_MS = 5 * 60 * 1000; // Auto-remove card after 5 minutes

// Initialize Socket.IO connection
const socket = io(SERVER_URL);

// State
let allCalls = [];
let nurseCalls = [];
let currentCarouselIndex = 0;
let carouselInterval = null;
let audioEnabled = false;
let audioContext = null;
let soundQueue = []; // Queue sounds if audio not ready yet
const callExpiryTimers = new Map();

function getDoctorKey(callOrId) {
    if (callOrId && typeof callOrId === 'object') {
        if (callOrId.doctorId !== undefined && callOrId.doctorId !== null) {
            return String(callOrId.doctorId);
        }
        if (callOrId.id !== undefined && callOrId.id !== null) {
            return String(callOrId.id).replace(/^doctor-/, '');
        }
        return '';
    }

    return String(callOrId).replace(/^doctor-/, '');
}

function dedupeCallsByDoctor(calls) {
    const byDoctor = new Map();

    calls.forEach(call => {
        const doctorKey = getDoctorKey(call);
        if (!doctorKey) return;

        const existing = byDoctor.get(doctorKey);
        if (!existing) {
            byDoctor.set(doctorKey, call);
            return;
        }

        const existingTime = new Date(existing.updatedAt || existing.timestamp || 0).getTime();
        const incomingTime = new Date(call.updatedAt || call.timestamp || 0).getTime();
        if (incomingTime >= existingTime) {
            byDoctor.set(doctorKey, call);
        }
    });

    return Array.from(byDoctor.values());
}

function isCallExpired(call) {
    const callTime = new Date(call.timestamp).getTime();
    if (Number.isNaN(callTime)) return false;
    return (Date.now() - callTime) >= CALL_TTL_MS;
}

function pruneExpiredCalls(calls) {
    return calls.filter(call => !isCallExpired(call));
}

function clearCallExpiryTimer(doctorKey) {
    const timerId = callExpiryTimers.get(doctorKey);
    if (timerId) {
        clearTimeout(timerId);
        callExpiryTimers.delete(doctorKey);
    }
}

function scheduleCallExpiry(call) {
    const doctorKey = getDoctorKey(call);
    if (!doctorKey) return;

    clearCallExpiryTimer(doctorKey);

    const callTime = new Date(call.timestamp).getTime();
    if (Number.isNaN(callTime)) return;

    const remainingMs = CALL_TTL_MS - (Date.now() - callTime);

    if (remainingMs <= 0) {
        allCalls = allCalls.filter(existingCall => getDoctorKey(existingCall) !== doctorKey);
        filterAndRenderCalls();
        return;
    }

    const timerId = setTimeout(() => {
        allCalls = allCalls.filter(existingCall => getDoctorKey(existingCall) !== doctorKey);
        callExpiryTimers.delete(doctorKey);
        filterAndRenderCalls();
    }, remainingMs);

    callExpiryTimers.set(doctorKey, timerId);
}

function syncExpiryTimers(calls) {
    const activeKeys = new Set(calls.map(getDoctorKey));

    for (const [doctorKey] of callExpiryTimers.entries()) {
        if (!activeKeys.has(doctorKey)) {
            clearCallExpiryTimer(doctorKey);
        }
    }

    calls.forEach(scheduleCallExpiry);
}

// DOM Elements
const carouselContainer = document.getElementById('carousel-container');
const cardsContainer = document.getElementById('cards-container');
const carouselImages = document.querySelectorAll('.carousel-image');
const carouselConnectionStatus = document.getElementById('carousel-connection-status');
const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');
const callsGrid = document.getElementById('calls-grid');
const datetimeElement = document.getElementById('datetime');
const carouselDatetimeElement = document.getElementById('carousel-datetime');
const notificationSound = document.getElementById('notification-sound');

// Initialize Web Audio API
function initAudioContext() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        console.log('✅ Web Audio API initialized');
        return true;
    } catch (error) {
        console.warn('Web Audio API not available:', error);
        return false;
    }
}

// Auto-enable audio on page load (no click required)
function autoEnableAudio() {
    if (!audioEnabled) {
        audioEnabled = true;
        if (!audioContext) initAudioContext();
        console.log('✅ Audio auto-enabled on page load');
        updateAudioStatus();
        
        // Process any queued sounds
        while (soundQueue.length > 0) {
            playNotificationSound();
        }
    }
}

// Auto-enable audio immediately on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 Page loaded - auto-enabling audio...');
    autoEnableAudio();
});

// Fallback: also enable on window load
window.addEventListener('load', () => {
    if (!audioEnabled) {
        console.log('📍 Window load event - auto-enabling audio...');
        autoEnableAudio();
    }
});

// Resume audio context on any user interaction
document.addEventListener('click', resumeAudioContext);
document.addEventListener('touchstart', resumeAudioContext);

function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('✅ Audio context resumed');
        });
    }
}

// Default doctor images (placeholder avatars with different colors)
const defaultDoctorImages = [
    'assets/1.png',
    'assets/2.png',
    'assets/3.png',
    'assets/4.png'
];

// Update audio status indicator
function updateAudioStatus() {
    const statusDiv = document.getElementById('audioStatus');
    if (statusDiv) {
        if (audioEnabled) {
            statusDiv.textContent = '🔔 Audio Ready';
            statusDiv.style.background = '#51cf66';
        } else {
            statusDiv.textContent = '🔕 Audio Not Ready - Click Page';
            statusDiv.style.background = '#ff6b6b';
        }
    }
}

// Initialize the display
function init() {
    startCarousel();
    updateDateTime();
    updateAudioStatus(); // Show audio status
    setInterval(updateDateTime, 1000);
    setInterval(updateElapsedTimes, 10000);
    
    // Show carousel by default
    showCarousel();
}

// Carousel functionality
function startCarousel() {
    carouselInterval = setInterval(() => {
        nextCarouselImage();
    }, 5000); // Change image every 5 seconds
}

function stopCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }
}

function nextCarouselImage() {
    carouselImages[currentCarouselIndex].classList.remove('active');
    currentCarouselIndex = (currentCarouselIndex + 1) % carouselImages.length;
    carouselImages[currentCarouselIndex].classList.add('active');
}

// Show carousel (no active calls)
function showCarousel() {
    carouselContainer.classList.add('active');
    cardsContainer.classList.remove('active');
    startCarousel();
}

// Show doctor cards (active calls exist)
function showCards() {
    carouselContainer.classList.remove('active');
    cardsContainer.classList.add('active');
    stopCarousel();
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
    // Auto-enable audio on page load/reconnect
    if (!audioEnabled) {
        autoEnableAudio();
    }
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('activeCalls', (calls) => {
    console.log('Received all active calls:', calls);
    allCalls = pruneExpiredCalls(dedupeCallsByDoctor(calls));
    syncExpiryTimers(allCalls);
    filterAndRenderCalls();
});

socket.on('newNurseCall', (call) => {
    console.log('New nurse call received:', call);
    if (call.type === 'nurse') {
        if (isCallExpired(call)) {
            return;
        }

        const incomingDoctorKey = getDoctorKey(call);
        const existingIndex = allCalls.findIndex(c => getDoctorKey(c) === incomingDoctorKey);
        if (existingIndex >= 0) {
            allCalls[existingIndex] = call;
        } else {
            allCalls.push(call);
        }

        allCalls = pruneExpiredCalls(dedupeCallsByDoctor(allCalls));
        syncExpiryTimers(allCalls);
        filterAndRenderCalls();
        
        // Play sound immediately
        console.log('🎵 Triggering sound playback for new nurse call...');
        playNotificationSound();
        
        // Force sound with Web Audio API if needed
        setTimeout(() => {
            if (soundQueue.length > 0) {
                console.log('⏳ Sound still queued, trying Web Audio API directly...');
                playBeepWithWebAudio();
            }
        }, 100);
    }
});

socket.on('newReceptionCall', (call) => {
    console.log('New reception call received (ignored):', call);
    // Nurse display ignores reception calls
});

socket.on('callCompleted', (callId) => {
    console.log('Call completed:', callId);
    const completedDoctorKey = getDoctorKey(callId);
    clearCallExpiryTimer(completedDoctorKey);
    allCalls = allCalls.filter(call => getDoctorKey(call) !== completedDoctorKey);
    filterAndRenderCalls();
});

// Update connection status
function updateConnectionStatus(connected) {
    const statuses = [connectionStatus, carouselConnectionStatus];
    
    statuses.forEach(status => {
        const text = status.querySelector('.status-text');
        if (connected) {
            status.classList.remove('disconnected');
            status.classList.add('connected');
            if (text) text.textContent = 'Connected';
        } else {
            status.classList.remove('connected');
            status.classList.add('disconnected');
            if (text) text.textContent = 'Disconnected';
        }
    });
}

// Render calls (filtered for nurse type only)
function filterAndRenderCalls() {
    allCalls = pruneExpiredCalls(allCalls);
    syncExpiryTimers(allCalls);
    nurseCalls = dedupeCallsByDoctor(allCalls.filter(call => call.type === 'nurse'));
    
    if (nurseCalls.length === 0) {
        showCarousel();
        return;
    }
    
    showCards();
    
    // Set data attribute for grid layout
    callsGrid.setAttribute('data-count', nurseCalls.length);
    
    // Sort calls by timestamp (oldest first, so they get attention)
    const sortedCalls = [...nurseCalls].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    callsGrid.innerHTML = sortedCalls.map(call => createDoctorCard(call)).join('');
}

// Legacy function name for compatibility
function renderCalls() {
    filterAndRenderCalls();
}

// Create doctor card HTML
function createDoctorCard(call) {
    const time = new Date(call.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const elapsed = getElapsedTime(call.timestamp);
    
    // Get a consistent image for this doctor based on their ID
    const imageIndex = Math.abs(hashCode(call.doctorId || call.id)) % defaultDoctorImages.length;
    const doctorImage = call.doctorImage || defaultDoctorImages[imageIndex];
    
    return `
        <div class="doctor-card">
            <div class="urgent-badge"> URGENT</div>
            <div class="doctor-image-container">
                <img src="${doctorImage}" alt="${call.doctorName}" class="doctor-image" onerror="this.src='${defaultDoctorImages[0]}'">
                <div class="doctor-badge"></div>
            </div>
            <div class="doctor-name">${call.doctorName}</div>
            <div class="doctor-room">
                <span class="doctor-room-icon"></span>
                <span>Room ${call.room}</span>
            </div>
            <div class="doctor-time">Called at ${time} • ${elapsed}</div>
        </div>
    `;
}

// Simple hash function for consistent image selection
function hashCode(value) {
    const str = String(value); // Convert to string to handle numbers
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// Get elapsed time since call
function getElapsedTime(timestamp) {
    const now = new Date();
    const callTime = new Date(timestamp);
    const diff = Math.floor((now - callTime) / 1000); // difference in seconds
    
    if (diff < 60) {
        return `${diff}s ago`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes}m ago`;
    } else {
        const hours = Math.floor(diff / 3600);
        return `${hours}h ago`;
    }
}

// Play notification sound - Web Audio API first, then HTML5
function playNotificationSound() {
    // If audio not enabled yet, queue the sound
    if (!audioEnabled) {
        console.log('⏳ Audio not enabled yet - sound queued');
        soundQueue.push(true);
        return;
    }

    // Remove from queue
    if (soundQueue.length > 0) {
        soundQueue.pop();
    }

    try {
        console.log('🔔 Playing nurse alert sound...');

        // ALWAYS use Web Audio API (most reliable, no autoplay restrictions)
        if (audioContext) {
            console.log('🎵 Using Web Audio API for sound');
            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('✅ Audio context resumed, playing sound...');
                    playBeepWithWebAudio();
                }).catch(e => {
                    console.error('❌ Failed to resume audio context:', e);
                });
                return;
            }
            playBeepWithWebAudio();
            return;
        }

        // If Web Audio not available, initialize it
        console.log('⚠️ Audio context not ready, initializing...');
        if (initAudioContext()) {
            playBeepWithWebAudio();
            return;
        }

        console.error('❌ Web Audio API not available');
    } catch (error) {
        console.error('❌ Exception in playNotificationSound:', error);
        // Last resort: try Web Audio API
        playBeepWithWebAudio();
    }
}

// Web Audio API - generates a beep sound (no browser restrictions)
function playBeepWithWebAudio() {
    if (!audioContext) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
        } catch (error) {
            console.error('Cannot create audio context:', error);
            return;
        }
    }

    try {
        const now = audioContext.currentTime;
        
        // Create oscillators for two-tone beep
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const gainEnv = audioContext.createGain();

        osc1.frequency.value = 800;
        osc2.frequency.value = 1000;
        gain.gain.value = 0.3;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(gainEnv);
        gainEnv.connect(audioContext.destination);

        // Set volume envelope (fade in/out to avoid clicking)
        gainEnv.gain.setValueAtTime(0, now);
        gainEnv.gain.linearRampToValueAtTime(1, now + 0.01);
        gainEnv.gain.linearRampToValueAtTime(0, now + 0.3);

        // First beep
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);

        // Second beep after delay
        setTimeout(() => {
            try {
                const now2 = audioContext.currentTime;
                const osc3 = audioContext.createOscillator();
                const osc4 = audioContext.createOscillator();
                const gainEnv2 = audioContext.createGain();

                osc3.frequency.value = 800;
                osc4.frequency.value = 1000;

                osc3.connect(gain);
                osc4.connect(gain);
                gain.connect(gainEnv2);
                gainEnv2.connect(audioContext.destination);

                gainEnv2.gain.setValueAtTime(0, now2);
                gainEnv2.gain.linearRampToValueAtTime(1, now2 + 0.01);
                gainEnv2.gain.linearRampToValueAtTime(0, now2 + 0.3);

                osc3.start(now2);
                osc4.start(now2);
                osc3.stop(now2 + 0.3);
                osc4.stop(now2 + 0.3);
            } catch (e) {
                console.log('Second Web Audio beep skipped:', e.message);
            }
        }, 1200);

        console.log('✅ Web Audio beep played successfully');
    } catch (error) {
        console.error('Web Audio API error:', error);
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    if (datetimeElement) {
        datetimeElement.textContent = formattedDate;
    }
    if (carouselDatetimeElement) {
        carouselDatetimeElement.textContent = formattedDate;
    }
}

// Update elapsed time for all calls every 10 seconds
function updateElapsedTimes() {
    if (nurseCalls.length > 0) {
        renderCalls();
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Show browser notification for new nurse calls
socket.on('newNurseCall', (call) => {
    if (isCallExpired(call)) {
        return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nurse Call Request', {
            body: `${call.doctorName} - Room ${call.room}`,
            icon: '',
            requireInteraction: true
        });
    }
});

// Initialize on page load
init();

console.log('TV Display initialized');
console.log('Server URL:', SERVER_URL);

// TEST FUNCTION - Remove in production
document.getElementById('testButton').addEventListener('click', () => {
    const testCall = {
        id: 'TEST-' + Date.now(),
        doctorName: 'Dr. Test ' + Math.floor(Math.random() * 100),
        room: Math.floor(Math.random() * 500) + 100,
        timestamp: new Date().toISOString(),
        status: 'active'
    };
    
    console.log('Adding test call:', testCall);
    activeCalls.push(testCall);
    renderCalls();
    playNotificationSound();
});
