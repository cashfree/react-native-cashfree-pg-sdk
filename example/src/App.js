// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { CFDropCheckoutPayment, CFEnvironment, CFPaymentComponentBuilder, CFPaymentModes, CFSession, CFThemeBuilder, } from 'cashfree-pg-api-contract';
const BASE_RESPONSE_TEXT = 'Response or error will show here.';
export default class App extends Component {
    constructor() {
        super();
        this.state = {
            responseText: BASE_RESPONSE_TEXT,
        };
    }
    onVerify(orderID) {
        this.changeResponseText('orderId is :' + orderID);
    }
    onError(error, orderID) {
        this.changeResponseText('exception is : ' + JSON.stringify(error) + '\norderId is :' + orderID);
    }
    componentDidMount() {
        console.log('MOUNTED');
        CFPaymentGatewayService.setCallback(this);
    }
    componentWillUnmount() {
        console.log('UNMOUNTED');
        CFPaymentGatewayService.removeCallback();
    }
    changeResponseText = (message) => {
        this.setState({
            responseText: message,
        });
    };
    async _startCheckout() {
        try {
            const session = new CFSession('S2HJjrHMKJsqWc2grQav', 'order_779252M38wjqFdQHhlb7BXUkfObtULJ4', CFEnvironment.SANDBOX);
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
            console.log(e.message);
        }
    }
    render() {
        return (React.createElement(View, { style: styles.container },
            React.createElement(View, { style: styles.button },
                React.createElement(Button, { onPress: () => this._startCheckout(), title: "Start Payment" })),
            React.createElement(Text, { style: styles.response_text },
                " ",
                this.state.responseText,
                " ")));
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
