import { useState, useEffect, useRef } from 'react';
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

const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzBQLrPT7d7RySISRrxWC_wZfdDEWFDwcIKb39lyHuPCxlmfgGULfeSUmld8Wz2xvXn/exec';

// Forgot password steps
const FORGOT_PASSWORD_STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  NEW_PIN: 'new_pin'
};

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  
  // Forgot password states
  const [forgotPasswordStep, setForgotPasswordStep] = useState(FORGOT_PASSWORD_STEPS.EMAIL);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start countdown timer
    if (timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer]);

  const checkExistingSession = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('doctorLoggedIn');
      const savedPhone = await AsyncStorage.getItem('doctorPhone');
      const savedName = await AsyncStorage.getItem('doctorName');
      const savedRoom = await AsyncStorage.getItem('doctorRoom');

      if (loggedIn === 'true' && savedPhone && savedName && savedRoom) {
        console.log('✅ Auto-login: Session found for', savedName);
        router.replace('/(doctor)/home');
      } else {
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

  const validateEmail = (value: string) => {
    return /^\S+@\S+\.\S+$/.test(value);
  };

  const startTimer = (seconds: number) => {
    setTimer(seconds);
    setCanResend(false);
  };

  const handleLogin = async () => {
    setError('');
    setSuccessMessage('');

    if (phoneNumber.length !== 10) {
      setError('Phone number must be 10 digits');
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
        await AsyncStorage.multiSet([
          ['doctorLoggedIn', 'true'],
          ['doctorPhone', String(phoneNumber)],
          ['doctorName', String(data.doctorName || 'Doctor')],
          ['doctorRoom', String(data.roomNumber || 'Room')],
          ['loginTimestamp', new Date().toISOString()],
        ]);

        console.log('✅ Login successful:', data.doctorName);
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

  const handleSignup = async () => {
    setError('');
    setSuccessMessage('');

    if (phoneNumber.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (!doctorName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomNumber.trim()) {
      setError('Please enter room number');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);

    try {
      const hashedPIN = await hashPIN(pin);

      const requestBody = {
        action: 'register',
        phone: phoneNumber,
        pinHash: hashedPIN,
        doctorName: doctorName.trim(),
        roomNumber: roomNumber.trim(),
        email: email.trim()
      };

      console.log('Signup request:', requestBody);

      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Signup response:', data);

      if (data.success) {
        await AsyncStorage.multiSet([
          ['doctorLoggedIn', 'true'],
          ['doctorPhone', String(phoneNumber)],
          ['doctorName', String(doctorName.trim())],
          ['doctorRoom', String(roomNumber.trim())],
          ['doctorEmail', String(email.trim())],
          ['loginTimestamp', new Date().toISOString()],
        ]);

        console.log('✅ Signup successful:', doctorName);
        router.replace('/(doctor)/home');
      } else {
        setError(data.message || 'Signup failed');
        setIsLoading(false);
        setPin('');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Connection failed. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setError('');
    setSuccessMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${GOOGLE_SHEETS_API_URL}?action=sendOTP&email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`OTP sent to ${email}`);
        setForgotPasswordStep(FORGOT_PASSWORD_STEPS.OTP);
        startTimer(120); // 2 minutes timer
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifyOTP',
          email: email,
          otp: otp
        })
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage('OTP verified! Please set your new PIN');
        setForgotPasswordStep(FORGOT_PASSWORD_STEPS.NEW_PIN);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccessMessage('');

    if (newPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      const hashedPIN = await hashPIN(newPin);

      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          email: email,
          otp: otp,
          newPin: hashedPIN
        })
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Password reset successful! Please login with your new PIN');
        setTimeout(() => {
          resetForgotPasswordFlow();
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotPasswordFlow = () => {
    setIsForgotPasswordMode(false);
    setForgotPasswordStep(FORGOT_PASSWORD_STEPS.EMAIL);
    setEmail('');
    setOtp('');
    setNewPin('');
    setConfirmNewPin('');
    setError('');
    setSuccessMessage('');
    setTimer(0);
    setCanResend(false);
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

  const handleOtpChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setOtp(numericText);
      setError('');
    }
  };

  const handleNewPinChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setNewPin(numericText);
      setError('');
    }
  };

  const handleConfirmNewPinChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setConfirmNewPin(numericText);
      setError('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFormValid = phoneNumber.length === 10 && pin.length === 4;
  const isSignupFormValid = 
    phoneNumber.length === 10 && 
    pin.length === 4 && 
    doctorName.trim().length > 0 &&
    roomNumber.trim().length > 0 &&
    validateEmail(email);

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

        {/* Login / Signup / Forgot Password Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSignup ? 'Sign Up' : isForgotPasswordMode ? 'Reset Password' : 'Doctor Login'}
          </Text>

          {isForgotPasswordMode ? (
            <>
              {/* STEP 1: Enter Email */}
              {forgotPasswordStep === FORGOT_PASSWORD_STEPS.EMAIL && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(''); setSuccessMessage(''); }}
                      keyboardType="email-address"
                      placeholder="Enter your registered email"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                      autoCapitalize="none"
                    />
                  </View>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>⚠ {error}</Text>
                    </View>
                  ) : null}

                  {successMessage ? (
                    <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderLeftColor: '#059669' }]}>
                      <Text style={[styles.errorText, { color: '#065F46' }]}>{successMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.loginButton, (!validateEmail(email) || isLoading) && styles.loginButtonDisabled]}
                    onPress={handleSendOTP}
                    disabled={!validateEmail(email) || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* STEP 2: Enter OTP */}
              {forgotPasswordStep === FORGOT_PASSWORD_STEPS.OTP && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter OTP</Text>
                    <Text style={styles.helperText}>OTP sent to {email}</Text>
                    <TextInput
                      style={styles.otpInput}
                      value={otp}
                      onChangeText={handleOtpChange}
                      keyboardType="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                    />
                  </View>

                  {timer > 0 && (
                    <View style={styles.timerBox}>
                      <Text style={styles.timerText}>⏱ OTP expires in {formatTime(timer)}</Text>
                    </View>
                  )}

                  {canResend && (
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleSendOTP}
                      disabled={isLoading}
                    >
                      <Text style={styles.resendText}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}

                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>⚠ {error}</Text>
                    </View>
                  ) : null}

                  {successMessage ? (
                    <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderLeftColor: '#059669' }]}>
                      <Text style={[styles.errorText, { color: '#065F46' }]}>{successMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.loginButton, (otp.length !== 6 || isLoading) && styles.loginButtonDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={otp.length !== 6 || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* STEP 3: Set New PIN */}
              {forgotPasswordStep === FORGOT_PASSWORD_STEPS.NEW_PIN && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New 4-digit PIN</Text>
                    <TextInput
                      style={styles.pinInput}
                      value={newPin}
                      onChangeText={handleNewPinChange}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                      placeholder="Enter new PIN"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New PIN</Text>
                    <TextInput
                      style={styles.pinInput}
                      value={confirmNewPin}
                      onChangeText={handleConfirmNewPinChange}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                      placeholder="Re-enter new PIN"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                    />
                  </View>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>⚠ {error}</Text>
                    </View>
                  ) : null}

                  {successMessage ? (
                    <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderLeftColor: '#059669' }]}>
                      <Text style={[styles.errorText, { color: '#065F46' }]}>{successMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      (newPin.length !== 4 || confirmNewPin.length !== 4 || isLoading) && styles.loginButtonDisabled
                    ]}
                    onPress={handleResetPassword}
                    disabled={newPin.length !== 4 || confirmNewPin.length !== 4 || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={resetForgotPasswordFlow}
              >
                <Text style={styles.forgotPasswordText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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

              {/* Signup Fields */}
              {isSignup && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Doctor Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={doctorName}
                      onChangeText={(t) => { setDoctorName(t); setError(''); }}
                      placeholder="Enter your name"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Room Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={roomNumber}
                      onChangeText={(t) => { setRoomNumber(t); setError(''); }}
                      placeholder="e.g., 301, ICU-2"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(''); }}
                      keyboardType="email-address"
                      placeholder="Enter email"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}

              {/* Error / Success Message */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderLeftColor: '#059669' }]}>
                  <Text style={[styles.errorText, { color: '#065F46' }]}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Login / Signup Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  ((isSignup && !isSignupFormValid) || (!isSignup && !isFormValid) || isLoading) && styles.loginButtonDisabled,
                ]}
                onPress={isSignup ? handleSignup : handleLogin}
                disabled={(isSignup ? !isSignupFormValid : !isFormValid) || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>{isSignup ? 'Create Account' : 'Sign In'}</Text>
                )}
              </TouchableOpacity>

              {/* Secondary actions */}
              {!isSignup && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => {
                    setIsForgotPasswordMode(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => { 
                  setIsSignup(!isSignup); 
                  setError(''); 
                  setSuccessMessage('');
                  if (!isSignup) {
                    setDoctorName('');
                    setRoomNumber('');
                    setEmail('');
                  }
                }}
              >
                <Text style={styles.forgotPasswordText}>
                  {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Authorized medical personnel only
        </Text>
      </ScrollView>
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

  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
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
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },

  timerBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },

  resendButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

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

  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },

  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});