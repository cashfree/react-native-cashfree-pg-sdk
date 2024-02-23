// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import { Button, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { CFDropCheckoutPayment, CFEnvironment, CFPaymentComponentBuilder, CFPaymentModes, CFSession, CFThemeBuilder, } from 'cashfree-pg-api-contract';
import CommonStyles from '../../globals/CommonStyles';
import showAlertWithMessage from '../../globals/AlertComponent';
import style from './style';

const Payment = () => {
    
    onVerify = (orderID) =>  {
      showAlertWithMessage('Payment has been processed successfully!');
    }
    onError = (error) => {
      console.error(error);
      const message = error?.message ? error.message : "Payment Failed"; 
      showAlertWithMessage(message);
    }
    
    React.useEffect(()=> {
      CFPaymentGatewayService.setCallback(this);
      return () => {
        CFPaymentGatewayService.removeCallback()
      }
    })
    
    
    const startCheckout = async () => {
        try {
            const session = 
            new CFSession('cwkJtCoS7uP06UE24nCP', 'a691cf5d-0144-4c0c-956a-e45af87e873b', CFEnvironment.SANDBOX);
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
            const dropPayment = new CFDropCheckoutPayment(session, paymentModes, theme);
            CFPaymentGatewayService.doPayment(dropPayment);
        }
        catch (e) {
          console.error(e);
        }
    }
    
    
    return (
      <View style={[CommonStyles.flexOne, CommonStyles.allCenter, style.container]}>
        <TouchableOpacity onPress={startCheckout} style={style.startPaymentButton}>
          <Text style={style.startPaymentText}>Start Payment</Text>
        </TouchableOpacity>
      </View>
    )
}

export default Payment;
