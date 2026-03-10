// @ts-nocheck

import * as React from 'react';
import {Component} from 'react';
import {
  Button,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
  CFEnvironment,
  CFSubsCardPayment,
  CFSubsNB,
  CFSubsNBPayment,
  CFSubsUPIPayment,
  CFSubscriptionSession,
  CFUPI,
  UPIMode,
} from 'cashfree-pg-api-contract';

const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';

interface Props {
  onBack: () => void;
}

export default class SubscriptionScreen extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.state = {
      responseText: BASE_RESPONSE_TEXT,
      orderId: 'devstudio_subs_7436757734765534284',
      sessionId:
        'sub_session_g9jf7wWoyPn4UgZNDEWPBK9v9vV3lQfjJ-DkM8Y_UfosK2H0R7gEvYpiW7zSlUNkdYWJ2ADLAQdigQRXt3AVTkQrUceFhIPgpFxOFvPJTPwaJlkQn3LLqUQ-Z0aGqTcpayment',
      cfEnv: 'SANDBOX',
      cardHolderName: 'Kishan Maurya',
      cardNumber: '',
      cardExpiryMM: '09',
      cardExpiryYY: '30',
      cardCVV: '123',
      upiId: '',
      nbAccountHolderName: 'Kishan Maurya',
      nbAccountNumber: '',
      nbAccountBankCode: '',
      nbAccountType: 'SAVINGS',
    };
  }

  updateStatus = (message: string) => {
    this.setState({responseText: message});
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };

  componentWillUnmount() {
    CFPaymentGatewayService.removeCallback();
  }

  componentDidMount() {
    const context = this;
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('onVerify Called', orderID);
        context.updateStatus('Verified: ' + orderID);
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.log('onError Called', error.getMessage());
        context.updateStatus(JSON.stringify(error));
      },
    });
  }

  private getSubscriptionSession(): CFSubscriptionSession {
    return new CFSubscriptionSession(
      this.state.sessionId,
      this.state.orderId,
      this.state.cfEnv === 'PROD'
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX,
    );
  }

  async _startSubscriptionCheckout() {
    try {
      const subscriptionSession = this.getSubscriptionSession();
      console.log('Subscription Session', JSON.stringify(subscriptionSession));
      CFPaymentGatewayService.doSubscriptionPayment(subscriptionSession);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startSubsCardPayment() {
    try {
      const card = new Card(
        this.state.cardNumber,
        this.state.cardHolderName,
        this.state.cardExpiryMM,
        this.state.cardExpiryYY,
        this.state.cardCVV,
      );
      CFPaymentGatewayService.makeSubsPayment(
        new CFSubsCardPayment(this.getSubscriptionSession(), card),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startSubsNBPayment() {
    try {
      const nb = new CFSubsNB(
        this.state.nbAccountHolderName,
        this.state.nbAccountNumber,
        this.state.nbAccountBankCode,
        this.state.nbAccountType,
      );
      CFPaymentGatewayService.makeSubsPayment(
        new CFSubsNBPayment(this.getSubscriptionSession(), nb),
      );
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _makeSubsUpiIntentPayment() {
    const apps = await CFPaymentGatewayService.getInstalledUpiApps();
    let id = '';
    JSON.parse(apps).forEach((item: any) => {
      id = item.appPackage;
    });
    try {
      const upi = new CFUPI(UPIMode.INTENT, this.state.upiId || id);
      CFPaymentGatewayService.makeSubsPayment(
        new CFSubsUPIPayment(this.getSubscriptionSession(), upi),
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
          <Text style={styles.headerTitle}>Subscription</Text>
        </View>

        <View style={styles.container}>
          {/* Session Inputs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session</Text>
            <TextInput
              style={styles.input}
              placeholder="Subscription Session Id"
              value={this.state.sessionId}
              onChangeText={v => this.setState({sessionId: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Order Id"
              value={this.state.orderId}
              onChangeText={v => this.setState({orderId: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Environment (SANDBOX / PRODUCTION)"
              value={this.state.cfEnv}
              onChangeText={v => this.setState({cfEnv: v})}
            />
          </View>

          {/* Subscription Checkout */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checkout</Text>
            <Button
              title="Start Subscription Checkout"
              onPress={() => this._startSubscriptionCheckout()}
            />
          </View>

          {/* Response */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Response</Text>
            <Text style={styles.responseText}>{this.state.responseText}</Text>
          </View>

          {/* Subscription Card Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Payment</Text>
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              keyboardType="numeric"
              onChangeText={v => this.setState({cardNumber: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Holder Name"
              value={this.state.cardHolderName}
              onChangeText={v => this.setState({cardHolderName: v})}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="MM"
                keyboardType="numeric"
                maxLength={2}
                value={this.state.cardExpiryMM}
                onChangeText={v => this.setState({cardExpiryMM: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="YY"
                keyboardType="numeric"
                maxLength={2}
                value={this.state.cardExpiryYY}
                onChangeText={v => this.setState({cardExpiryYY: v})}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="CVV"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
                value={this.state.cardCVV}
                onChangeText={v => this.setState({cardCVV: v})}
              />
            </View>
            <Button
              title="Pay with Card"
              onPress={() => this._startSubsCardPayment()}
            />
          </View>

          {/* Subscription NB Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Net Banking Payment</Text>
            <TextInput
              style={styles.input}
              placeholder="Account Holder Name"
              value={this.state.nbAccountHolderName}
              onChangeText={v => this.setState({nbAccountHolderName: v})}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Number"
              keyboardType="numeric"
              onChangeText={v => this.setState({nbAccountNumber: v})}
            />
            <TextInput
              style={styles.input}
              autoCapitalize="characters"
              placeholder="Bank Code (e.g. UTIB)"
              onChangeText={v =>
                this.setState({nbAccountBankCode: v.toUpperCase()})
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Account Type (e.g. SAVINGS)"
              autoCapitalize="characters"
              value={this.state.nbAccountType}
              onChangeText={v =>
                this.setState({nbAccountType: v.toUpperCase()})
              }
            />
            <Button
              title="Pay with Net Banking"
              onPress={() => this._startSubsNBPayment()}
            />
          </View>

          {/* Subscription UPI Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UPI Payment</Text>
            <TextInput
              style={styles.input}
              placeholder="PSP app package"
              onChangeText={v => this.setState({upiId: v})}
            />
            <Button
              title="Pay with UPI Intent"
              onPress={() => this._makeSubsUpiIntentPayment()}
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
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  flex1: {
    flex: 1,
  },
});
