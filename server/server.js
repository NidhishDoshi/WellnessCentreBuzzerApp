const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const ipRangeCheck = require('ip-range-check');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active calls
let activeCalls = [];

// Mock users database (replace with real database in production)
const users = [
  { id: 1, username: 'dr.smith', password: 'doctor123', type: 'doctor', name: 'Dr. Smith' },
  { id: 2, username: 'dr.jones', password: 'doctor123', type: 'doctor', name: 'Dr. Jones' },
  { id: 3, username: 'dr.wilson', password: 'doctor123', type: 'doctor', name: 'Dr. Wilson' },
  { id: 4, username: 'nurse.mary', password: 'staff123', type: 'staff', name: 'Nurse Mary' },
  { id: 5, username: 'nurse.john', password: 'staff123', type: 'staff', name: 'Nurse John' }
];

// Middleware to check IP range
const checkIpRange = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const allowedRange = process.env.ALLOWED_IP_RANGE || '192.168.1.0/24';
  
  // For testing purposes, allow localhost
  if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('127.0.0.1')) {
    return next();
  }
  
  // Clean the IP (remove ::ffff: prefix if present)
  const cleanIp = clientIp.replace('::ffff:', '');
  
  if (ipRangeCheck(cleanIp, allowedRange)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: IP not in allowed range' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Wellness Centre Server Running', timestamp: new Date() });
});

// Login endpoint
app.post('/api/login', checkIpRange, (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username, type: user.type, name: user.name }
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Get active calls
app.get('/api/calls', (req, res) => {
  res.json({ calls: activeCalls });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send current active calls to newly connected client
  socket.emit('activeCalls', activeCalls);
  
  // Handle nurse call
  socket.on('doctorCall', (data) => {
    console.log('Nurse call received:', data);
    
    const call = {
      id: data.doctorId || Date.now(),
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      room: data.room || 'Unknown',
      timestamp: new Date(),
      status: 'active',
      type: 'nurse'
    };
    
    activeCalls.push(call);
    
    // Broadcast to all connected clients
    io.emit('newNurseCall', call);
    io.emit('activeCalls', activeCalls);
  });
  
  // Handle reception call
  socket.on('receptionCall', (data) => {
    console.log('Reception call received:', data);
    
    const call = {
      id: data.doctorId || Date.now(),
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      room: data.room || 'Unknown',
      timestamp: new Date(),
      status: 'active',
      type: 'reception'
    };
    
    activeCalls.push(call);
    
    // Broadcast to all connected clients
    io.emit('newReceptionCall', call);
    io.emit('activeCalls', activeCalls);
  });
  
  // Handle call completion
  socket.on('completeCall', (callId) => {
    console.log('Call completed:', callId);
    activeCalls = activeCalls.filter(call => call.id !== callId);
    
    io.emit('callCompleted', callId);
    io.emit('activeCalls', activeCalls);
  });
  
  // Handle clear all calls
  socket.on('clearAllCalls', () => {
    console.log('Clearing all calls');
    activeCalls = [];
    io.emit('activeCalls', activeCalls);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed IP range: ${process.env.ALLOWED_IP_RANGE || '192.168.1.0/24'}`);
});
