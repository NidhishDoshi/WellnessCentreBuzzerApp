# Quick Start Guide - Wellness Centre Notification System

## 🚀 Quick Setup (5 Minutes)

### Step 1: Start the Server (1 minute)

1. Open a terminal/command prompt
2. Navigate to the server folder:
   ```bash
   cd "d:\Downloads\Wellness Centre\server"
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. **Note your server's IP address** (you'll need this later)
   - Windows: Run `ipconfig` - look for "IPv4 Address"
   - Example: `192.168.1.100`

✅ Server should now be running on port 3000

---

### Step 2: Setup the TV Display (2 minutes)

1. Open `tv-display/app.js` in a text editor
2. Find line 2 and change the IP to your server's IP:
   ```javascript
   const SERVER_URL = 'http://YOUR_SERVER_IP:3000';
   ```
   Example: `const SERVER_URL = 'http://192.168.1.100:3000';`
3. Save the file
4. Open `tv-display/index.html` in a web browser (Chrome recommended)
5. If on a separate TV/monitor:
   - Start a simple web server:
     ```bash
     cd "d:\Downloads\Wellness Centre\tv-display"
     npx http-server -p 8080
     ```
   - Open `http://YOUR_SERVER_IP:8080` on the TV browser

✅ TV Display should show "Connected" and "No Active Calls"

---

### Step 3: Setup the Mobile App (2 minutes)

1. Open `mobile-app/src/config.js` in a text editor
2. Change line 2 to your server's IP:
   ```javascript
   export const SERVER_URL = 'http://YOUR_SERVER_IP:3000';
   export const SOCKET_URL = 'http://YOUR_SERVER_IP:3000';
   ```
3. Save the file
4. Install dependencies (first time only):
   ```bash
   cd "d:\Downloads\Wellness Centre\mobile-app"
   npm install
   ```
5. Connect your Android device via USB or start an emulator
6. Run the app:
   ```bash
   npm run android
   ```

✅ App should open on your device/emulator

---

## 🎯 Test the System

### Test as Doctor:
1. In the mobile app, login with:
   - Username: `dr.smith`
   - Password: `doctor123`
2. Enter room number: `101`
3. Press "Call Nurse" button
4. Check the TV display - you should see the call appear!

### Test as Staff:
1. In another device or after logging out:
   - Username: `nurse.mary`
   - Password: `staff123`
2. You should see the active call from Dr. Smith
3. Press "Complete" to clear the call

---

## ⚙️ IP Address Configuration Summary

You need to update the server IP in 3 places:

| File | Line | What to Change |
|------|------|----------------|
| `mobile-app/src/config.js` | 2-3 | `SERVER_URL` and `SOCKET_URL` |
| `tv-display/app.js` | 2 | `SERVER_URL` |
| `server/.env` | 2 | `ALLOWED_IP_RANGE` (optional) |

**Example:**
If your server IP is `192.168.1.100`, change all URLs to:
```
http://192.168.1.100:3000
```

---

## 🔐 Default Login Credentials

### Doctors:
| Username | Password | Name |
|----------|----------|------|
| dr.smith | doctor123 | Dr. Smith |
| dr.jones | doctor123 | Dr. Jones |
| dr.wilson | doctor123 | Dr. Wilson |

### Staff:
| Username | Password | Name |
|----------|----------|------|
| nurse.mary | staff123 | Nurse Mary |
| nurse.john | staff123 | Nurse John |

---

## 🐛 Common Issues

### Issue: "Connection Error" on mobile app
**Solution:** 
- Check that server is running
- Verify IP address in `config.js`
- Make sure device and server are on same Wi-Fi network
- Check firewall isn't blocking port 3000

### Issue: TV Display shows "Disconnected"
**Solution:**
- Check SERVER_URL in `app.js`
- Open browser console (F12) to see error messages
- Refresh the page

### Issue: Android app won't build
**Solution:**
```bash
cd "d:\Downloads\Wellness Centre\mobile-app\android"
gradlew clean
cd ..
npm run android
```

### Issue: "Access Denied: IP not in allowed range"
**Solution:**
- Edit `server/.env`
- Change `ALLOWED_IP_RANGE` to match your network
- Example: `192.168.1.0/24` for network 192.168.1.x
- Restart the server

---

## 📱 For Production Use

### On Server Computer:
```bash
cd "d:\Downloads\Wellness Centre\server"
npm start
```
Keep this terminal open - server must run 24/7

### On TV/Display:
1. Open browser in fullscreen (F11)
2. Navigate to `http://SERVER_IP:8080`
3. Leave browser open on nurse station

### On Mobile Devices:
1. Install the app on all doctor and staff devices
2. Ensure all are on the facility Wi-Fi
3. Login with respective credentials

---

## 📞 System Flow

```
Doctor presses button in Room 101
         ↓
    Signal sent to server
         ↓
    Server broadcasts to all clients
         ↓
┌────────────────┬────────────────┐
↓                ↓                ↓
TV Display    Staff Phones    Other Devices
(Shows call)  (Notification)  (Get update)
```

---

## 🎨 Customization Quick Tips

### Change App Colors:
- Edit styles in `mobile-app/src/screens/*.js`

### Add More Users:
- Edit `server/server.js` - modify `users` array

### Change Notification Sound:
- Replace `tv-display/notification.mp3`

---

## ✅ Success Checklist

- [ ] Server running and accessible
- [ ] TV display showing "Connected"
- [ ] Mobile app installed and can login
- [ ] Test call appears on TV when doctor presses button
- [ ] Staff can see and complete calls
- [ ] All devices on same network
- [ ] IP addresses configured correctly

---

## 📞 Need Help?

1. Check the full [README.md](README.md) for detailed documentation
2. Review the troubleshooting section
3. Check server logs for errors
4. Verify network connectivity

---

**Setup Time:** ~5 minutes  
**Last Updated:** January 2026  
**Difficulty:** Easy ⭐
