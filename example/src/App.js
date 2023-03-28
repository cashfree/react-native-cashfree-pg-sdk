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
    componentWillUnmount() {
        console.log('UNMOUNTED');
        CFPaymentGatewayService.removeCallback();
        CFPaymentGatewayService.removeEventSubscriber();
    }
    changeResponseText = (message) => {
        this.setState({
            responseText: message,
        });
    };
    componentDidMount() {
        console.log('MOUNTED');
        CFPaymentGatewayService.setEventSubscriber({
            onReceivedEvent(eventName, map) {
                console.log('Event recieved on screen: ' +
                    eventName +
                    ' map: ' +
                    JSON.stringify(map));
            },
        });
        CFPaymentGatewayService.setCallback({
            onVerify(orderID) {
                console.log('orderId is :' + orderID);
            },
            onError(error, orderID) {
                console.log('exception is : ' + JSON.stringify(error) + '\norderId is :' + orderID);
            },
        });
    }
    async _startCheckout() {
        try {
            const session = new CFSession('session_aylkHRUGzQST0wLy1MonXomw9sAQvascgHrHL3pIF4GMIPrCT1d-Z0i1qcxhUrcXNlsM23yzlhq-hfHQJwWIFFuTk7VKS7pzzt0GSbXr76Mu', 'order_70512NasKYpCj67pGgPklgNF8zrPazT', CFEnvironment.SANDBOX);
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
            console.log(JSON.stringify(dropPayment));
            CFPaymentGatewayService.doPayment(dropPayment);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startWebCheckout() {
        try {
            const session = new CFSession('session_aylkHRUGzQST0wLy1MonXomw9sAQvascgHrHL3pIF4GMIPrCT1d-Z0i1qcxhUrcXNlsM23yzlhq-hfHQJwWIFFuTk7VKS7pzzt0GSbXr76Mu', 'order_70512NasKYpCj67pGgPklgNF8zrPazT', CFEnvironment.SANDBOX);
            console.log('Session', JSON.stringify(session));
            CFPaymentGatewayService.doWebPayment(JSON.stringify(session));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    render() {
        return (React.createElement(View, { style: styles.container },
            React.createElement(View, { style: styles.button },
                React.createElement(Button, { onPress: () => this._startCheckout(), title: "Start Payment" })),
            React.createElement(View, { style: styles.button },
                React.createElement(Button, { onPress: () => this._startWebCheckout(), title: "Start Web Payment" })),
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
