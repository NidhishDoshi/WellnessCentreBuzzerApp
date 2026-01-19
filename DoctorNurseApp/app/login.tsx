import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { CustomAlert } from '../components/CustomAlert';

const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzBQLrPT7d7RySISRrxWC_wZfdDEWFDwcIKb39lyHuPCxlmfgGULfeSUmld8Wz2xvXn/exec';
export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    type: 'error',
    title: '',
    message: '',
  });

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('doctorLoggedIn');
      const savedPhone = await AsyncStorage.getItem('doctorPhone');
      const savedName = await AsyncStorage.getItem('doctorName');
      const savedRoom = await AsyncStorage.getItem('doctorRoom');

      // If all required data exists, auto-login
      if (loggedIn === 'true' && savedPhone && savedName && savedRoom) {
        console.log('✅ Auto-login: Session found for', savedName);
        // Navigate directly to home
        router.replace('/(doctor)/home');
      } else {
        // No valid session, show login form
        setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsCheckingAuth(false);
    }
  };

  const hashPIN = async (pinText: string): Promise<string> => {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pinText
    );
    return hash;
  };

  const handleLogin = async () => {
    setError('');

    if (phoneNumber.length !== 10) {
      setError('Invalid number');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setIsLoading(true);

    try {
      const hashedPIN = await hashPIN(pin);

      const response = await fetch(
        `${GOOGLE_SHEETS_API_URL}?action=login&phone=${phoneNumber}&pin=${hashedPIN}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Store all login data as strings
        await AsyncStorage.multiSet([
          ['doctorLoggedIn', 'true'],
          ['doctorPhone', String(phoneNumber)],
          ['doctorName', String(data.doctorName || 'Doctor')],
          ['doctorRoom', String(data.roomNumber || 'Room')],
          ['loginTimestamp', new Date().toISOString()],
        ]);

        console.log('✅ Login successful:', data.doctorName);

        // Navigate to home
        router.replace('/(doctor)/home');
      } else {
        setError(data.message || 'Invalid phone number or PIN');
        setIsLoading(false);
        setPin('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection failed. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 10) {
      setPhoneNumber(numericText);
      setError('');
    }
  };

  const handlePinChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setPin(numericText);
      setError('');
    }
  };

  const isFormValid = phoneNumber.length === 10 && pin.length === 4;

  // Show loading screen while checking for existing session
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>IIT-DH</Text>
        </View>
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>IIT-DH</Text>
          </View>
          <Text style={styles.instituteName}>IIT Dharwad</Text>
          <Text style={styles.subtitle}>Medical Services</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Doctor Login</Text>
          
          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneWrapper}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefix}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#9CA3AF"
                autoFocus
                editable={!isLoading}
              />
            </View>
          </View>

          {/* PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Security PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor="#9CA3AF"
              editable={!isLoading}
            />
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (!isFormValid || isLoading) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Authorized medical personnel only
        </Text>
      </ScrollView>

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        confirmText="OK"
        onConfirm={() => setShowAlert(false)}
        onCancel={() => setShowAlert(false)}
        singleButton={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  instituteName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  phoneWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  prefixBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '600',
    letterSpacing: 6,
    textAlign: 'center',
  },

  // Error
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },

  // Login Button
  loginButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  loginButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Forgot Password
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },

  // Footer
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});