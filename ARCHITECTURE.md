# System Architecture & Deployment Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Wellness Centre Network                      │
│                     (192.168.1.0/24)                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Doctor Device  │         │  Staff Device    │         │   Staff Device   │
│   (Android App)  │         │  (Android App)   │         │   (Android App)  │
│                  │         │                  │         │                  │
│  192.168.1.101  │         │  192.168.1.102  │         │  192.168.1.103  │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │ WebSocket                  │ WebSocket                  │ WebSocket
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   Backend Server        │
                        │   (Node.js + Socket.IO) │
                        │   Port: 3000           │
                        │   192.168.1.100        │
                        └───────────┬─────────────┘
                                    │
                                    │ WebSocket
                                    │
         ┌──────────────────────────┴────────────────────────────┐
         │                                                        │
         ▼                                                        ▼
┌────────────────────┐                               ┌────────────────────┐
│  TV Display 1      │                               │  TV Display 2      │
│  (Web Browser)     │                               │  (Web Browser)     │
│  Chrome/Firefox    │                               │  Chrome/Firefox    │
│  192.168.1.201    │                               │  192.168.1.202    │
└────────────────────┘                               └────────────────────┘
```

## Component Architecture

### 1. Backend Server (Node.js + Express + Socket.IO)

```
server/
├── server.js          # Main application
├── package.json       # Dependencies
└── .env              # Configuration

Key Features:
- REST API for authentication
- WebSocket server for real-time communication
- IP range validation middleware
- In-memory call management
- User authentication

Dependencies:
- express: Web framework
- socket.io: Real-time bidirectional communication
- cors: Cross-origin resource sharing
- ip-range-check: IP validation
- dotenv: Environment configuration
```

### 2. Mobile Application (React Native)

```
mobile-app/
├── src/
│   ├── App.js                 # Main app component
│   ├── config.js              # Server configuration
│   └── screens/
│       ├── LoginScreen.js     # Authentication UI
│       ├── DoctorScreen.js    # Doctor interface
│       └── StaffScreen.js     # Staff interface
├── android/                   # Android-specific files
├── package.json              # Dependencies
└── index.js                  # Entry point

Key Features:
- User authentication with role-based access
- Real-time Socket.IO connection
- Doctor: Send emergency calls
- Staff: View and manage calls
- Persistent login with AsyncStorage
- Connection status monitoring

Dependencies:
- react-native: Mobile framework
- socket.io-client: WebSocket client
- axios: HTTP client
- @react-native-async-storage/async-storage: Local storage
```

### 3. TV Display (Web Application)

```
tv-display/
├── index.html        # Main HTML structure
├── styles.css        # Styling
└── app.js           # JavaScript logic

Key Features:
- Real-time call display
- Auto-updating time and elapsed duration
- Visual notifications
- Sound notifications
- Responsive grid layout
- Browser notification API integration

Technologies:
- HTML5
- CSS3 (Grid, Flexbox, Animations)
- Vanilla JavaScript
- Socket.IO client
```

## Communication Flow

### 1. Doctor Sends Emergency Call

```
Doctor Mobile App
    │
    │ 1. User presses "Call Nurse" button
    │ 2. Validates room number
    │
    ▼
socket.emit('doctorCall', {
    doctorId: 1,
    doctorName: 'Dr. Smith',
    room: '101',
    timestamp: Date.now()
})
    │
    ▼
Backend Server
    │
    │ 3. Receives call data
    │ 4. Creates call object with unique ID
    │ 5. Adds to activeCalls array
    │
    ▼
io.emit('newCall', callObject)
io.emit('activeCalls', allCalls)
    │
    ├─────────────┬─────────────┐
    │             │             │
    ▼             ▼             ▼
TV Display 1  Staff App 1  Staff App 2
    │             │             │
    │ 6. Receives new call
    │ 7. Updates UI
    │ 8. Plays notification
    │ 9. Shows browser notification
    └─────────────┴─────────────┘
```

### 2. Staff Completes Call

```
Staff Mobile App
    │
    │ 1. User presses "Complete" button
    │ 2. Gets call ID
    │
    ▼
socket.emit('completeCall', callId)
    │
    ▼
Backend Server
    │
    │ 3. Receives call ID
    │ 4. Removes from activeCalls
    │
    ▼
io.emit('callCompleted', callId)
io.emit('activeCalls', remainingCalls)
    │
    ├─────────────┬─────────────┐
    │             │             │
    ▼             ▼             ▼
TV Display    All Mobile    All Devices
              Apps
    │
    │ 5. Updates UI
    │ 6. Removes call card
    └─────────────┘
```

## Security Architecture

### 1. IP Range Validation

```javascript
// Server-side middleware
const checkIpRange = (req, res, next) => {
  const clientIp = req.ip;
  const allowedRange = '192.168.1.0/24';
  
  if (ipRangeCheck(clientIp, allowedRange)) {
    next(); // Allow
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
};
```

### 2. User Authentication

```javascript
// Login flow
POST /api/login
{
  "username": "dr.smith",
  "password": "doctor123"
}

// Response
{
  "success": true,
  "user": {
    "id": 1,
    "username": "dr.smith",
    "type": "doctor",
    "name": "Dr. Smith"
  }
}
```

### 3. Security Layers

```
┌─────────────────────────────────────┐
│ Layer 1: Network (IP Range)        │  <- ALLOWED_IP_RANGE
├─────────────────────────────────────┤
│ Layer 2: Application (Login)       │  <- Username/Password
├─────────────────────────────────────┤
│ Layer 3: Session (AsyncStorage)    │  <- Persistent login
├─────────────────────────────────────┤
│ Layer 4: Role-Based Access         │  <- Doctor vs Staff
└─────────────────────────────────────┘
```

## Deployment Scenarios

### Scenario 1: Single Server Deployment

**Best for:** Small facilities (1-20 staff)

```
Server: Desktop PC or Laptop
  - Windows/Linux/Mac
  - Node.js installed
  - Always-on

Mobile Devices: 5-10 devices
  - Android phones/tablets
  - On facility Wi-Fi

TV Displays: 1-3 TVs
  - Chrome browser
  - Kiosk mode
```

**Setup:**
1. Install Node.js on server computer
2. Run `setup.bat` to install dependencies
3. Configure IP addresses
4. Start server: `npm start`
5. Deploy mobile app via APK or React Native
6. Open TV displays in browser

### Scenario 2: Cloud Deployment

**Best for:** Multi-facility, remote access

```
Server: Cloud VM (AWS, Azure, DigitalOcean)
  - Ubuntu 20.04 LTS
  - Node.js 16+
  - PM2 for process management
  - Nginx reverse proxy
  - SSL certificate

Mobile: Published to Google Play Store
TV: Hosted on CDN
```

**Setup:**
1. Deploy server to cloud VM
2. Configure Nginx with SSL
3. Use environment variables
4. Setup PM2 for auto-restart
5. Publish app to Play Store
6. Host TV display on web server

### Scenario 3: Hybrid (Local + Cloud)

**Best for:** Multiple locations with central monitoring

```
Each Facility:
  - Local Node.js server
  - Mobile devices on local network
  - TV displays

Central Cloud:
  - Master server
  - Analytics dashboard
  - Backup system
```

## Performance Considerations

### Server Capacity

```
Expected Load:
- Concurrent users: 50-100
- Calls per hour: 20-50
- WebSocket connections: 10-30

Recommended Specs:
- CPU: 2 cores minimum
- RAM: 2GB minimum
- Network: 100Mbps
- Storage: 10GB
```

### Mobile App

```
Minimum Requirements:
- Android 5.0 (API 21)
- 100MB storage
- Wi-Fi connection

Recommended:
- Android 8.0+
- 2GB RAM
- Stable Wi-Fi
```

### TV Display

```
Requirements:
- Modern browser (Chrome 90+)
- 1920x1080 resolution
- Stable network connection

Optimizations:
- Hardware acceleration enabled
- Auto-refresh disabled
- Power saving disabled
```

## Monitoring & Maintenance

### Server Monitoring

```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connections: io.sockets.sockets.size,
    activeCalls: activeCalls.length,
    timestamp: new Date()
  });
});
```

### Logging

```javascript
// Winston logger integration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Backup Strategy

```
Daily:
  - Database backup (if using DB)
  - Configuration files
  - User data

Weekly:
  - Full system backup
  - Test restore procedure

Monthly:
  - Archive old logs
  - Update documentation
```

## Scaling Strategy

### Horizontal Scaling

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Server 1 │────│  Redis   │────│ Server 2 │
│  :3000   │     │ (Shared) │     │  :3001   │
└──────────┘     └──────────┘     └──────────┘
      │               │                 │
      └───────────────┴─────────────────┘
                      │
              Load Balancer (Nginx)
                      │
              ┌───────┴────────┐
              │                │
          Clients           Clients
```

### Database Integration

```javascript
// Replace in-memory storage with MongoDB
const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  doctorId: Number,
  doctorName: String,
  room: String,
  timestamp: Date,
  status: String
});

const Call = mongoose.model('Call', CallSchema);
```

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Can't connect | Server not running | Start server |
| IP denied | Wrong network | Check IP range |
| Calls not showing | WebSocket disconnected | Check network |
| App crashes | Out of memory | Restart app |
| Slow performance | Too many connections | Scale server |

### Debug Mode

```javascript
// Enable debug logs
localStorage.debug = 'socket.io-client:*';

// Server debug
DEBUG=socket.io:* npm start
```

## Disaster Recovery

### Server Failure

1. Automatic restart with PM2
2. Fallback to backup server
3. Alert system administrator
4. Load from last known state

### Network Failure

1. Mobile apps cache last state
2. Queue operations for retry
3. Show offline indicator
4. Reconnect automatically

### Data Loss

1. Regular backups (hourly)
2. Transaction logging
3. State persistence
4. Recovery procedures

## Compliance & Regulations

⚠️ **Important:** This system handles healthcare data

### HIPAA Considerations (US)
- Encrypt data in transit (use HTTPS/WSS)
- Implement audit logging
- Secure authentication
- Data backup procedures

### GDPR (EU)
- User consent management
- Data retention policies
- Right to erasure
- Data portability

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** System Administrator
