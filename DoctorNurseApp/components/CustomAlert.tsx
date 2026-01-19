// components/CustomAlert.tsx

import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

export type CustomAlertType = 'confirm' | 'warning' | 'success' | 'info' | 'error';

export type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type: CustomAlertType;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  singleButton?: boolean;
};

export function CustomAlert({
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

const styles = StyleSheet.create({
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
