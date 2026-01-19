# 📋 ACTION REQUIRED - Google Sheets Setup

## ⚠️ Issue: Data Not Updating in Excel Sheet

The app is **configured** to send data to Google Sheets, but your **backend App Script** needs to handle the `updateProfile` action.

---

## 🔧 What You Need to Do

### Step 1: Check Your Google Sheets App Script

Go to your Google Sheet → **Extensions** → **Apps Script**

Look for a function like this:

```javascript
function doGet(e) {
  if (e.parameter.action === 'login') {
    // ... login code ...
  }
  
  // ❌ Check if this exists:
  if (e.parameter.action === 'updateProfile') {
    // ... THIS IS MISSING!
  }
}
```

---

### Step 2: Add the updateProfile Function

Your App Script needs to have this function added:

```javascript
function updateProfile(params) {
  try {
    const phone = params.phone;
    const field = params.field;
    const value = params.value;
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Doctors');
    const data = sheet.getDataRange().getValues();
    
    // Find row with matching phone number
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === phone) {
        // Update the field
        if (field === 'name') {
          sheet.getRange(i + 1, 2).setValue(value);
        } else if (field === 'room') {
          sheet.getRange(i + 1, 3).setValue(value);
        } else if (field === 'number') {
          sheet.getRange(i + 1, 4).setValue(value);
        }
        
        return { success: true };
      }
    }
    
    return { success: false, error: 'Phone not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
```

### Step 3: Update doGet Function

Add this code to your `doGet()` function:

```javascript
function doGet(e) {
  try {
    if (e.parameter.action === 'login') {
      return login(e.parameter);
    }
    
    // ✅ ADD THIS:
    if (e.parameter.action === 'updateProfile') {
      const result = updateProfile(e.parameter);
      return ContentService.createTextOutput(
        JSON.stringify(result)
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ... rest of your code ...
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 🗂️ Important: Verify Your Sheet Structure

Your Google Sheet must have these columns:

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Phone | Name | Room | Number |
| 9876543210 | Dr. John | 101 | 9876543210 |
| 9876543211 | Dr. Jane | 102 | 9876543211 |

- **Column A:** Phone number (unique identifier)
- **Column B:** Doctor's name
- **Column C:** Room number
- **Column D:** Phone number (same as column A)

---

## ✅ How It Works After Setup

```
1. User edits phone in app
                ↓
2. App saves locally (instant)
                ↓
3. App calls Google Sheets API
   ?action=updateProfile
   &phone=9876543210
   &field=number
   &value=9876543210
                ↓
4. Your Google Apps Script receives it
                ↓
5. Script finds row where Column A = 9876543210
                ↓
6. Script updates Column D with new value
                ↓
7. Script returns { success: true }
                ↓
8. App shows success alert
                ↓
9. Excel shows updated data ✓
```

---

## 🧪 Test It

### After implementing the backend:

1. **Open app profile**
2. **Edit phone number** (change from 9876543210 to 9876543211)
3. **Tap Save**
4. **Open Chrome DevTools** (`F12`)
5. **Go to Console tab**
6. **Look for these logs:**
   ```
   📤 Updating Google Sheets: {field: "number", value: "9876543211", phone: "9876543210"}
   📥 Google Sheets Response: {success: true}
   ✅ Google Sheets updated successfully
   ```
7. **Open your Google Sheet**
8. **Press F5 to refresh**
9. **Check if phone number updated** ✓

---

## 🚨 If It's Still Not Working

### Check 1: Is the function being called?
- Look for `📤 Updating Google Sheets` in console
- If NOT there: Phone number is missing locally
- Solution: Login first to ensure phone is saved

### Check 2: Is the API responding?
- Look for `📥 Google Sheets Response` in console
- If you see `{success: false}`: Backend error
- Check App Script implementation

### Check 3: Is the sheet name correct?
- Change `'Doctors'` to your actual sheet name
- Check capitalization
- Must match exactly

### Check 4: Are column numbers correct?
- Column A = 1 (phone)
- Column B = 2 (name)
- Column C = 3 (room)
- Column D = 4 (number)
- If different in your sheet, update numbers

---

## 📝 Sheet Name & Column Mapping

**IMPORTANT:** Update these in your App Script:

```javascript
// Change these to match YOUR sheet
const SHEET_NAME = 'Doctors';  // ← Your sheet name here
const PHONE_COLUMN = 1;         // Column A
const NAME_COLUMN = 2;          // Column B  
const ROOM_COLUMN = 3;          // Column C
const NUMBER_COLUMN = 4;        // Column D
```

---

## ✨ What the App Sends

When user updates phone from `9876543210` → `9876543211`:

```
API Call:
https://script.google.com/macros/s/AKfycbzBQL...
?action=updateProfile
&phone=9876543210
&field=number
&value=9876543211
```

Your backend needs to:
1. Find row where phone = `9876543210`
2. Update `number` field to `9876543211`
3. Return `{ success: true }`

---

## 🎯 Quick Summary

**App Side:** ✅ Done (I just implemented it)
- Sends data to Google Sheets API
- Logs every step in console
- Has error handling

**Your Side:** ⏳ TODO
- Add `updateProfile()` function to App Script
- Add `updateProfile` action handler in `doGet()`
- Verify sheet name and column numbers
- Test and verify data updates

---

## 📞 Support

Once you:
1. Add the backend function
2. Deploy the updated App Script
3. Test the integration

Everything should work! Data will automatically sync to Excel when you make changes in the app.

**Ready to implement?** Follow the steps above! 🚀
