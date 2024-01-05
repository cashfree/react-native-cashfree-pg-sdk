// @ts-nocheck

import * as React from 'react';
import { Component } from 'react';
import CheckBox from '@react-native-community/checkbox';

import { Button, Platform, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native';
import { CFErrorResponse, CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import {
  Card,
  CFCardPayment,
  CFDropCheckoutPayment,
  CFEnvironment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
  CFSession,
  CFThemeBuilder,
  CFUPI,
  CFUPIIntentCheckoutPayment, CFUPIPayment,
  SavedCard,
  UPIMode,
} from 'cashfree-pg-api-contract';

const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';

export default class App extends Component {
  constructor() {
    super();

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
      cfEnv: '',
      upiId: '',
    };
  }

  updateStatus = (message: string) => {
    this.setState({ responseText: message });
    ToastAndroid.show(message, ToastAndroid.SHORT);
  };
  handleCardNumber = (number: string) => {
    this.setState({ cardNumber: number });
  };
  handleCardHolderName = (name: string) => {
    this.setState({ cardHolderName: name });
  };
  handleCardExpiryMM = (month: string) => {
    this.setState({ cardExpiryMM: month });
  };
  handleCardExpiryYY = (year: string) => {
    this.setState({ cardExpiryYY: year });
  };
  handleCardCVV = (cvv: string) => {
    this.setState({ cardCVV: cvv });
  };

  handleOrderId = (orderId: string) => {
    this.setState({ orderId: orderId });
  };
  handleSessionId = (sessionId: string) => {
    this.setState({ sessionId: sessionId });
  };

  handleInstrumentId = (instrumentId: string) => {
    this.setState({ instrumentId: instrumentId });
  };

  handleSaveCardToggle = (toggleBox: boolean) => {
    this.setState({ toggleCheckBox: toggleBox });
  };

  handleEnv = (env: string) => {
    this.setState({ cfEnv: env });
  };

  handleUpi = (id: string) => {
    this.setState({ upiId: id });
  };


  componentWillUnmount() {
    console.log('UNMOUNTED');
    CFPaymentGatewayService.removeCallback();
    CFPaymentGatewayService.removeEventSubscriber();
  }

  componentDidMount() {
    const context = this;
    console.log('MOUNTED');
    CFPaymentGatewayService.setEventSubscriber({
      onReceivedEvent(eventName: string, map: Map<string, string>): void {
        console.log(
          'Event recieved on screen: ' +
          eventName +
          ' map: ' +
          JSON.stringify(map),
        );
      },
    });
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('orderId is :' + orderID);
        context.updateStatus(orderID);
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.log(
          'exception is : ' +
          JSON.stringify(error) +
          '\norderId is :' +
          orderID,
        );
        context.updateStatus(JSON.stringify(error));
      },
    });
  }

  async _startCheckout() {
    try {
      const session = this.getSession();
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
      const dropPayment = new CFDropCheckoutPayment(
        session,
        paymentModes,
        theme,
      );
      console.log(JSON.stringify(dropPayment));
      CFPaymentGatewayService.doPayment(dropPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startWebCheckout() {
    try {
      const session = this.getSession();
      console.log('Session', JSON.stringify(session));
      CFPaymentGatewayService.doWebPayment(JSON.stringify(session));
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startCardPayment() {
    try {
      const session = this.getSession();
      console.log('Session', JSON.stringify(session));
      const card = new Card(this.state.cardNumber,
        this.state.cardHolderName,
        this.state.cardExpiryMM,
        this.state.cardExpiryYY,
        this.state.cardCVV,
        this.state.toggleCheckBox,
      );

      console.log('Card', JSON.stringify(card));
      const cardPayment = new CFCardPayment(session, card);
      CFPaymentGatewayService.makePayment(cardPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startSavedCardPayment() {
    try {
      const session = this.getSession();
      console.log('Session', JSON.stringify(session));
      const card = new SavedCard(
        this.state.instrumentId,
        this.state.cardCVV);
      const cardPayment = new CFCardPayment(session, card);
      CFPaymentGatewayService.makePayment(cardPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _startUPICheckout() {
    try {
      const session = this.getSession();
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#E64A19')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#FFC107')
        .setButtonTextColor('#FFFFFF')
        .setPrimaryTextColor('#212121')
        .setSecondaryTextColor('#757575')
        .build();
      const upiPayment = new CFUPIIntentCheckoutPayment(session, theme);
      console.log(JSON.stringify(upiPayment));
      CFPaymentGatewayService.doUPIPayment(upiPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _makeUpiIntentPayment() {
    const apps = await CFPaymentGatewayService.getInstalledUpiApps();
    console.log('Callback for Fetch UPI Apps :::==>' + apps);
    let id = '';
    JSON.parse(apps).forEach(item => {
      id = item.appPackage;
    });
    try {
      const session = this.getSession();
      console.log('Session', JSON.stringify(session));
      const upi = new CFUPI(UPIMode.INTENT, this.state.upiId);
      const cfUpiPayment = new CFUPIPayment(session, upi);
      CFPaymentGatewayService.makePayment(cfUpiPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  async _makeUpiCollectPayment() {
    try {
      const session = this.getSession();
      console.log('Session', JSON.stringify(session));
      const upi = new CFUPI(UPIMode.COLLECT, this.state.upiId);
      const cfUpiPayment = new CFUPIPayment(session, upi);
      CFPaymentGatewayService.makePayment(cfUpiPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  private getSession(): CFSession {
    return new CFSession(
      this.state.sessionId,
      this.state.orderId,
      this.state.cfEnv === 'PROD' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    );
  }

  render() {
    return (
      <ScrollView>
        <View style={styles.container}>
          <View style={{
            borderWidth: 1,
            alignSelf: 'stretch',
            textAlign: 'center',
          }}>
            <TextInput
              style={styles.input}
              placeholder='Session Id'
              keyboardType='default'
              onChangeText={this.handleSessionId}
            />
            <TextInput
              style={styles.input}
              placeholder='Order Id'
              keyboardType='default'
              onChangeText={this.handleOrderId}
            />
            <TextInput
              style={styles.input}
              placeholder='SANDBOX'
              keyboardType='default'
              onChangeText={this.handleEnv}
            />
            <TextInput
              style={styles.input}
              placeholder='Enter VPA for Collect or PSP app package'
              keyboardType='default'
              onChangeText={this.handleUpi}
            />
          </View>
          <View style={styles.button}>
            <Button onPress={() => this._startCheckout()} title='Start Payment' />
          </View>
          <View style={styles.button}>
            <Button
              onPress={() => this._startWebCheckout()}
              title='Start Web Payment'
            />
          </View>
          <View style={styles.button}>
            <Button
              onPress={() => this._startUPICheckout()}
              title='Start UPI Intent Checkout Payment'
            />
          </View>
          <View style={styles.button}>
            <Button
              onPress={() => this._makeUpiCollectPayment()}
              title='Make UPI Collect Payment'
            />
          </View>
          <View style={styles.button}>
            <Button
              onPress={() => this._makeUpiIntentPayment()}
              title='Make UPI Intent Payment'
            />
          </View>
          <View style={{
            borderWidth: 1,
            alignSelf: 'stretch',
            textAlign: 'center',
            marginBottom: 10,
          }}>
            <Text style={styles.response_text}> {this.state.responseText} </Text>
          </View>
          <View style={{
            borderWidth: 1,
            alignSelf: 'stretch',
            textAlign: 'center',
            marginBottom: 10,
          }}>
            <View style={{ flexDirection: 'column', alignSelf: 'stretch', textAlign: 'center' }}>
              <TextInput
                style={styles.input}
                placeholder='Card Number'
                keyboardType='numeric'
                maxLength={16}
                onChangeText={this.handleCardNumber}
              />
              <TextInput
                style={styles.input}
                placeholder='Holder Name'
                keyboardType='default'
                onChangeText={this.handleCardHolderName}
              />
            </View>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
              <TextInput
                style={styles.input}
                placeholder='Expiry Month'
                keyboardType='numeric'
                maxLength={2}
                onChangeText={this.handleCardExpiryMM}
              />
              <TextInput
                style={styles.input}
                placeholder='Expiry Year'
                keyboardType='numeric'
                maxLength={2}
                onChangeText={this.handleCardExpiryYY}
              />
              <TextInput
                style={styles.input}
                placeholder='CVV'
                keyboardType='numeric'
                maxLength={3}
                secureTextEntry={true}
                onChangeText={this.handleCardCVV}
              />
            </View>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', textAlign: 'center' }}>
              <CheckBox
                value={this.state.toggleCheckBox}
                onValueChange={this.handleSaveCardToggle}
              />
              <Text>Saved Card for future payment</Text>
            </View>
            <View style={styles.button}>
              <Button
                onPress={() => this._startCardPayment()}
                title='Card Payment'
              />
            </View>
          </View>

          <View style={{
            borderWidth: 1,
            alignSelf: 'stretch',
          }}>
            <View style={{ flexDirection: 'column', textAlign: 'center', alignSelf: 'stretch' }}>
              <TextInput
                style={styles.input}
                placeholder='Instrument Id'
                keyboardType='default'
                onChangeText={this.handleInstrumentId}
              />
              <TextInput
                style={styles.input}
                placeholder='CVV'
                keyboardType='numeric'
                maxLength={3}
                secureTextEntry={true}
                onChangeText={this.handleCardCVV}
              />
            </View>
            <View style={styles.button}>
              <Button
                onPress={() => this._startSavedCardPayment()}
                title='Saved Card Payment'
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: Platform.OS === 'ios' ? 56 : 24,
    backgroundColor: '#eaeaea',
    alignItems: 'center',
    flexDirection: 'column',
    flex: 1,
  },
  button: {
    color: '#61aafb',
    margin: 8,
    width: 200,
  },
  response_text: {
    margin: 16,
    fontSize: 14,
    color: 'black',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
