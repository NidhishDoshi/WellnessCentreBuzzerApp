# Wellness Centre Notification System

A real-time notification system for healthcare facilities that allows doctors to call for nurse assistance. The system consists of three components:

1. **Backend Server** - Node.js server with Socket.IO for real-time communication
2. **Mobile App** - React Native Android app for doctors and staff
3. **TV Display** - Web-based display for nurse stations

## Features

- ✅ Real-time notifications using Socket.IO
- ✅ IP range authentication (works only on specific network)
- ✅ User authentication (doctors and staff)
- ✅ Doctor can send emergency calls with room numbers
- ✅ Staff can view and manage active calls
- ✅ TV display shows all active calls in real-time
- ✅ Professional UI with animations and visual feedback
- ✅ Responsive design for different screen sizes

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │◄───────►│  Backend Server │◄───────►│   TV Display    │
│  (React Native) │         │   (Node.js +    │         │   (Web Browser) │
│                 │         │   Socket.IO)    │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Prerequisites

- **For Backend Server:**
  - Node.js 16+ and npm
  - Windows/Linux/Mac

- **For Mobile App:**
  - Node.js 16+
  - React Native development environment
  - Android Studio (for Android)
  - Android device or emulator

- **For TV Display:**
  - Modern web browser (Chrome, Firefox, Edge)

## Installation & Setup

### 1. Backend Server Setup

```bash
cd server
npm install
```

**Configure the server:**
Edit the `.env` file:
```env
PORT=3000
ALLOWED_IP_RANGE=192.168.1.0/24  # Change to your network range
SECRET_KEY=wellness_centre_secret_2026
```

**Start the server:**
```bash
npm start
```

The server will run on `http://localhost:3000`

### 2. Mobile App Setup

```bash
cd mobile-app
npm install
```

**Configure the app:**
Edit `src/config.js`:
```javascript
export const SERVER_URL = 'http://192.168.1.100:3000'; // Your server IP
export const SOCKET_URL = 'http://192.168.1.100:3000';
export const ALLOWED_IP_PREFIX = '192.168.1'; // Your network prefix
```

**Run on Android:**
```bash
# Make sure Android device is connected or emulator is running
npm run android
```

**For iOS (Mac only):**
```bash
cd ios
pod install
cd ..
npm run ios
```

### 3. TV Display Setup

**Configure the display:**
Edit `tv-display/app.js`:
```javascript
const SERVER_URL = 'http://192.168.1.100:3000'; // Your server IP
```

**Run the TV Display:**
Simply open `tv-display/index.html` in a web browser. For production, host it on a web server:

```bash
cd tv-display
# Using Python's built-in server
python -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080
```

Then open `http://localhost:8080` in your browser on the TV.

## Usage

### Default Login Credentials

**Doctors:**
- Username: `dr.smith` / Password: `doctor123`
- Username: `dr.jones` / Password: `doctor123`
- Username: `dr.wilson` / Password: `doctor123`

**Staff:**
- Username: `nurse.mary` / Password: `staff123`
- Username: `nurse.john` / Password: `staff123`

### For Doctors:
1. Login with doctor credentials
2. Enter your room number
3. Press "Call Nurse" button
4. Your call appears on all TV displays and staff mobile apps

### For Staff:
1. Login with staff credentials
2. View all active calls
3. Mark calls as complete when attended

### TV Display:
- Automatically shows all active calls
- Updates in real-time
- Shows doctor name, room number, and time elapsed
- Visual and audio notifications for new calls

## IP Range Configuration

The system only works within a specified IP range for security. To configure:

1. **Server**: Edit `ALLOWED_IP_RANGE` in `server/.env`
2. **Mobile App**: Edit `ALLOWED_IP_PREFIX` in `mobile-app/src/config.js`

Example configurations:
- `192.168.1.0/24` - Allows 192.168.1.1 to 192.168.1.254
- `10.0.0.0/24` - Allows 10.0.0.1 to 10.0.0.254
- `172.16.0.0/16` - Allows 172.16.0.1 to 172.16.255.254

## Network Configuration

### Finding Your Server IP:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Linux/Mac:**
```bash
ifconfig
# or
ip addr show
```

### Important Notes:
1. All devices (server, mobile, TV) must be on the same network
2. Update the SERVER_URL in both mobile app and TV display with your server's IP
3. Ensure firewall allows connections on port 3000
4. For production, use a static IP for the server

## Project Structure

```
Wellness Centre/
├── server/
│   ├── server.js          # Main server file
│   ├── package.json       # Server dependencies
│   └── .env              # Environment variables
├── mobile-app/
│   ├── src/
│   │   ├── App.js        # Main app component
│   │   ├── config.js     # Configuration
│   │   └── screens/
│   │       ├── LoginScreen.js
│   │       ├── DoctorScreen.js
│   │       └── StaffScreen.js
│   ├── package.json      # App dependencies
│   ├── index.js         # Entry point
│   └── app.json         # App configuration
└── tv-display/
    ├── index.html       # Main HTML
    ├── styles.css       # Styling
    └── app.js          # JavaScript logic
```

## Customization

### Adding More Users
Edit `server/server.js` and modify the `users` array:
```javascript
const users = [
  { id: 1, username: 'dr.newdoctor', password: 'pass123', type: 'doctor', name: 'Dr. New Doctor' },
  // Add more users...
];
```

### Changing Colors/Theme
Edit the respective CSS/StyleSheet files:
- Mobile app: Check `styles` objects in screen files
- TV display: Edit `tv-display/styles.css`

### Notification Sound
Replace `tv-display/notification.mp3` with your own sound file.

## Troubleshooting

### Mobile App Can't Connect to Server:
1. Verify server is running (`npm start` in server directory)
2. Check SERVER_URL in `mobile-app/src/config.js`
3. Ensure devices are on same network
4. Check firewall settings
5. Try using server IP instead of localhost

### TV Display Not Updating:
1. Check browser console for errors (F12)
2. Verify SERVER_URL in `tv-display/app.js`
3. Check WebSocket connection in Network tab
4. Refresh the page

### IP Range Access Denied:
1. Check your device's IP address
2. Verify ALLOWED_IP_RANGE in server `.env`
3. Ensure IP is within the specified range
4. Restart the server after changing `.env`

### Android Build Issues:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Security Considerations

⚠️ **Important for Production:**
1. Change default passwords in `server.js`
2. Use environment variables for sensitive data
3. Implement proper authentication (JWT, OAuth)
4. Use HTTPS/WSS for encrypted communication
5. Store passwords hashed (bcrypt, argon2)
6. Implement rate limiting
7. Add input validation
8. Use a proper database (PostgreSQL, MongoDB)

## Technology Stack

- **Backend:** Node.js, Express, Socket.IO
- **Mobile:** React Native, Socket.IO Client
- **Frontend:** HTML5, CSS3, JavaScript, Socket.IO Client
- **Real-time:** WebSocket (Socket.IO)
- **Storage:** AsyncStorage (mobile)

## API Endpoints

### REST API
- `GET /` - Server status
- `POST /api/login` - User authentication
- `GET /api/calls` - Get active calls

### Socket.IO Events
**Client → Server:**
- `doctorCall` - Doctor sends a call request
- `completeCall` - Mark call as complete
- `clearAllCalls` - Clear all calls

**Server → Client:**
- `activeCalls` - List of all active calls
- `newCall` - New call notification
- `callCompleted` - Call marked as complete

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Push notifications for mobile app
- [ ] Call priority levels
- [ ] Call history and analytics
- [ ] Admin panel for user management
- [ ] Multiple facility support
- [ ] iOS app
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Voice notifications

## License

This project is for educational and internal use only.

## Support

For issues or questions, please contact your system administrator.

---

**Last Updated:** January 2026
**Version:** 1.0.0
