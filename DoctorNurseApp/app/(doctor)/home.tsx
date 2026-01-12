// app/(doctor)/home.tsx

import { useState, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

type CallStatus = 'idle' | 'active';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'warning' | 'success' | 'info';
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
  const [remainingSeconds, setRemainingSeconds] = useState(600); // 10 minutes = 600 seconds
  const [doctorName, setDoctorName] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Alert states
  const [callNurseAlert, setCallNurseAlert] = useState(false);
  const [attendedAlert, setAttendedAlert] = useState(false);
  const [logoutAlert, setLogoutAlert] = useState(false);
  const [timerExpiredAlert, setTimerExpiredAlert] = useState(false);
  const [autoMarkAlert, setAutoMarkAlert] = useState(false);

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
      setDoctorName(name || 'Doctor');
      setDoctorRoom(room || 'Room');
    } catch (error) {
      console.error('Error loading doctor data:', error);
    }
  };

  // Play system notification sound and vibration
  const playNotificationSound = async (type: 'success' | 'warning' | 'info') => {
    if (!soundEnabled) return;

    try {
      // Play system sound using Audio
      const { sound } = await Audio.Sound.createAsync(
        // Use default notification sound
        require('../../assets/sounds/notification.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );

      // Vibration patterns based on notification type
      if (type === 'success') {
        Vibration.vibrate([0, 200, 100, 200]); // Double vibration
      } else if (type === 'warning') {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]); // Triple long vibration
      } else if (type === 'info') {
        Vibration.vibrate(400); // Single long vibration
      }

      // Cleanup
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Notification sound error:', error);
      // Fallback to vibration only if sound fails
      Vibration.vibrate(400);
    }
  };

  const handleCallNursePress = () => {
    setCallNurseAlert(true);
  };

  const handleConfirmCallNurse = async () => {
    setCallNurseAlert(false);
    setCallStatus('active');
    setCallTime(new Date());
    setRemainingSeconds(600); // Reset to 10 minutes
    await playNotificationSound('success');
  };

  const handleMarkAttendedPress = () => {
    setAttendedAlert(true);
  };

  const handleConfirmAttended = async () => {
    setAttendedAlert(false);
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
    await playNotificationSound('success');
  };

  const handleLogoutPress = () => {
    setLogoutAlert(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutAlert(false);
    try {
      await AsyncStorage.removeItem('doctorLoggedIn');
      await AsyncStorage.removeItem('doctorPhone');
      await AsyncStorage.removeItem('doctorName');
      await AsyncStorage.removeItem('doctorRoom');
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCallAgain = async () => {
    setTimerExpiredAlert(false);
    // Reset the timer and keep call active
    setCallTime(new Date());
    setRemainingSeconds(600);
    await playNotificationSound('info');
  };

  const handleDontCallAgain = async () => {
    setTimerExpiredAlert(false);
    // Mark as attended
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
    await playNotificationSound('success');
  };

  const handleAutoMarkOk = () => {
    setAutoMarkAlert(false);
    setCallStatus('idle');
    setCallTime(null);
    setRemainingSeconds(600);
  };

  // Format countdown timer
  const getFormattedTime = () => {
    const absSeconds = Math.abs(remainingSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Main timer effect - counts down from 10 minutes
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (callStatus === 'active' && callTime) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
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
      // 20 minutes total = -600 seconds (10 min after timer expired)
      setAutoMarkAlert(true);
      playNotificationSound('warning');
      
      // Auto mark as attended
      setTimeout(() => {
        setCallStatus('idle');
        setCallTime(null);
        setRemainingSeconds(600);
      }, 3000); // Show alert for 3 seconds then auto dismiss
    }
  }, [remainingSeconds, callStatus]);

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (remainingSeconds <= 0) return '#DC2626'; // Red when expired
    if (remainingSeconds <= 120) return '#F59E0B'; // Orange when < 2 min
    return '#0066CC'; // Blue otherwise
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.roomNumber}>{doctorRoom}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Sound Toggle */}
          <TouchableOpacity
            style={styles.soundButton}
            onPress={() => setSoundEnabled(!soundEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.soundIcon}>
              {soundEnabled ? '🔔' : '🔕'}
            </Text>
          </TouchableOpacity>
          
          {/* Logout Button */}
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
  roomNumber: {
    fontSize: 16,
    color: '#666666',
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
  // Custom Alert Styles
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