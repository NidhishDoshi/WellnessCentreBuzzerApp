// Configuration
const SERVER_URL = 'http://192.168.1.100:3000'; // Change this to your server IP

// Initialize Socket.IO connection
const socket = io(SERVER_URL);

// State
let activeCalls = [];

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');
const callsContainer = document.getElementById('calls-container');
const callCount = document.getElementById('call-count');
const datetimeElement = document.getElementById('datetime');
const notificationSound = document.getElementById('notification-sound');

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('activeCalls', (calls) => {
    console.log('Received active calls:', calls);
    activeCalls = calls;
    renderCalls();
});

socket.on('newCall', (call) => {
    console.log('New call received:', call);
    activeCalls.push(call);
    renderCalls();
    playNotificationSound();
    highlightNewCall(call.id);
});

socket.on('callCompleted', (callId) => {
    console.log('Call completed:', callId);
    activeCalls = activeCalls.filter(call => call.id !== callId);
    renderCalls();
});

// Update connection status
function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        connectionStatus.classList.remove('connected');
        connectionStatus.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
    }
}

// Render calls
function renderCalls() {
    callCount.textContent = activeCalls.length;
    
    if (activeCalls.length === 0) {
        callsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h3>No Active Calls</h3>
                <p>Waiting for doctor requests...</p>
            </div>
        `;
        return;
    }
    
    // Sort calls by timestamp (newest first)
    const sortedCalls = [...activeCalls].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    callsContainer.innerHTML = sortedCalls.map(call => createCallCard(call)).join('');
}

// Create call card HTML
function createCallCard(call) {
    const time = new Date(call.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const elapsed = getElapsedTime(call.timestamp);
    
    return `
        <div class="call-card" id="call-${call.id}">
            <div class="call-priority">URGENT</div>
            <div class="call-card-content">
                <div class="call-icon">🔔</div>
                <div class="call-doctor">${call.doctorName}</div>
                <div class="call-room">
                    <span>📍</span>
                    <span>Room ${call.room}</span>
                </div>
                <div class="call-time">⏰ ${time} (${elapsed})</div>
            </div>
        </div>
    `;
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

// Highlight new call with animation
function highlightNewCall(callId) {
    setTimeout(() => {
        const callCard = document.getElementById(`call-${callId}`);
        if (callCard) {
            callCard.style.animation = 'none';
            setTimeout(() => {
                callCard.style.animation = 'slideIn 0.3s ease-out';
            }, 10);
        }
    }, 100);
}

// Play notification sound
function playNotificationSound() {
    // Try to play sound, but it may be blocked by browser autoplay policy
    notificationSound.play().catch(error => {
        console.log('Could not play notification sound:', error);
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    datetimeElement.textContent = now.toLocaleDateString('en-US', options);
}

// Update elapsed time for all calls every 10 seconds
function updateElapsedTimes() {
    if (activeCalls.length > 0) {
        renderCalls();
    }
}

// Initialize
updateDateTime();
setInterval(updateDateTime, 1000);
setInterval(updateElapsedTimes, 10000);

// Request notification permission (for browsers that support it)
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Show browser notification for new calls
socket.on('newCall', (call) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Call Request', {
            body: `${call.doctorName} - Room ${call.room}`,
            icon: '🔔',
            requireInteraction: true
        });
    }
});

console.log('TV Display initialized');
console.log('Server URL:', SERVER_URL);
