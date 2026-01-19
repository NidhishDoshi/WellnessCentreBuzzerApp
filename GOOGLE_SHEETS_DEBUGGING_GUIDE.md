# 🔍 Google Sheets Integration - Debugging Guide

## ✅ What I Just Added

### 1. Enhanced Logging
Added detailed console logging to track every step of the update process:

```typescript
// In loadDoctorInfo:
console.log('📱 Loaded doctor info:', { name, room, number, phone });
console.log('✓ Synced phone number:', syncedNumber);

// In updateDoctorInfoInSheets:
console.log('📤 Updating Google Sheets:', { field, value, phone });
console.log('API URL:', url);
console.log('📥 Google Sheets Response:', data);
console.log('✅ Google Sheets updated successfully');

// In handleSaveField:
console.log('💾 Saving field:', { field: editingField, value: tempValue, phoneToUse });
console.log('✓ Name saved to AsyncStorage');
console.log('📡 Calling Google Sheets API...');
console.log('📊 Sheets update result:', sheetsUpdateSuccess);
```

### 2. Better Error Handling
- Added proper error logging
- Added URL encoding for special characters
- Local storage always succeeds (backup mechanism)
- Sheets failures logged but don't break functionality

### 3. URL Encoding
All parameters are now URL-encoded to handle special characters:
```typescript
`?action=updateProfile&phone=${encodeURIComponent(phone)}&field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`
```

---

## 🧪 How to Debug This

### Step 1: Open Chrome DevTools
1. When running app on emulator/device connected to computer:
   - Open Chrome: `chrome://inspect`
   - Find your device
   - Click "Inspect"

2. Or enable React Native debugging:
   - Shake device → "Open JS Debugger"
   - Opens debugger in browser
   - Go to Console tab

### Step 2: Make an Update
1. Go to Profile screen
2. Edit phone number (or name/room)
3. Tap Save
4. **Look at Console** for these log messages:

```
💾 Saving field: {field: "number", value: "9876543210", phoneToUse: "9876543210"}
✓ Phone saved to AsyncStorage and synced
📡 Calling Google Sheets API...
📤 Updating Google Sheets: {field: "number", value: "9876543210", phone: "9876543210"}
API URL: https://script.google.com/macros/s/AKfycbzBQLrPT7d7RySISRrxWC_wZfdDEWFDwcIKb39lyHuPCxlmfgGULfeSUmld8Wz2xvXn/exec?action=updateProfile&phone=9876543210&field=number&value=9876543210
📥 Google Sheets Response: {success: true}
✅ Google Sheets updated successfully
📊 Sheets update result: true
```

### Step 3: Check Each Log Line

| Log | Meaning | If Missing = Problem |
|-----|---------|----------------------|
| `💾 Saving field` | Save started | Field not selected |
| `✓ Phone saved` | AsyncStorage OK | Storage error |
| `📤 Updating Google Sheets` | API call starting | Should appear |
| `API URL` | Shows exact URL | Check parameters |
| `📥 Response` | Google Sheets answered | Network error? |
| `✅ Updated successfully` | All good! | Check backend script |

---

## 🔧 Possible Issues & Solutions

### Issue 1: No API Call Being Made
**Symptom:** You don't see `📤 Updating Google Sheets` log

**Causes:**
- `phoneToUse` is empty/null
- `editingField` is not set correctly
- `tempValue` is empty

**Solution:**
- Check `💾 Saving field` log
- Verify `phoneToUse` has a value
- If phone is missing, login first to set it

---

### Issue 2: API Call Made But No Response
**Symptom:** You see `📤 Updating` but NOT `📥 Response`

**Causes:**
- Google Sheets API URL is wrong
- Network connectivity issue
- Google Sheets app script not deployed

**Solution:**
- Verify API URL in console matches what's in code
- Check phone network/WiFi
- Re-deploy Google Sheets App Script

---

### Issue 3: Response Shows `success: false`
**Symptom:** You see `📥 Google Sheets Response: {success: false}`

**Causes:**
- Google Sheets backend doesn't have `updateProfile` action
- Phone number format not matching sheet
- Sheet structure doesn't match expected format

**Solution:**
```
Your Google Sheets App Script needs:

function doGet(e) {
  if (e.parameter.action === 'updateProfile') {
    return updateProfile(e.parameter);
  }
}

function updateProfile(params) {
  const phone = params.phone;
  const field = params.field;
  const value = params.value;
  
  // Find and update row with matching phone
  // Return { success: true }
}
```

---

### Issue 4: Data Saved Locally But Not In Sheets
**Symptom:** Phone updates in app but not in Excel

**Causes:**
- App script not connected to correct sheet
- Phone number in app doesn't match sheet
- Wrong sheet name being updated

**Solution:**
- Verify sheet name in App Script
- Verify phone format (should be 10 digits)
- Check sheet has columns for name, room, number
- Make sure App Script has proper permissions

---

## 📝 How Data Should Flow

```
User Updates Phone
       ↓
[💾 Save locally to AsyncStorage]
       ↓
[✓ LocalStorage updated]
       ↓
[📤 API call with parameters]
       ↓
Google Sheets App Script
       ↓
[🔍 Find row by phone number]
       ↓
[✏️ Update field in sheet]
       ↓
[✅ Return success: true]
       ↓
[📊 App receives confirmation]
       ↓
[✓ Show success alert]
```

---

## 🎯 API Call Details

### Current Implementation:

**What gets sent:**
```
URL Format:
?action=updateProfile
&phone=9876543210
&field=number (or name, room)
&value=new_value
```

**Example Calls:**
```
# Update phone number
?action=updateProfile&phone=9876543210&field=number&value=9876543210

# Update name
?action=updateProfile&phone=9876543210&field=name&value=Dr%20John%20Doe

# Update room
?action=updateProfile&phone=9876543210&field=room&value=Room%20101
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

## ✅ Your Google Sheets Backend Should:

1. **Receive the request** with phone, field, and value
2. **Find the row** where phone matches
3. **Update the field** (name, room, or number)
4. **Save the sheet**
5. **Return** `{ success: true }`

### Example Google Sheets App Script:

```javascript
const SHEET_NAME = 'Doctors'; // Your sheet name
const PHONE_COLUMN = 'A'; // Where phone is
const NAME_COLUMN = 'B';
const ROOM_COLUMN = 'C';
const NUMBER_COLUMN = 'D';

function doGet(e) {
  if (e.parameter.action === 'updateProfile') {
    const result = updateProfile(e.parameter);
    return ContentService.createTextOutput(
      JSON.stringify(result)
    ).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(
    JSON.stringify({ success: false })
  );
}

function updateProfile(params) {
  try {
    const phone = params.phone;
    const field = params.field;
    const value = params.value;
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Find row with matching phone
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == phone) { // Column A is phone
        // Update the appropriate field
        if (field === 'name') {
          sheet.getRange(i + 1, 2).setValue(value); // Column B
        } else if (field === 'room') {
          sheet.getRange(i + 1, 3).setValue(value); // Column C
        } else if (field === 'number') {
          sheet.getRange(i + 1, 4).setValue(value); // Column D
        }
        
        return { success: true, message: 'Updated' };
      }
    }
    
    return { success: false, message: 'Phone not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
```

---

## 🚀 Testing the Integration

### Test 1: Check Logging
1. Open profile
2. Edit any field
3. Check console for all logs
4. Verify logs show correct phone number

### Test 2: Verify Request Is Sent
1. Open browser DevTools Network tab
2. Edit and save profile field
3. Look for request to `script.google.com`
4. Check Request URL includes parameters
5. Check Response is `{ success: true }`

### Test 3: Verify Sheet Update
1. Update phone in app
2. Check console shows success
3. Go to Google Sheet
4. Refresh manually
5. Verify data is updated

### Test 4: Offline Behavior
1. Turn off WiFi
2. Edit profile field
3. App should still save locally
4. Alert shows as success
5. When online again, data syncs next time

---

## 📊 Console Output Examples

### ✅ Success Output:
```
📱 Loaded doctor info: {name: "Dr. John", room: "101", number: "9876543210", phone: "9876543210"}
✓ Synced phone number: 9876543210
💾 Saving field: {field: "room", value: "Room 102", phoneToUse: "9876543210"}
✓ Room saved to AsyncStorage
📡 Calling Google Sheets API...
📤 Updating Google Sheets: {field: "room", value: "Room 102", phone: "9876543210"}
API URL: https://script.google.com/macros/s/AKfycbzBQLrPT7d7RySISRrxWC_wZfdDEWFDwcIKb39lyHuPCxlmfgGULfeSUmld8Wz2xvXn/exec?action=updateProfile&phone=9876543210&field=room&value=Room%20102
📥 Google Sheets Response: {success: true}
✅ Google Sheets updated successfully
📊 Sheets update result: true
```

### ❌ Failure Output:
```
📱 Loaded doctor info: {name: null, room: null, number: null, phone: null}
⚠️ No phone number available for sheets update
❌ Error updating profile in Google Sheets: TypeError: Cannot read property 'json' of undefined
```

---

## 🎯 Quick Checklist

- [ ] Console logs appear when saving
- [ ] Logs show correct phone number
- [ ] API URL is correct
- [ ] Google Sheets responds with success: true
- [ ] Data appears in Excel sheet after refresh
- [ ] Multiple fields update (name, room, number)
- [ ] Phone sync works
- [ ] App works offline (local save works)

---

## 📞 Need Help?

Check:
1. **Console logs** - They tell the whole story
2. **Network tab** - Shows if API is being called
3. **Google Sheets** - Manually refresh to see updates
4. **Phone number** - Must be 10 digits and match sheet
5. **App Script** - Must have `updateProfile` function

The logging I added will show you exactly where the process stops if something fails!

---

**Last Updated:** January 19, 2026  
**Status:** Ready to Debug & Test
