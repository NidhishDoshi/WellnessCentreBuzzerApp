// Configuration
const SERVER_URL = 'http://127.0.0.1:3000'; // Change this to your server IP

// Initialize Socket.IO connection
const socket = io(SERVER_URL);

// State
let activeCalls = [];
let currentCarouselIndex = 0;
let carouselInterval = null;

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

// Default doctor images (placeholder avatars with different colors)
const defaultDoctorImages = [
    'https://ui-avatars.com/api/?name=Doctor&size=200&background=e74c3c&color=fff&bold=true',
    'https://ui-avatars.com/api/?name=MD&size=200&background=3498db&color=fff&bold=true',
    'https://ui-avatars.com/api/?name=Dr&size=200&background=2ecc71&color=fff&bold=true',
    'https://ui-avatars.com/api/?name=Physician&size=200&background=f39c12&color=fff&bold=true',
    'https://ui-avatars.com/api/?name=Specialist&size=200&background=9b59b6&color=fff&bold=true'
];

// Initialize the display
function init() {
    startCarousel();
    updateDateTime();
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
});

socket.on('callCompleted', (callId) => {
    console.log('Call completed:', callId);
    activeCalls = activeCalls.filter(call => call.id !== callId);
    renderCalls();
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

// Render calls
function renderCalls() {
    if (activeCalls.length === 0) {
        showCarousel();
        return;
    }
    
    showCards();
    
    // Set data attribute for grid layout
    callsGrid.setAttribute('data-count', activeCalls.length);
    
    // Sort calls by timestamp (oldest first, so they get attention)
    const sortedCalls = [...activeCalls].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    callsGrid.innerHTML = sortedCalls.map(call => createDoctorCard(call)).join('');
}

// Create doctor card HTML
function createDoctorCard(call) {
    const time = new Date(call.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const elapsed = getElapsedTime(call.timestamp);
    
    // Get a consistent image for this doctor based on their ID
    const imageIndex = Math.abs(hashCode(call.id)) % defaultDoctorImages.length;
    const doctorImage = call.doctorImage || defaultDoctorImages[imageIndex];
    
    return `
        <div class="doctor-card">
            <div class="urgent-badge">🚨 URGENT</div>
            <div class="doctor-image-container">
                <img src="${doctorImage}" alt="${call.doctorName}" class="doctor-image" onerror="this.src='${defaultDoctorImages[0]}'">
                <div class="doctor-badge">🔔</div>
            </div>
            <div class="doctor-name">${call.doctorName}</div>
            <div class="doctor-room">
                <span class="doctor-room-icon">📍</span>
                <span>Room ${call.room}</span>
            </div>
            <div class="doctor-time">Called at ${time} • ${elapsed}</div>
        </div>
    `;
}

// Simple hash function for consistent image selection
function hashCode(str) {
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

// Play notification sound
function playNotificationSound() {
    notificationSound.play().catch(error => {
        console.log('Could not play notification sound:', error);
    });
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
    if (activeCalls.length > 0) {
        renderCalls();
    }
}

// Request notification permission
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
