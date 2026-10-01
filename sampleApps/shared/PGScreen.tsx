// @ts-nocheck

import * as React from 'react';
import {Component} from 'react';
import Toggle from './Toggle';
import {
  Alert,
  Button,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  Card,
  CFNB,
  CFNBPayment,
  CFCardPayment,
  CFDropCheckoutPayment,
  CFEnvironment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
  CFSession,
  CFThemeBuilder,
  CFUPI,
  CFUPIIntentCheckoutPayment,
  CFUPIPayment,
  ElementCard,
  SavedCard,
  UPIMode,
} from 'cashfree-pg-api-contract';
import CustomCardInput from './CustomCardInput';

const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';

const SANDBOX_CLIENT_ID = 'TEST430329ae80e0f32e41a393d78b923034';
const SANDBOX_CLIENT_SECRET = 'TESTaf195616268bd6202eeb3bf8dc458956e7192a85';
const PROD_CLIENT_ID = '';
const PROD_CLIENT_SECRET = '';


function generateOrderId(): string {
  return (
    'devstudio_' +
    Math.floor(
      Math.random() * 9000000000000000000 + 1000000000000000000,
    ).toString()
  );
}

interface Props {
  onBack: () => void;
}

export default class PGScreen extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.creditCardRef = React.createRef();
    this.state = {
      responseText: BASE_RESPONSE_TEXT,
      cardNumber: '',
      cardHolderName: '',
      cardExpiryMM: '',
      cardExpiryYY: '',
      cardCVV: '',
      orderId: '',
      sessionId: '',
      instrumentId: '',
      toggleCheckBox: false,
      isCreatingOrder: false,
      isSandbox: true,
      upiId: 'testfailure@gocash',
      nbBankCode: '3003',
      cardNetwork: require('./assets/visa.png'),
    };
    this.cfCardInstance = this.createCFCard();
  }

  createCFCard() {
    return (
      <CustomCardInput
        ref={this.creditCardRef}
        session={this.getFixSession()}
        cardListener={this.handleCFCardInput}
      />
    );
  }

  updateStatus = (message: string) => {
    this.setState({responseText: message});
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };

  // updateStatus only surfaces a toast on Android; this shows on both so the
  // message is not silently invisible on iOS.
  notify = (message: string) => {
    this.setState({responseText: message});
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  handleCFCardInput = (data: string) => {
    const cardNetwork = JSON.parse(data)['card_network'];
    const networkMap: Record<string, any> = {
      visa: require('./assets/visa.png'),
      mastercard: require('./assets/mastercard.png'),
      amex: require('./assets/amex.png'),
      maestro: require('./assets/maestro.png'),
      rupay: require('./assets/rupay.png'),
      diners: require('./assets/diners.png'),
      discover: require('./assets/discover.png'),
      jcb: require('./assets/jcb.png'),
    };
    this.setState({
      cardNetwork: networkMap[cardNetwork] ?? require('./assets/visa.png'),
    });
  };

  componentWillUnmount() {
    CFPaymentGatewayService.removeCallback();
    CFPaymentGatewayService.removeEventSubscriber();
  }

  componentDidMount() {
    const context = this;
    // The single registration point for this app. Registering again elsewhere
    // (e.g. at the app root) does not replace this one — setCallback leaves the
    // previous listener attached — so every callback would fire once per
    // registration instead of once per payment.
    CFPaymentGatewayService.setEventSubscriber({
      onReceivedEvent(eventName: string, map: Map<string, string>): void {
        console.log(`[B6] event=${eventName} meta=${JSON.stringify(map)}`);
      },
    });
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log(`[B7] onVerify FIRED \u2192 orderID=${orderID}`);
        context.updateStatus('Verified: ' + orderID);
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.log(
          `[B7] onError FIRED \u2192 orderID=${orderID} error=${JSON.stringify(error)}`,
        );
        context.updateStatus(JSON.stringify(error));
      },
    });
  }

  private getEnv(): CFEnvironment {
    return this.state.isSandbox
      ? CFEnvironment.SANDBOX
      : CFEnvironment.PRODUCTION;
  }

  private getSession(): CFSession {
    const env = this.getEnv();
    console.log(
      '[PGScreen] getSession → env:',
      this.state.isSandbox ? 'SANDBOX' : 'PRODUCTION',
      '| orderId:',
      this.state.orderId,
    );
    return new CFSession(this.state.sessionId, this.state.orderId, env);
  }

  private getFixSession(): CFSession {
    return new CFSession(
      'session_4zxKsUyNPorU6aZbHcxf8LJmyET2xA_svlDF69vSa8k9mkjAV3Zeosc2l3__mxno38hTK3pXR6_jL8X5R5WVC9BEXoN6SPef5V5lAYJyIE234IODJE1TXtIpayment',
      'devstudio_20339474',
      this.getEnv(),
    );
  }

  async createOrder() {
    this.setState({isCreatingOrder: true, responseText: 'Creating order...'});
    const orderId = generateOrderId();
    const {isSandbox} = this.state;
    const apiUrl = isSandbox
      ? 'https://sandbox.cashfree.com/pg/orders'
      : 'https://api.cashfree.com/pg/orders';
    const clientId = isSandbox ? SANDBOX_CLIENT_ID : PROD_CLIENT_ID;
    const clientSecret = isSandbox ? SANDBOX_CLIENT_SECRET : PROD_CLIENT_SECRET;
    console.log(
      '[PGScreen] createOrder → API:',
      apiUrl,
      '| env:',
      isSandbox ? 'SANDBOX' : 'PRODUCTION',
    );
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-version': '2025-01-01',
        },
        body: JSON.stringify({
          order_amount: 1.0,
          order_currency: 'INR',
          order_id: orderId,
          customer_details: {
            customer_id: 'devstudio_user',
            customer_phone: '9876543210',
          }
        }),
      });
      const data = await response.json();
      if (data.payment_session_id) {
        this.setState({
          orderId: data.order_id,
          sessionId: data.payment_session_id,
          responseText: 'Order created: ' + data.order_id,
        });
      } else {
        this.setState({
          responseText: 'Order creation failed: ' + JSON.stringify(data),
        });
      }
    } catch (e: any) {
      this.setState({responseText: 'Error: ' + e.message});
    } finally {
      this.setState({isCreatingOrder: false});
    }
  }

  /** @deprecated Use WebCheckout or UPIIntent instead */
  // Every payment path needs a session. createOrder is a manual button here,
  // and a fresh install starts with no order at all, so check before calling
  // into the SDK.
  private hasSession(): boolean {
    if (!this.state.sessionId || !this.state.orderId) {
      this.notify('Create an order first.');
      return false;
    }
    return true;
  }

  async _startCheckout() {
    if (!this.hasSession()) {
      return;
    }
    try {
      const paymentModes = new CFPaymentComponentBuilder()
        .add(CFPaymentModes.CARD)
        .add(CFPaymentModes.UPI)
        .add(CFPaymentModes.NB)
        .add(CFPaymentModes.WALLET)
        .add(CFPaymentModes.PAY_LATER)
        .build();
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#E64A19')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#FFC107')
        .setButtonTextColor('#FFFFFF')
        .setPrimaryTextColor('#212121')
        .setSecondaryTextColor('#757575')
        .build();
      CFPaymentGatewayService.doPayment(
        new CFDropCheckoutPayment(this.getSession(), paymentModes, theme),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startWebCheckout() {
    if (!this.hasSession()) {
      return;
    }
    try {
      CFPaymentGatewayService.doWebPayment(this.getSession());
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startUPICheckout() {
    if (!this.hasSession()) {
      return;
    }
    try {
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#E64A19')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#FFC107')
        .setButtonTextColor('#FFFFFF')
        .setPrimaryTextColor('#212121')
        .setSecondaryTextColor('#757575')
        .build();
      CFPaymentGatewayService.doUPIPayment(
        new CFUPIIntentCheckoutPayment(this.getSession(), theme),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _makeUpiIntentPayment() {
    if (!this.hasSession()) {
      return;
    }
    let installed: string[] = [];
    try {
      const apps = await CFPaymentGatewayService.getInstalledUpiApps();
      const parsed = JSON.parse(apps || '[]');
      if (Array.isArray(parsed)) {
        installed = parsed
          .map((item: any) => String(item?.appPackage ?? ''))
          .filter(Boolean);
      }
    } catch (e: any) {
      console.log('[PGScreen] getInstalledUpiApps failed:', e?.message ?? e);
    }
    console.log('[PGScreen] installed UPI apps:', JSON.stringify(installed));

    // INTENT launches an installed UPI app. With none installed there is
    // nothing to hand off to — simulators are the usual way to hit this — so
    // point the tester at Collect instead.
    if (installed.length === 0) {
      this.notify(
        'No UPI apps installed on this device — Intent cannot run here. Use Collect instead.',
      );
      return;
    }

    const typed = this.state.upiId.trim();
    if (
      typed &&
      !installed.some(a => a.toLowerCase() === typed.toLowerCase())
    ) {
      this.notify(
        `"${typed}" is not an installed UPI app. Available: ${installed.join(', ')}`,
      );
      return;
    }
    const id = typed || installed[installed.length - 1];

    try {
      console.log('[PGScreen] UPI INTENT → id:', id);
      const upi = new CFUPI(UPIMode.INTENT, id);
      CFPaymentGatewayService.makePayment(
        new CFUPIPayment(this.getSession(), upi),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  /** @deprecated Use UPI Intent instead */
  async _makeUpiCollectPayment() {
    if (!this.hasSession()) {
      return;
    }
    // COLLECT needs a VPA to send the request to, so require one before
    // calling into the SDK.
    const upiId = this.state.upiId.trim();
    if (!upiId) {
      this.notify('Enter a UPI ID first (e.g. success@upi).');
      return;
    }
    // COLLECT sends a request to a VPA, so it needs name@bank — not a scheme.
    if (!upiId.includes('@')) {
      this.notify(
        `"${upiId}" is not a UPI ID. Collect needs e.g. success@upi — use Intent for an app scheme.`,
      );
      return;
    }
    try {
      console.log('[PGScreen] UPI COLLECT → id:', upiId);
      const upi = new CFUPI(UPIMode.COLLECT, upiId);
      CFPaymentGatewayService.makePayment(
        new CFUPIPayment(this.getSession(), upi),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  private handleSubmit = () => {
    if (!this.hasSession()) {
      return;
    }
    if (this.creditCardRef.current) {
      const nonPciCard = new ElementCard(
        this.state.cardHolderName,
        this.state.cardExpiryMM,
        this.state.cardExpiryYY,
        this.state.cardCVV,
        this.state.toggleCheckBox,
      );
      this.creditCardRef.current.doPaymentWithPaymentSessionId(
        nonPciCard,
        this.getSession(),
      );
    }
  };

  async _startCardPayment() {
    if (!this.hasSession()) {
      return;
    }
    try {
      const card = new Card(
        this.state.cardNumber,
        this.state.cardHolderName,
        this.state.cardExpiryMM,
        this.state.cardExpiryYY,
        this.state.cardCVV,
        this.state.toggleCheckBox,
      );
      CFPaymentGatewayService.makePayment(
        new CFCardPayment(this.getSession(), card),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _makeNBPayment() {
    if (!this.hasSession()) {
      return;
    }
    try {
      const nb = new CFNB(this.state.nbBankCode);
      CFPaymentGatewayService.makePayment(
        new CFNBPayment(this.getSession(), nb),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startSavedCardPayment() {
    if (!this.hasSession()) {
      return;
    }
    try {
      const card = new SavedCard(this.state.instrumentId, this.state.cardCVV);
      CFPaymentGatewayService.makePayment(
        new CFCardPayment(this.getSession(), card),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  render() {
    return (
      <ScrollView style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={this.props.onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Payment Gateway</Text>
        </View>

        <View style={styles.container}>
          {/* Session Inputs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session</Text>
            <Button
              title={
                this.state.isCreatingOrder
                  ? 'Creating Order...'
                  : 'Create Order'
              }
              disabled={this.state.isCreatingOrder}
              onPress={() => this.createOrder()}
            />
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder="Session Id"
              value={this.state.sessionId}
              onChangeText={v => this.setState({sessionId: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Order Id"
              value={this.state.orderId}
              onChangeText={v => this.setState({orderId: v})}
            />
            <View style={styles.envToggleRow}>
              <Text
                style={[
                  styles.envLabel,
                  this.state.isSandbox && styles.envLabelActive,
                ]}>
                SANDBOX
              </Text>
              <Switch
                value={!this.state.isSandbox}
                onValueChange={v => this.setState({isSandbox: !v})}
                thumbColor={this.state.isSandbox ? '#2ecc71' : '#e74c3c'}
                trackColor={{false: '#a8e6c1', true: '#f5a8a8'}}
              />
              <Text
                style={[
                  styles.envLabel,
                  !this.state.isSandbox && styles.envLabelActive,
                ]}>
                PRODUCTION
              </Text>
            </View>
            <View
              style={[
                styles.envBadge,
                this.state.isSandbox
                  ? styles.envBadgeSandbox
                  : styles.envBadgeProd,
              ]}>
              <Text style={styles.envBadgeText}>
                {this.state.isSandbox ? '🟢 SANDBOX' : '🔴 PRODUCTION'}
              </Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="VPA / PSP app package (UPI)"
              value={this.state.upiId}
              onChangeText={v => this.setState({upiId: v})}
            />
          </View>

          {/* Checkout Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checkout</Text>
            <View style={styles.buttonGrid}>
              {[
                {title: 'Drop Payment', action: () => this._startCheckout()},
                {title: 'Web Checkout', action: () => this._startWebCheckout()},
                {
                  title: 'UPI Intent Checkout',
                  action: () => this._startUPICheckout(),
                },
                {
                  title: 'Element UPI Collect',
                  action: () => this._makeUpiCollectPayment(),
                },
                {
                  title: 'Element UPI Intent',
                  action: () => this._makeUpiIntentPayment(),
                },
              ].map(btn => (
                <View key={btn.title} style={styles.gridButton}>
                  <Button title={btn.title} onPress={btn.action} />
                </View>
              ))}
            </View>
          </View>

          {/* Response */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Response</Text>
            <Text style={styles.responseText}>{this.state.responseText}</Text>
          </View>

          {/* Card Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Payment (NonPCI)</Text>
            <View style={styles.cardContainer}>
              {this.cfCardInstance}
              <Image
                style={styles.cardNetworkImg}
                source={this.state.cardNetwork}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Holder Name"
              placeholderTextColor="#999"
              onChangeText={v => this.setState({cardHolderName: v})}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="MM"
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#999"
                onChangeText={v => this.setState({cardExpiryMM: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="YY"
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#999"
                onChangeText={v => this.setState({cardExpiryYY: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="CVV"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
                onChangeText={v => this.setState({cardCVV: v})}
              />
            </View>
            <Button
              title="Pay with Card (NonPCI)"
              onPress={this.handleSubmit}
            />
          </View>

          {/* PCI Card Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Payment (PCI)</Text>
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              keyboardType="numeric"
              maxLength={16}
              placeholderTextColor="#999"
              onChangeText={v => this.setState({cardNumber: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Holder Name"
              placeholderTextColor="#999"
              onChangeText={v => this.setState({cardHolderName: v})}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="MM"
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#999"
                onChangeText={v => this.setState({cardExpiryMM: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="YY"
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#999"
                onChangeText={v => this.setState({cardExpiryYY: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="CVV"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
                onChangeText={v => this.setState({cardCVV: v})}
              />
            </View>
            <View style={styles.checkboxRow}>
              <Toggle
                value={this.state.toggleCheckBox}
                onValueChange={v => this.setState({toggleCheckBox: v})}
              />
              <Text style={styles.checkboxLabel}>
                Save card for future payments
              </Text>
            </View>
            <Button
              title="Pay with Card (PCI)"
              onPress={() => this._startCardPayment()}
            />
          </View>

          {/* Saved Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Card</Text>
            <TextInput
              style={styles.input}
              placeholder="Instrument Id"
              onChangeText={v => this.setState({instrumentId: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="CVV"
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
              onChangeText={v => this.setState({cardCVV: v})}
            />
            <Button
              title="Pay with Saved Card"
              onPress={() => this._startSavedCardPayment()}
            />
          </View>

          {/* Net Banking Element */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Net Banking (Element)</Text>
            <TextInput
              style={styles.input}
              placeholder="Bank Code"
              value={this.state.nbBankCode}
              onChangeText={v => this.setState({nbBankCode: v})}
              keyboardType="numeric"
            />
            <Button
              title="Pay via Net Banking"
              onPress={() => this._makeNBPayment()}
            />
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  backBtn: {
    marginRight: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  container: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 14,
    color: '#333',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  gridButton: {
    width: '50%',
    padding: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
  },
  cardNetworkImg: {
    margin: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  flex1: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 12,
  },
  envToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  envLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  envLabelActive: {
    color: '#1a1a2e',
  },
  envBadge: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  envBadgeSandbox: {
    backgroundColor: '#2ecc71',
  },
  envBadgeProd: {
    backgroundColor: '#e74c3c',
  },
  envBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
