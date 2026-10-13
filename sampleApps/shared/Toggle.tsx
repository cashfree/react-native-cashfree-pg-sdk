import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/**
 * Minimal controlled checkbox-style toggle built only from Pressable/View.
 * Replaces `@react-native-community/checkbox` (an old native module with
 * doubtful New Architecture support) so the shared screens stay dependency-free
 * for all three sample apps.
 */
const Toggle = ({value, onValueChange}: ToggleProps) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    style={[styles.box, value && styles.boxChecked]}
    accessibilityRole="checkbox"
    accessibilityState={{checked: value}}>
    {value && <View style={styles.checkmark} />}
  </Pressable>
);

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  boxChecked: {
    borderColor: '#1a1a2e',
    backgroundColor: '#1a1a2e',
  },
  checkmark: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});

export default Toggle;
