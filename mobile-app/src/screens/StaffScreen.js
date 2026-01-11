import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

const StaffScreen = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [activeCalls, setActiveCalls] = useState([]);
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

    newSocket.on('activeCalls', (calls) => {
      setActiveCalls(calls);
    });

    newSocket.on('newCall', (call) => {
      // Optionally play a sound or show a notification
      console.log('New call received:', call);
    });

    newSocket.on('callCompleted', (callId) => {
      setActiveCalls(prev => prev.filter(call => call.id !== callId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCompleteCall = (callId) => {
    if (socket && connected) {
      socket.emit('completeCall', callId);
    }
  };

  const renderCall = ({ item }) => (
    <View style={styles.callCard}>
      <View style={styles.callInfo}>
        <Text style={styles.doctorName}>{item.doctorName}</Text>
        <Text style={styles.roomText}>Room: {item.room}</Text>
        <Text style={styles.timeText}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.completeButton}
        onPress={() => handleCompleteCall(item.id)}
      >
        <Text style={styles.completeButtonText}>Complete</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userType}>{user.type.toUpperCase()}</Text>
          <View style={[styles.statusIndicator, connected ? styles.connected : styles.disconnected]}>
            <Text style={styles.statusText}>
              {connected ? '● Connected' : '● Disconnected'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Calls ({activeCalls.length})</Text>

        {activeCalls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active calls</Text>
            <Text style={styles.emptySubtext}>
              You will be notified when a doctor calls
            </Text>
          </View>
        ) : (
          <FlatList
            data={activeCalls}
            renderItem={renderCall}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        )}
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
    backgroundColor: '#27ae60',
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
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  userType: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 10,
  },
  statusIndicator: {
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  callCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#e74c3c',
  },
  callInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  roomText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  timeText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  completeButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 15,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default StaffScreen;
