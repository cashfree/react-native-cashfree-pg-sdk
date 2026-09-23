// @ts-nocheck

import * as React from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PGScreen from './PGScreen';
import SubscriptionScreen from './SubscriptionScreen';

type Screen = 'home' | 'pg' | 'subscription';

// [NEWARCH-PROBE B0/B2] Mirrors sampleApps/NewArchSample/App.tsx so this app
// acts as a like-for-like old-architecture control. Boundaries B3/B4/B5 live
// in the shared SDK native code and fire here automatically.
function logBoundaryProbes() {
  const g = global as any;
  console.log(
    `[B0] arch: bridgeless=${g.RN$Bridgeless === true} ` +
      `turboModuleProxy=${g.__turboModuleProxy != null} ` +
      `fabric=${g.nativeFabricUIManager != null} ` +
      `hermes=${g.HermesInternal != null} platform=${Platform.OS} ` +
      `rn=${Platform.constants?.reactNativeVersion?.minor ?? '?'}`,
  );
  let state: string;
  try {
    const mod = NativeModules.CashfreePgApi;
    state =
      mod == null
        ? 'NULL — native module not registered'
        : typeof mod.doElementUPIPayment === 'function'
        ? 'OK — doElementUPIPayment present'
        : 'PRESENT but doElementUPIPayment missing';
  } catch (e: any) {
    state = `THREW on access — LINKING_ERROR proxy: ${e.message}`;
  }
  console.log(`[B2] NativeModules.CashfreePgApi → ${state}`);
}

export default function App() {
  const [screen, setScreen] = React.useState<Screen>('home');

  React.useEffect(() => {
    logBoundaryProbes();
  }, []);

  if (screen === 'pg') {
    return <PGScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'subscription') {
    return <SubscriptionScreen onBack={() => setScreen('home')} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cashfree RN SDK</Text>
      <Text style={styles.subtitle}>Select a payment mode to continue</Text>
      <Pressable
        style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setScreen('pg')}>
        <Text style={styles.cardIcon}>💳</Text>
        <Text style={styles.cardTitle}>Payment Gateway</Text>
        <Text style={styles.cardDesc}>
          Drop, Web Checkout, UPI, Card & Saved Card payments
        </Text>
      </Pressable>
      <Pressable
        style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setScreen('subscription')}>
        <Text style={styles.cardIcon}>🔁</Text>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.cardDesc}>
          Recurring subscription checkout, Card & UPI payments
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
});
