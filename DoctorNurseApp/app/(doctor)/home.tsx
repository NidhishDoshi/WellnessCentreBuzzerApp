// app/(doctor)/home.tsx

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Animated,
  Platform,
  Vibration,
  AppState,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import {
  initSocket,
  disconnectSocket,
  sendDoctorCall,
  completeCall,
  addConnectionListener,
  isConnected,
} from '../../utils/socket';

type CallStatus = 'idle' | 'active';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'warning' | 'success' | 'info' | 'error';
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  singleButton?: boolean;
};

// Custom Alert Component
function CustomAlert({
  visible,
  title,
  message,
  type,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  singleButton = false,
}: CustomAlertProps) {
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const getIconAndColor = () => {
    switch (type) {
      case 'confirm':
        return { icon: '🔔', color: '#0066CC', bgColor: '#EFF6FF' };
      case 'warning':
        return { icon: '⚠️', color: '#DC2626', bgColor: '#FEF2F2' };
      case 'success':
        return { icon: '✓', color: '#059669', bgColor: '#F0FDF4' };
      case 'info':
        return { icon: 'ℹ️', color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'error':
        return { icon: '📡', color: '#DC2626', bgColor: '#FEF2F2' };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          {/* Title */}
          <Text style={styles.alertTitle}>{title}</Text>

          {/* Message */}
          <Text style={styles.alertMessage}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {!singleButton && (
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.alertButton,
                styles.confirmButton,
                { backgroundColor: color },
                singleButton && { flex: 1 },
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function DoctorHomeScreen() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callTime, setCallTime] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [doctorName, setDoctorName] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);
  const [showNetworkError, setShowNetworkError] = useState(false);

  const currentCallId = useRef<string | number | null>(null);
  const appState = useRef(AppState.currentState);

  // Alert states
  const [callNurseAlert, setCallNurseAlert] = useState(false);
  const [attendedAlert, setAttendedAlert] = useState(false);
  const [logoutAlert, setLogoutAlert] = useState(false);
  const [timerExpiredAlert, setTimerExpiredAlert] = useState(false);
  const [autoMarkAlert, setAutoMarkAlert] = useState(false);

  // Load persisted call state on mount
  useEffect(() => {
    loadPersistedCallState();
  }, []);

  // Save call state whenever it changes
  useEffect(() => {
    saveCallState();
  }, [callStatus, callTime]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - restore timer and hide any network error alerts
        console.log('App came to foreground - restoring timer');
        loadPersistedCallState();
        setShowNetworkError(false); // Hide network error alert on resume
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadPersistedCallState = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem('callStatus');
      const savedCallTime = await AsyncStorage.getItem('callTime');
      const savedCallId = await AsyncStorage.getItem('currentCallId');

      if (savedStatus === 'active' && savedCallTime) {
        const startTime = new Date(savedCallTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = 600 - elapsedSeconds;

        setCallStatus('active');
        setCallTime(startTime);
        setRemainingSeconds(remaining);
        
        if (savedCallId) {
          currentCallId.current = parseInt(savedCallId);
        }

        console.log('Restored call state:', {
          startTime,
          elapsedSeconds,
          remaining
        });
      }
    } catch (error) {
      console.error('Error loading call state:', error);
    }
  };

  const saveCallState = async () => {
    try {
      await AsyncStorage.setItem('callStatus', callStatus);
      if (callTime) {
        await AsyncStorage.setItem('callTime', callTime.toISOString());
      } else {
        await AsyncStorage.removeItem('callTime');
      }
      if (currentCallId.current) {
        await AsyncStorage.setItem('currentCallId', String(currentCallId.current));
      } else {
        await AsyncStorage.removeItem('currentCallId');
      }
    } catch (error) {
      console.error('Error saving call state:', error);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    initSocket();

    const unsubscribe = addConnectionListener((connected) => {
      setServerConnected(connected);
      console.log('Server connection status:', connected);
      
      // Show network error if disconnected
      if (!connected) {
        setShowNetworkError(true);
      }
    });

    setServerConnected(isConnected());

    return () => {
      unsubscribe();
    };
  }, []);

  // Load doctor data and setup audio
  useEffect(() => {
    loadDoctorData();
    setupAudio();
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Audio setup error:', error);
    }
  };

  const loadDoctorData = async () => {
    try {
      const name = await AsyncStorage.getItem('doctorName');
      const room = await AsyncStorage.getItem('doctorRoom');
      const formattedRoom = room 
        ? (room.startsWith('Room') ? room : `Room ${room}`)
        : 'Room';
      
      setDoctorName(name || 'Doctor');
      setDoctorRoom(formattedRoom);
    } catch (error) {
      console.error('Error loading doctor data:', error);
    }
  };

  const playNotificationSound = async (type: 'success' | 'warning' | 'info') => {
    if (!soundEnabled) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );

      if (type === 'success') {
        Vibration.vibrate([0, 200, 100, 200]);
      } else if (type === 'warning') {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      } else if (type === 'info') {
        Vibration.vibrate(400);
      }

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Notification sound error:', error);
      Vibration.vibrate(400);
    }
  };

  const handleCallNursePress = () => {
    // Check if server is connected before showing confirmation
    if (!serverConnected) {
      setShowNetworkError(true);
      return;
    }
    setCallNurseAlert(true);
  };

  const handleConfirmCallNurse = async () => {
    setCallNurseAlert(false);
    
    const callId = Date.now();
    currentCallId.current = callId;
    
    const sent = sendDoctorCall({
      doctorId: callId,
      doctorName: doctorName,
      room: doctorRoom.replace('Room ', ''),
    });
    
    if (!sent) {
      console.warn('Failed to send call to server - not connected');
      setShowNetworkError(true);
    }
    
    const startTime = new Date();
    setCallStatus('active');
    setCallTime(startTime);
    setRemainingSeconds(600);
    await playNotificationSound('success');
  };

  const handleMarkAttendedPress = () => {
    setAttendedAlert(true);
  };

  const handleConfirmAttended = async () => {
    setAttendedAlert(false);
    
    if (currentCallId.current) {
      const completed = completeCall(currentCallId.current);
      if (!completed) {
        console.warn('Failed to complete call on server - not connected');
      }
      currentCallId.current = null;
    }
    
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
    
    // Clear persisted state
    await AsyncStorage.removeItem('callStatus');
    await AsyncStorage.removeItem('callTime');
    await AsyncStorage.removeItem('currentCallId');
    
    await playNotificationSound('success');
  };

  const handleLogoutPress = () => {
    setLogoutAlert(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutAlert(false);
    try {
      // FIXED: Only clear authentication data, NOT call state
      // This allows the timer to persist across logout/login
      await AsyncStorage.multiRemove([
        'doctorLoggedIn',
        'doctorPhone',
        'doctorName',
        'doctorRoom',
        // Removed: 'callStatus', 'callTime', 'currentCallId'
      ]);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCallAgain = async () => {
    setTimerExpiredAlert(false);
    
    if (currentCallId.current) {
      completeCall(currentCallId.current);
    }
    
    const newCallId = Date.now();
    currentCallId.current = newCallId;
    
    sendDoctorCall({
      doctorId: newCallId,
      doctorName: doctorName,
      room: doctorRoom.replace('Room ', ''),
    });
    
    const newStartTime = new Date();
    setCallTime(newStartTime);
    setRemainingSeconds(600);
    await playNotificationSound('info');
  };

  const handleDontCallAgain = async () => {
    setTimerExpiredAlert(false);
    
    if (currentCallId.current) {
      completeCall(currentCallId.current);
      currentCallId.current = null;
    }
    
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
    
    await AsyncStorage.removeItem('callStatus');
    await AsyncStorage.removeItem('callTime');
    await AsyncStorage.removeItem('currentCallId');
    
    await playNotificationSound('success');
  };

  const handleAutoMarkOk = async () => {
    setAutoMarkAlert(false);
    
    if (currentCallId.current) {
      completeCall(currentCallId.current);
      currentCallId.current = null;
    }
    
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
    
    await AsyncStorage.removeItem('callStatus');
    await AsyncStorage.removeItem('callTime');
    await AsyncStorage.removeItem('currentCallId');
  };

  const handleNetworkErrorOk = () => {
    setShowNetworkError(false);
  };

  const getFormattedTime = () => {
    const absSeconds = Math.abs(remainingSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Main timer effect - updates every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (callStatus === 'active' && callTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - callTime.getTime()) / 1000);
        const remaining = 600 - elapsedSeconds;
        setRemainingSeconds(remaining);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus, callTime]);

  // Check for 2 minute warning
  useEffect(() => {
    if (callStatus === 'active' && remainingSeconds === 120) {
      playNotificationSound('info');
    }
  }, [remainingSeconds, callStatus]);

  // Check for 10 minute mark (timer expired)
  useEffect(() => {
    if (callStatus === 'active' && remainingSeconds === 0) {
      setTimerExpiredAlert(true);
      playNotificationSound('warning');
    }
  }, [remainingSeconds, callStatus]);

  // Check for 20 minute mark (auto mark attended)
  useEffect(() => {
    if (callStatus === 'active' && remainingSeconds === -600) {
      setAutoMarkAlert(true);
      playNotificationSound('warning');
      
      if (currentCallId.current) {
        completeCall(currentCallId.current);
        currentCallId.current = null;
      }
      
      setTimeout(async () => {
        setCallStatus('idle');
        setCallTime(null);
        setRemainingSeconds(600);
        await AsyncStorage.removeItem('callStatus');
        await AsyncStorage.removeItem('callTime');
        await AsyncStorage.removeItem('currentCallId');
      }, 3000);
    }
  }, [remainingSeconds, callStatus]);

  const getTimerColor = () => {
    if (remainingSeconds <= 0) return '#DC2626';
    if (remainingSeconds <= 120) return '#F59E0B';
    return '#0066CC';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <View style={styles.roomAndStatusRow}>
            <Text style={styles.roomNumber}>{doctorRoom}</Text>
            <View style={[styles.connectionIndicator, serverConnected && styles.connectionIndicatorConnected]}>
              <View style={[styles.connectionDot, serverConnected && styles.connectionDotConnected]} />
              <Text style={[styles.connectionText, serverConnected && styles.connectionTextConnected]}>
                {serverConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.soundButton}
            onPress={() => setSoundEnabled(!soundEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.soundIcon}>
              {soundEnabled ? '🔔' : '🔕'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Status Display */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <View
            style={[
              styles.statusBadge,
              callStatus === 'active' && styles.statusBadgeActive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                callStatus === 'active' && styles.statusDotActive,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                callStatus === 'active' && styles.statusTextActive,
              ]}
            >
              {callStatus === 'idle' ? 'No Active Calls' : 'Nurse Called'}
            </Text>
          </View>

          {callStatus === 'active' && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>
                {remainingSeconds > 0 ? 'Time Remaining' : 'Time Exceeded'}
              </Text>
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {remainingSeconds >= 0 ? getFormattedTime() : `-${getFormattedTime()}`}
              </Text>
              {remainingSeconds <= 120 && remainingSeconds > 0 && (
                <Text style={styles.warningText}>⏰ Nurse should arrive soon</Text>
              )}
              {remainingSeconds <= 0 && (
                <Text style={styles.expiredText}>
                  ⚠️ Expected time has passed
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Call Button or Attended Button */}
        {callStatus === 'idle' ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallNursePress}
            activeOpacity={0.8}
          >
            <Text style={styles.callButtonText}>Call Nurse</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeCallContainer}>
            <View style={styles.waitingIndicator}>
              <Text style={styles.waitingText}>
                {remainingSeconds > 0
                  ? '🏥 Waiting for nurse...'
                  : '⏱️ Taking longer than expected'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.attendedButton}
              onPress={handleMarkAttendedPress}
              activeOpacity={0.8}
            >
              <Text style={styles.attendedButtonText}>Mark as Attended</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Text */}
        <Text style={styles.infoText}>
          {callStatus === 'idle'
            ? 'Press the button above to call a nurse to your room'
            : 'A nurse will arrive shortly. Press "Mark as Attended" when done'}
        </Text>
      </View>

      {/* Custom Alerts */}
      <CustomAlert
        visible={callNurseAlert}
        title="Call Nurse"
        message="Are you sure you want to call a nurse to your room?"
        type="confirm"
        confirmText="Yes, Call"
        cancelText="Cancel"
        onConfirm={handleConfirmCallNurse}
        onCancel={() => setCallNurseAlert(false)}
      />

      <CustomAlert
        visible={attendedAlert}
        title="Mark as Attended"
        message="Confirm that the nurse has attended to your call?"
        type="success"
        confirmText="Yes, Attended"
        cancelText="Not Yet"
        onConfirm={handleConfirmAttended}
        onCancel={() => setAttendedAlert(false)}
      />

      <CustomAlert
        visible={timerExpiredAlert}
        title="Expected Time Reached"
        message="The expected 10-minute wait time has passed. Would you like to call the nurse again or mark as attended?"
        type="info"
        confirmText="Call Again"
        cancelText="Mark Attended"
        onConfirm={handleCallAgain}
        onCancel={handleDontCallAgain}
      />

      <CustomAlert
        visible={autoMarkAlert}
        title="Auto-Marked as Attended"
        message="The call has been active for 20 minutes and has been automatically marked as attended."
        type="info"
        confirmText="OK"
        cancelText=""
        singleButton={true}
        onConfirm={handleAutoMarkOk}
        onCancel={handleAutoMarkOk}
      />

      <CustomAlert
        visible={showNetworkError}
        title="Connection Error"
        message="Please connect to IITDH Intranet (WiFi) or the server is offline."
        type="error"
        confirmText="OK"
        cancelText=""
        singleButton={true}
        onConfirm={handleNetworkErrorOk}
        onCancel={handleNetworkErrorOk}
      />

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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    fontSize: 20,
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  roomAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomNumber: {
    fontSize: 16,
    color: '#666666',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  connectionIndicatorConnected: {
    backgroundColor: '#D1FAE5',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
    marginRight: 4,
  },
  connectionDotConnected: {
    backgroundColor: '#059669',
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  connectionTextConnected: {
    color: '#059669',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeActive: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  statusTextActive: {
    color: '#92400E',
  },
  timerContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
  },
  expiredText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 8,
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 64,
  },
  callButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeCallContainer: {
    marginBottom: 24,
  },
  waitingIndicator: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#92400E',
    textAlign: 'center',
  },
  attendedButton: {
    backgroundColor: '#059669',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  attendedButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 36,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  alertMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#0066CC',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});