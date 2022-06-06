// @ts-nocheck

import * as React from 'react';
import { Component } from 'react';

import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import {
  CFCallback,
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  CFDropCheckoutPayment,
  CFEnvironment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
  CFSession,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';

const BASE_RESPONSE_TEXT = 'Response or error will show here.';

export default class App extends Component implements CFCallback {
  constructor() {
    super();

    this.state = {
      responseText: BASE_RESPONSE_TEXT,
    };
  }

  onVerify(orderID: string): void {
    this.changeResponseText('orderId is :' + orderID);
  }
  onError(error: CFErrorResponse, orderID: string): void {
    this.changeResponseText(
      'exception is : ' + JSON.stringify(error) + '\norderId is :' + orderID
    );
  }

  componentDidMount() {
    console.log('MOUNTED');
    CFPaymentGatewayService.setCallback(this);
  }

  componentWillUnmount() {
    console.log('UNMOUNTED');
    CFPaymentGatewayService.removeCallback();
  }

  changeResponseText = (message: string) => {
    this.setState({
      responseText: message,
    });
  };

  async _startCheckout() {
    try {
      const session = new CFSession(
        'EKnOtw8HtEo26tlmUg6P',
        'order_1246922AeJyW66DV9SAC7LJL5UJGfmZuW',
        CFEnvironment.SANDBOX
      );
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
        theme
      );
      CFPaymentGatewayService.doPayment(dropPayment);
    } catch (e: any) {
      console.log(e.message);
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.button}>
          <Button onPress={() => this._startCheckout()} title="Start Payment" />
        </View>
        <Text style={styles.response_text}> {this.state.responseText} </Text>
      </View>
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
  },
});
