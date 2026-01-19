// app/(doctor)/profile.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPIN, comparePINWithHash } from '../../utils/crypto';
import { CustomAlert } from '../../components/CustomAlert';

const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzBQLrPT7d7RySISRrxWC_wZfdDEWFDwcIKb39lyHuPCxlmfgGULfeSUmld8Wz2xvXn/exec';
type EditField = 'name' | 'number' | 'room' | 'pin' | null;

export default function ProfileScreen() {
  const [doctorName, setDoctorName] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [doctorNumber, setDoctorNumber] = useState('');
  const [editingField, setEditingField] = useState<EditField>(null);
  const [tempValue, setTempValue] = useState('');
  const [tempError, setTempError] = useState('');
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingPIN, setVerifyingPIN] = useState(false);
  const [storedPINHash, setStoredPINHash] = useState<string | null>(null);
  const [showPINModal, setShowPINModal] = useState(false);
  const [logoutAlert, setLogoutAlert] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadDoctorInfo();
  }, []);

  const loadDoctorInfo = async () => {
    try {
      const [name, room, number, phone, pinHash] = await Promise.all([
        AsyncStorage.getItem('doctorName'),
        AsyncStorage.getItem('doctorRoom'),
        AsyncStorage.getItem('doctorNumber'),
        AsyncStorage.getItem('doctorPhone'),
        AsyncStorage.getItem('doctorPINHash'),
      ]);

      console.log('📱 Loaded doctor info:', { name, room, number, phone });
      
      if (name) setDoctorName(name);
      if (room) setDoctorRoom(room);
      
      // Sync phone and number - use whichever is available, prefer doctorNumber
      const syncedNumber = number || phone;
      if (syncedNumber) {
        console.log('✓ Synced phone number:', syncedNumber);
        setDoctorNumber(syncedNumber);
        // Keep both in sync
        await AsyncStorage.multiSet([
          ['doctorNumber', syncedNumber],
          ['doctorPhone', syncedNumber],
        ]);
      }
      
      if (pinHash) setStoredPINHash(pinHash);
    } catch (error) {
      console.error('Error loading doctor info:', error);
    }
  };

  const fetchPINFromGoogleSheets = async (doctorId: string) => {
    try {
      // TODO: Implement API call to your backend
      // const response = await fetch(
      //   `${process.env.EXPO_PUBLIC_API_URL}/doctor/${doctorId}/pin`
      // );
      // const data = await response.json();
      // return data.pin;
      return null;
    } catch (error) {
      console.error('Error fetching PIN from Google Sheets:', error);
      return null;
    }
  };

  const updateDoctorInfoInSheets = async (field: string, value: string, phone: string) => {
    try {
      console.log('📤 Updating Google Sheets:', { field, value, phone });
      
      const url = `${GOOGLE_SHEETS_API_URL}?action=updateProfile&phone=${encodeURIComponent(phone)}&field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`;
      console.log('API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Google Sheets Response:', data);
      
      if (data.success) {
        console.log('✅ Google Sheets updated successfully');
        return true;
      } else {
        console.warn('⚠️ Google Sheets update returned success:false', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating profile in Google Sheets:', error);
      // Still return true for local success even if sheets fails
      // User data is saved locally
      return true;
    }
  };

  const handleEditFieldStart = (field: EditField, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
    setTempError('');
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const numericPhone = phone.replace(/[^0-9]/g, '');
    return numericPhone.length === 10;
  };

  const handlePhoneInputChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 10) {
      setTempValue(numericText);
      if (numericText.length === 10) {
        setTempError('');
      }
    }
  };

  const handlePINChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      return numericText;
    }
    return text.slice(0, 4);
  };

  const handleSaveField = async () => {
    if (!tempValue.trim()) {
      setTempError('Field cannot be empty');
      return;
    }

    // Validate phone number
    if (editingField === 'number') {
      if (!validatePhoneNumber(tempValue)) {
        setTempError('Invalid number');
        return;
      }
    }

    try {
      setLoading(true);

      // Get the phone number for API call
      let phoneToUse = doctorNumber;
      
      console.log('💾 Saving field:', { field: editingField, value: tempValue, phoneToUse });
      
      // Update local storage
      if (editingField === 'name') {
        setDoctorName(tempValue);
        await AsyncStorage.setItem('doctorName', tempValue);
        console.log('✓ Name saved to AsyncStorage');
      } else if (editingField === 'room') {
        setDoctorRoom(tempValue);
        await AsyncStorage.setItem('doctorRoom', tempValue);
        console.log('✓ Room saved to AsyncStorage');
      } else if (editingField === 'number') {
        setDoctorNumber(tempValue);
        phoneToUse = tempValue;
        // Sync with doctorPhone (from login)
        await AsyncStorage.setItem('doctorPhone', tempValue);
        await AsyncStorage.setItem('doctorNumber', tempValue);
        console.log('✓ Phone saved to AsyncStorage and synced');
      }

      // Update in Google Sheets
      if (phoneToUse) {
        console.log('📡 Calling Google Sheets API...');
        const sheetsUpdateSuccess = await updateDoctorInfoInSheets(editingField || '', tempValue, phoneToUse);
        console.log('📊 Sheets update result:', sheetsUpdateSuccess);
      } else {
        console.warn('⚠️ No phone number available for sheets update');
      }

      setSuccessMessage(
        `${editingField?.charAt(0).toUpperCase()}${editingField?.slice(1)} updated successfully`
      );
      setSuccessAlert(true);
      setEditingField(null);
      setTempValue('');
      setTempError('');
    } catch (error) {
      console.error('Error saving field:', error);
      setTempError(`Failed to update ${editingField}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePIN = async () => {
    if (!currentPIN.trim()) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter your current PIN',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
      return;
    }

    if (!newPIN.trim()) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a new PIN',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
      return;
    }

    if (newPIN !== confirmPIN) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'New PINs do not match',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
      return;
    }

    if (newPIN.length !== 4) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'PIN must be exactly 4 digits',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
      return;
    }

    try {
      setVerifyingPIN(true);

      // Verify current PIN
      const isCorrect = await comparePINWithHash(currentPIN, storedPINHash || '');

      if (!isCorrect) {
        setCustomAlert({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Current PIN is incorrect',
          confirmText: 'OK',
          onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
        });
        setVerifyingPIN(false);
        return;
      }

      // Hash new PIN
      const newPINHash = await hashPIN(newPIN);

      // Save to local storage
      await AsyncStorage.setItem('doctorPINHash', newPINHash);
      setStoredPINHash(newPINHash);

      // TODO: Update PIN in Google Sheets
      // await updatePINInSheets(newPINHash);

      // Reset form
      setCurrentPIN('');
      setNewPIN('');
      setConfirmPIN('');
      setShowPINModal(false);

      setCustomAlert({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'PIN changed successfully',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
    } catch (error) {
      console.error('Error changing PIN:', error);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to change PIN',
        confirmText: 'OK',
        onConfirm: () => setCustomAlert({ ...customAlert, visible: false }),
      });
    } finally {
      setVerifyingPIN(false);
    }
  };

  const handleLogout = async () => {
    setLogoutAlert(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'doctorName',
        'doctorRoom',
        'doctorNumber',
        'doctorId',
        'doctorPINHash',
      ]);
      setLogoutAlert(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      setLogoutAlert(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {/* Display Name - Not Editable */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Title</Text>
            <View style={[styles.fieldValue, styles.displayField]}>
              <Text style={styles.fieldValueText}>Dr. {doctorName || '---'}</Text>
            </View>
          </View>

          {/* Name Field - Editable */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TouchableOpacity
              style={styles.fieldValue}
              onPress={() => handleEditFieldStart('name', doctorName)}
            >
              <Text style={styles.fieldValueText}>{doctorName || 'Not set'}</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Room Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Room</Text>
            <TouchableOpacity
              style={styles.fieldValue}
              onPress={() => handleEditFieldStart('room', doctorRoom)}
            >
              <Text style={styles.fieldValueText}>{doctorRoom || 'Not set'}</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Phone Number Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TouchableOpacity
              style={styles.fieldValue}
              onPress={() => handleEditFieldStart('number', doctorNumber)}
            >
              <Text style={styles.fieldValueText}>
                {doctorNumber ? `+91 ${doctorNumber}` : 'Not set'}
              </Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          {/* Change PIN Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowPINModal(true)}
          >
            <Text style={styles.buttonText}>Change PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutButtonText]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal visible={editingField !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editingField === 'name' ? 'Name' : editingField === 'room' ? 'Room' : 'Phone Number'}
            </Text>

            {editingField === 'number' ? (
              <View style={styles.phoneEditWrapper}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneEditInput}
                  placeholder="Enter 10-digit number"
                  value={tempValue}
                  onChangeText={handlePhoneInputChange}
                  editable={!loading}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder={`Enter ${editingField}`}
                value={tempValue}
                onChangeText={(text) => {
                  setTempValue(text);
                  setTempError('');
                }}
                editable={!loading}
              />
            )}

            {tempError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {tempError}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditingField(null);
                  setTempValue('');
                  setTempError('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveField}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change PIN Modal */}
      <Modal visible={showPINModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalContent}>
            <Text style={styles.modalTitle}>Change PIN</Text>

            <TextInput
              style={styles.input}
              placeholder="Current PIN"
              value={currentPIN}
              onChangeText={(text) => setCurrentPIN(handlePINChange(text))}
              secureTextEntry
              editable={!verifyingPIN}
              keyboardType="number-pad"
              maxLength={4}
            />

            <TextInput
              style={styles.input}
              placeholder="New PIN"
              value={newPIN}
              onChangeText={(text) => setNewPIN(handlePINChange(text))}
              secureTextEntry
              editable={!verifyingPIN}
              keyboardType="number-pad"
              maxLength={4}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New PIN"
              value={confirmPIN}
              onChangeText={(text) => setConfirmPIN(handlePINChange(text))}
              secureTextEntry
              editable={!verifyingPIN}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Text style={styles.pinHint}>PIN must be exactly 4 digits</Text>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPINModal(false);
                  setCurrentPIN('');
                  setNewPIN('');
                  setConfirmPIN('');
                }}
                disabled={verifyingPIN}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePIN}
                disabled={verifyingPIN}
              >
                {verifyingPIN ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Alert */}
      <CustomAlert
        visible={logoutAlert}
        title="Logout"
        message="Are you sure you want to logout from your account?"
        type="warning"
        confirmText="Logout"
        cancelText="Stay"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutAlert(false)}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={successAlert}
        title="Success"
        message={successMessage}
        type="success"
        confirmText="Done"
        onConfirm={() => setSuccessAlert(false)}
        onCancel={() => setSuccessAlert(false)}
        singleButton={true}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText={customAlert.confirmText || 'OK'}
        onConfirm={customAlert.onConfirm || (() => setCustomAlert({ ...customAlert, visible: false }))}
        onCancel={() => setCustomAlert({ ...customAlert, visible: false })}
        singleButton={customAlert.type === 'success' || customAlert.type === 'error' || customAlert.type === 'info'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  displayField: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
  },
  fieldValueText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingTop: 32,
  },
  pinModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingTop: 32,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  phoneEditWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  phonePrefix: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  phoneEditInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  pinHint: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#0066CC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
