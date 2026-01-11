import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

const DoctorScreen = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCallNurse = () => {
    if (!room) {
      Alert.alert('Room Required', 'Please enter your room number');
      return;
    }

    if (!socket || !connected) {
      Alert.alert('Connection Error', 'Not connected to server');
      return;
    }

    const callData = {
      doctorId: user.id,
      doctorName: user.name,
      room: room,
      timestamp: new Date(),
    };

    socket.emit('doctorCall', callData);
    
    Alert.alert(
      'Call Sent',
      'Nurse has been notified',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wellness Centre</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.userCard}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userType}>{user.type.toUpperCase()}</Text>
          <View style={[styles.statusIndicator, connected ? styles.connected : styles.disconnected]}>
            <Text style={styles.statusText}>
              {connected ? '● Connected' : '● Disconnected'}
            </Text>
          </View>
        </View>

        <View style={styles.callSection}>
          <Text style={styles.sectionTitle}>Room Number</Text>
          <TextInput
            style={styles.roomInput}
            placeholder="Enter room number (e.g., 101)"
            value={room}
            onChangeText={setRoom}
            keyboardType="default"
          />

          <TouchableOpacity
            style={[styles.callButton, !connected && styles.callButtonDisabled]}
            onPress={handleCallNurse}
            disabled={!connected}
          >
            <Text style={styles.callButtonText}>🔔 Call Nurse</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Press the button above to call for assistance. Your name and room will be displayed on the nurses' station.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#2c3e50',
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  userType: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusIndicator: {
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  connected: {
    backgroundColor: '#d4edda',
  },
  disconnected: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  callSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  roomInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  callButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  callButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DoctorScreen;
