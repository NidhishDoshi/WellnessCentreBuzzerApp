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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import {
  initSocket,
  disconnectSocket,
  sendDoctorCall,
  sendReceptionCall,
  completeCall,
  addConnectionListener,
  isConnected,
} from '../../utils/socket';
import { CustomAlert } from '../../components/CustomAlert';

type CallStatus = 'idle' | 'active';

export default function DoctorHomeScreen() {
  const [nurseCallStatus, setNurseCallStatus] = useState<CallStatus>('idle');
  const [nurseCallTime, setNurseCallTime] = useState<Date | null>(null);
  const [nurseRemainingSeconds, setNurseRemainingSeconds] = useState(600);

  const [receptionCallStatus, setReceptionCallStatus] = useState<CallStatus>('idle');
  const [receptionCallTime, setReceptionCallTime] = useState<Date | null>(null);
  const [receptionRemainingSeconds, setReceptionRemainingSeconds] = useState(600);

  const [doctorName, setDoctorName] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);
  const [showNetworkError, setShowNetworkError] = useState(false);

  const currentNurseCallId = useRef<string | number | null>(null);
  const currentReceptionCallId = useRef<string | number | null>(null);
  const appState = useRef(AppState.currentState);

  // Alert states for Nurse
  const [callNurseAlert, setCallNurseAlert] = useState(false);
  const [attendedNurseAlert, setAttendedNurseAlert] = useState(false);
  const [timerNurseExpiredAlert, setTimerNurseExpiredAlert] = useState(false);
  const [autoMarkNurseAlert, setAutoMarkNurseAlert] = useState(false);

  // Alert states for Reception
  const [callReceptionAlert, setCallReceptionAlert] = useState(false);
  const [attendedReceptionAlert, setAttendedReceptionAlert] = useState(false);
  const [timerReceptionExpiredAlert, setTimerReceptionExpiredAlert] = useState(false);
  const [autoMarkReceptionAlert, setAutoMarkReceptionAlert] = useState(false);

  // Shared alerts
  const [logoutAlert, setLogoutAlert] = useState(false);

  // Load persisted call state on mount
  useEffect(() => {
    loadPersistedCallState();
  }, []);

  // Save call state whenever it changes
  useEffect(() => {
    saveCallState();
  }, [nurseCallStatus, nurseCallTime, receptionCallStatus, receptionCallTime]);

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
      const savedNurseStatus = await AsyncStorage.getItem('nurseCallStatus');
      const savedNurseCallTime = await AsyncStorage.getItem('nurseCallTime');
      const savedNurseCallId = await AsyncStorage.getItem('currentNurseCallId');

      if (savedNurseStatus === 'active' && savedNurseCallTime) {
        const startTime = new Date(savedNurseCallTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = 600 - elapsedSeconds;

        setNurseCallStatus('active');
        setNurseCallTime(startTime);
        setNurseRemainingSeconds(remaining);
        
        if (savedNurseCallId) {
          currentNurseCallId.current = parseInt(savedNurseCallId);
        }

        console.log('Restored nurse call state:', {
          startTime,
          elapsedSeconds,
          remaining
        });
      }

      const savedReceptionStatus = await AsyncStorage.getItem('receptionCallStatus');
      const savedReceptionCallTime = await AsyncStorage.getItem('receptionCallTime');
      const savedReceptionCallId = await AsyncStorage.getItem('currentReceptionCallId');

      if (savedReceptionStatus === 'active' && savedReceptionCallTime) {
        const startTime = new Date(savedReceptionCallTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = 600 - elapsedSeconds;

        setReceptionCallStatus('active');
        setReceptionCallTime(startTime);
        setReceptionRemainingSeconds(remaining);
        
        if (savedReceptionCallId) {
          currentReceptionCallId.current = parseInt(savedReceptionCallId);
        }

        console.log('Restored reception call state:', {
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
      await AsyncStorage.setItem('nurseCallStatus', nurseCallStatus);
      if (nurseCallTime) {
        await AsyncStorage.setItem('nurseCallTime', nurseCallTime.toISOString());
      } else {
        await AsyncStorage.removeItem('nurseCallTime');
      }
      if (currentNurseCallId.current) {
        await AsyncStorage.setItem('currentNurseCallId', String(currentNurseCallId.current));
      } else {
        await AsyncStorage.removeItem('currentNurseCallId');
      }

      await AsyncStorage.setItem('receptionCallStatus', receptionCallStatus);
      if (receptionCallTime) {
        await AsyncStorage.setItem('receptionCallTime', receptionCallTime.toISOString());
      } else {
        await AsyncStorage.removeItem('receptionCallTime');
      }
      if (currentReceptionCallId.current) {
        await AsyncStorage.setItem('currentReceptionCallId', String(currentReceptionCallId.current));
      } else {
        await AsyncStorage.removeItem('currentReceptionCallId');
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
    if (!serverConnected) {
      setShowNetworkError(true);
      return;
    }
    if (nurseCallStatus === 'active') {
      return; // Already have an active nurse call
    }
    setCallNurseAlert(true);
  };

  const handleConfirmCallNurse = async () => {
    setCallNurseAlert(false);
    
    const callId = Date.now();
    currentNurseCallId.current = callId;
    
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
    setNurseCallStatus('active');
    setNurseCallTime(startTime);
    setNurseRemainingSeconds(600);
    await playNotificationSound('success');
  };

  const handleMarkNurseAttendedPress = () => {
    setAttendedNurseAlert(true);
  };

  const handleConfirmNurseAttended = async () => {
    setAttendedNurseAlert(false);
    
    if (currentNurseCallId.current) {
      const completed = completeCall(currentNurseCallId.current);
      if (!completed) {
        console.warn('Failed to complete call on server - not connected');
      }
      currentNurseCallId.current = null;
    }
    
    setNurseCallStatus('idle');
    setNurseCallTime(null);
    setNurseRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['nurseCallStatus', 'nurseCallTime', 'currentNurseCallId']);
    
    await playNotificationSound('success');
  };

  const handleCallNurseAgain = async () => {
    setTimerNurseExpiredAlert(false);
    
    if (currentNurseCallId.current) {
      completeCall(currentNurseCallId.current);
    }
    
    const newCallId = Date.now();
    currentNurseCallId.current = newCallId;
    
    sendDoctorCall({
      doctorId: newCallId,
      doctorName: doctorName,
      room: doctorRoom.replace('Room ', ''),
    });
    
    const newStartTime = new Date();
    setNurseCallTime(newStartTime);
    setNurseRemainingSeconds(600);
    await playNotificationSound('info');
  };

  const handleDontCallNurseAgain = async () => {
    setTimerNurseExpiredAlert(false);
    
    if (currentNurseCallId.current) {
      completeCall(currentNurseCallId.current);
      currentNurseCallId.current = null;
    }
    
    setNurseCallStatus('idle');
    setNurseCallTime(null);
    setNurseRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['nurseCallStatus', 'nurseCallTime', 'currentNurseCallId']);
    
    await playNotificationSound('success');
  };

  const handleAutoMarkNurseOk = async () => {
    setAutoMarkNurseAlert(false);
    
    if (currentNurseCallId.current) {
      completeCall(currentNurseCallId.current);
      currentNurseCallId.current = null;
    }
    
    setNurseCallStatus('idle');
    setNurseCallTime(null);
    setNurseRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['nurseCallStatus', 'nurseCallTime', 'currentNurseCallId']);
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

  // ===== RECEPTION CALL HANDLERS =====

  const handleCallReceptionPress = () => {
    if (!serverConnected) {
      setShowNetworkError(true);
      return;
    }
    if (receptionCallStatus === 'active') {
      return; // Already have an active reception call
    }
    setCallReceptionAlert(true);
  };

  const handleConfirmCallReception = async () => {
    setCallReceptionAlert(false);
    
    const callId = Date.now() + 1; // Add 1 to avoid collision with nurse call
    currentReceptionCallId.current = callId;
    
    const sent = sendReceptionCall({
      doctorId: callId,
      doctorName: doctorName,
      room: doctorRoom.replace('Room ', ''),
    });
    
    if (!sent) {
      console.warn('Failed to send call to server - not connected');
      setShowNetworkError(true);
    }
    
    const startTime = new Date();
    setReceptionCallStatus('active');
    setReceptionCallTime(startTime);
    setReceptionRemainingSeconds(600);
    await playNotificationSound('success');
  };

  const handleMarkReceptionAttendedPress = () => {
    setAttendedReceptionAlert(true);
  };

  const handleConfirmReceptionAttended = async () => {
    setAttendedReceptionAlert(false);
    
    if (currentReceptionCallId.current) {
      const completed = completeCall(currentReceptionCallId.current);
      if (!completed) {
        console.warn('Failed to complete call on server - not connected');
      }
      currentReceptionCallId.current = null;
    }
    
    setReceptionCallStatus('idle');
    setReceptionCallTime(null);
    setReceptionRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['receptionCallStatus', 'receptionCallTime', 'currentReceptionCallId']);
    
    await playNotificationSound('success');
  };

  const handleCallReceptionAgain = async () => {
    setTimerReceptionExpiredAlert(false);
    
    if (currentReceptionCallId.current) {
      completeCall(currentReceptionCallId.current);
    }
    
    const newCallId = Date.now() + 1;
    currentReceptionCallId.current = newCallId;
    
    sendReceptionCall({
      doctorId: newCallId,
      doctorName: doctorName,
      room: doctorRoom.replace('Room ', ''),
    });
    
    const newStartTime = new Date();
    setReceptionCallTime(newStartTime);
    setReceptionRemainingSeconds(600);
    await playNotificationSound('info');
  };

  const handleDontCallReceptionAgain = async () => {
    setTimerReceptionExpiredAlert(false);
    
    if (currentReceptionCallId.current) {
      completeCall(currentReceptionCallId.current);
      currentReceptionCallId.current = null;
    }
    
    setReceptionCallStatus('idle');
    setReceptionCallTime(null);
    setReceptionRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['receptionCallStatus', 'receptionCallTime', 'currentReceptionCallId']);
    
    await playNotificationSound('success');
  };

  const handleAutoMarkReceptionOk = async () => {
    setAutoMarkReceptionAlert(false);
    
    if (currentReceptionCallId.current) {
      completeCall(currentReceptionCallId.current);
      currentReceptionCallId.current = null;
    }
    
    setReceptionCallStatus('idle');
    setReceptionCallTime(null);
    setReceptionRemainingSeconds(600);
    
    await AsyncStorage.multiRemove(['receptionCallStatus', 'receptionCallTime', 'currentReceptionCallId']);
  };

  const handleNetworkErrorOk = () => {
    setShowNetworkError(false);
  };

  const getFormattedTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const minutes = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number) => {
    if (seconds <= 0) return '#DC2626';
    if (seconds <= 120) return '#F59E0B';
    return '#0066CC';
  };

  // ===== NURSE CALL TIMERS =====

  // Nurse main timer effect - updates every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (nurseCallStatus === 'active' && nurseCallTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - nurseCallTime.getTime()) / 1000);
        const remaining = Math.max(0, 600 - elapsedSeconds); // Stop at 0, don't go negative
        setNurseRemainingSeconds(remaining);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nurseCallStatus, nurseCallTime]);

  // Check for 2 minute warning (nurse)
  useEffect(() => {
    if (nurseCallStatus === 'active' && nurseRemainingSeconds === 120) {
      playNotificationSound('info');
    }
  }, [nurseRemainingSeconds, nurseCallStatus]);

  // Check for 10 minute mark (nurse timer expired)
  useEffect(() => {
    if (nurseCallStatus === 'active' && nurseRemainingSeconds === 0) {
      setTimerNurseExpiredAlert(true);
      playNotificationSound('warning');
    }
  }, [nurseRemainingSeconds, nurseCallStatus]);

  // Check for auto mark attended after 10 minutes (nurse) - if user doesn't respond after timer expires
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (nurseCallStatus === 'active' && nurseCallTime && nurseRemainingSeconds === 0) {
      // Set timeout for 10 minutes after the timer reached 0
      timeoutId = setTimeout(async () => {
        setAutoMarkNurseAlert(true);
        playNotificationSound('warning');
        
        if (currentNurseCallId.current) {
          completeCall(currentNurseCallId.current);
          currentNurseCallId.current = null;
        }
        
        setTimeout(async () => {
          setNurseCallStatus('idle');
          setNurseCallTime(null);
          setNurseRemainingSeconds(600);
          await AsyncStorage.multiRemove(['nurseCallStatus', 'nurseCallTime', 'currentNurseCallId']);
        }, 3000);
      }, 600000); // Wait 10 more minutes after timer expires
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [nurseRemainingSeconds, nurseCallStatus, nurseCallTime]);

  // ===== RECEPTION CALL TIMERS =====

  // Reception main timer effect - updates every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (receptionCallStatus === 'active' && receptionCallTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - receptionCallTime.getTime()) / 1000);
        const remaining = Math.max(0, 600 - elapsedSeconds); // Stop at 0, don't go negative
        setReceptionRemainingSeconds(remaining);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [receptionCallStatus, receptionCallTime]);

  // Check for 2 minute warning (reception)
  useEffect(() => {
    if (receptionCallStatus === 'active' && receptionRemainingSeconds === 120) {
      playNotificationSound('info');
    }
  }, [receptionRemainingSeconds, receptionCallStatus]);

  // Check for 10 minute mark (reception timer expired)
  useEffect(() => {
    if (receptionCallStatus === 'active' && receptionRemainingSeconds === 0) {
      setTimerReceptionExpiredAlert(true);
      playNotificationSound('warning');
    }
  }, [receptionRemainingSeconds, receptionCallStatus]);

  // Check for auto mark attended after 10 minutes (reception) - if user doesn't respond after timer expires
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (receptionCallStatus === 'active' && receptionCallTime && receptionRemainingSeconds === 0) {
      // Set timeout for 10 minutes after the timer reached 0
      timeoutId = setTimeout(async () => {
        setAutoMarkReceptionAlert(true);
        playNotificationSound('warning');
        
        if (currentReceptionCallId.current) {
          completeCall(currentReceptionCallId.current);
          currentReceptionCallId.current = null;
        }
        
        setTimeout(async () => {
          setReceptionCallStatus('idle');
          setReceptionCallTime(null);
          setReceptionRemainingSeconds(600);
          await AsyncStorage.multiRemove(['receptionCallStatus', 'receptionCallTime', 'currentReceptionCallId']);
        }, 3000);
      }, 600000); // Wait 10 more minutes after timer expires
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [receptionRemainingSeconds, receptionCallStatus, receptionCallTime]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(doctor)/profile')}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Display */}
        <View style={styles.statusCard}>
          <View style={styles.statusBadgesContainer}>
            <View
              style={[
                styles.statusBadge,
                nurseCallStatus === 'active' && styles.statusBadgeActive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  nurseCallStatus === 'active' && styles.statusDotActive,
                ]}
              />
              <View style={styles.statusBadgeContent}>
                <Text style={styles.statusBadgeLabel}>Nurse</Text>
                <Text
                  style={[
                    styles.statusText,
                    nurseCallStatus === 'active' && styles.statusTextActive,
                  ]}
                >
                  {nurseCallStatus === 'idle' ? 'No Call' : 'Called'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                receptionCallStatus === 'active' && styles.statusBadgeActiveReception,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  receptionCallStatus === 'active' && styles.statusDotActiveReception,
                ]}
              />
              <View style={styles.statusBadgeContent}>
                <Text style={styles.statusBadgeLabel}>Reception</Text>
                <Text
                  style={[
                    styles.statusText,
                    receptionCallStatus === 'active' && styles.statusTextActiveReception,
                  ]}
                >
                  {receptionCallStatus === 'idle' ? 'No Call' : 'Called'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nurse Call Section */}
        <View style={styles.callSection}>
          <Text style={styles.callSectionTitle}>📞 Nurse Call</Text>
          
          {nurseCallStatus === 'active' && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>
                {nurseRemainingSeconds > 0 ? 'Time Remaining' : 'Time Exceeded'}
              </Text>
              <Text style={[styles.timerText, { color: getTimerColor(nurseRemainingSeconds) }]}>
                {nurseRemainingSeconds >= 0 ? getFormattedTime(nurseRemainingSeconds) : `-${getFormattedTime(nurseRemainingSeconds)}`}
              </Text>
              {nurseRemainingSeconds <= 120 && nurseRemainingSeconds > 0 && (
                <Text style={styles.warningText}>⏰ Nurse should arrive soon</Text>
              )}
              {nurseRemainingSeconds <= 0 && (
                <Text style={styles.expiredText}>
                  ⚠️ Expected time has passed
                </Text>
              )}
            </View>
          )}

          {nurseCallStatus === 'idle' ? (
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
                  {nurseRemainingSeconds > 0
                    ? '🏥 Waiting for nurse...'
                    : '⏱️ Taking longer than expected'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.attendedButton}
                onPress={handleMarkNurseAttendedPress}
                activeOpacity={0.8}
              >
                <Text style={styles.attendedButtonText}>Mark as Attended</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Reception Call Section */}
        <View style={styles.callSection}>
          <Text style={styles.callSectionTitle}>🏢 Reception Call</Text>
          
          {receptionCallStatus === 'active' && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>
                {receptionRemainingSeconds > 0 ? 'Time Remaining' : 'Time Exceeded'}
              </Text>
              <Text style={[styles.timerText, { color: getTimerColor(receptionRemainingSeconds) }]}>
                {receptionRemainingSeconds >= 0 ? getFormattedTime(receptionRemainingSeconds) : `-${getFormattedTime(receptionRemainingSeconds)}`}
              </Text>
              {receptionRemainingSeconds <= 120 && receptionRemainingSeconds > 0 && (
                <Text style={styles.warningText}>⏰ Reception should arrive soon</Text>
              )}
              {receptionRemainingSeconds <= 0 && (
                <Text style={styles.expiredText}>
                  ⚠️ Expected time has passed
                </Text>
              )}
            </View>
          )}

          {receptionCallStatus === 'idle' ? (
            <TouchableOpacity
              style={[styles.callButton, styles.callButtonReception]}
              onPress={handleCallReceptionPress}
              activeOpacity={0.8}
            >
              <Text style={styles.callButtonText}>Call Reception</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeCallContainer}>
              <View style={styles.waitingIndicator}>
                <Text style={styles.waitingText}>
                  {receptionRemainingSeconds > 0
                    ? '🏢 Waiting for reception...'
                    : '⏱️ Taking longer than expected'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.attendedButton, styles.attendedButtonReception]}
                onPress={handleMarkReceptionAttendedPress}
                activeOpacity={0.8}
              >
                <Text style={styles.attendedButtonText}>Mark as Attended</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Press the buttons above to call Nurse or Reception to your room
        </Text>
      </ScrollView>

      {/* ===== NURSE CALL ALERTS ===== */}
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
        visible={attendedNurseAlert}
        title="Mark as Attended"
        message="Confirm that the nurse has attended to your call?"
        type="success"
        confirmText="Yes, Attended"
        cancelText="Not Yet"
        onConfirm={handleConfirmNurseAttended}
        onCancel={() => setAttendedNurseAlert(false)}
      />

      <CustomAlert
        visible={timerNurseExpiredAlert}
        title="Expected Time Reached"
        message="The expected 10-minute wait time has passed. Would you like to call the nurse again or mark as attended?"
        type="info"
        confirmText="Call Again"
        cancelText="Mark Attended"
        onConfirm={handleCallNurseAgain}
        onCancel={handleDontCallNurseAgain}
      />

      <CustomAlert
        visible={autoMarkNurseAlert}
        title="Auto-Marked as Attended"
        message="The nurse call has been active for 20 minutes and has been automatically marked as attended."
        type="info"
        confirmText="OK"
        cancelText=""
        singleButton={true}
        onConfirm={handleAutoMarkNurseOk}
        onCancel={handleAutoMarkNurseOk}
      />

      {/* ===== RECEPTION CALL ALERTS ===== */}
      <CustomAlert
        visible={callReceptionAlert}
        title="Call Reception"
        message="Are you sure you want to call reception to your room?"
        type="confirm"
        confirmText="Yes, Call"
        cancelText="Cancel"
        onConfirm={handleConfirmCallReception}
        onCancel={() => setCallReceptionAlert(false)}
      />

      <CustomAlert
        visible={attendedReceptionAlert}
        title="Mark as Attended"
        message="Confirm that reception has attended to your call?"
        type="success"
        confirmText="Yes, Attended"
        cancelText="Not Yet"
        onConfirm={handleConfirmReceptionAttended}
        onCancel={() => setAttendedReceptionAlert(false)}
      />

      <CustomAlert
        visible={timerReceptionExpiredAlert}
        title="Expected Time Reached"
        message="The expected 10-minute wait time has passed. Would you like to call reception again or mark as attended?"
        type="info"
        confirmText="Call Again"
        cancelText="Mark Attended"
        onConfirm={handleCallReceptionAgain}
        onCancel={handleDontCallReceptionAgain}
      />

      <CustomAlert
        visible={autoMarkReceptionAlert}
        title="Auto-Marked as Attended"
        message="The reception call has been active for 20 minutes and has been automatically marked as attended."
        type="info"
        confirmText="OK"
        cancelText=""
        singleButton={true}
        onConfirm={handleAutoMarkReceptionOk}
        onCancel={handleAutoMarkReceptionOk}
      />

      {/* Shared Alerts */}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  statusBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeActive: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeContent: {
    marginLeft: 8,
    flex: 1,
  },
  statusBadgeLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
  },
  statusDotActive: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusTextActive: {
    color: '#92400E',
  },
  timerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
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
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 52,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  activeCallContainer: {
    marginBottom: 10,
  },
  waitingIndicator: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  waitingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
    textAlign: 'center',
  },
  attendedButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  attendedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusBadgeActiveReception: {
    backgroundColor: '#FED7AA',
  },
  statusDotActiveReception: {
    backgroundColor: '#EA8C55',
  },
  statusTextActiveReception: {
    color: '#92400E',
  },
  callSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  callSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  callButtonReception: {
    backgroundColor: '#E8750F',
  },
  attendedButtonReception: {
    backgroundColor: '#059669',
  },
});
