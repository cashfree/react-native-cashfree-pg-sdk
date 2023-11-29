// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import CheckBox from '@react-native-community/checkbox';
import { Button, Platform, StyleSheet, Text, View, TextInput, ScrollView } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { Card, CFCardPayment, CFDropCheckoutPayment, CFEnvironment, CFPaymentComponentBuilder, CFPaymentModes, CFSession, CFThemeBuilder, CFUPIIntentCheckoutPayment, SavedCard, } from 'cashfree-pg-api-contract';
const BASE_RESPONSE_TEXT = 'Response or error will show here.';
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
        };
    }
    handleCardNumber = (number) => {
        this.setState({ cardNumber: number });
    };
    handleCardHolderName = (name) => {
        this.setState({ cardHolderName: name });
    };
    handleCardExpiryMM = (month) => {
        this.setState({ cardExpiryMM: month });
    };
    handleCardExpiryYY = (year) => {
        this.setState({ cardExpiryYY: year });
    };
    handleCardCVV = (cvv) => {
        this.setState({ cardCVV: cvv });
    };
    handleOrderId = (orderId) => {
        this.setState({ orderId: orderId });
    };
    handleSessionId = (sessionId) => {
        this.setState({ sessionId: sessionId });
    };
    handleInstrumentId = (instrumentId) => {
        this.setState({ instrumentId: instrumentId });
    };
    handleSaveCardToggle = (toggleBox) => {
        this.setState({ toggleCheckBox: toggleBox });
    };
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
                console.log('exception is : ' +
                    JSON.stringify(error) +
                    '\norderId is :' +
                    orderID);
            },
        });
    }
    async _startCheckout() {
        try {
            const session = new CFSession(this.state.sessionId, this.state.orderId, CFEnvironment.SANDBOX);
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
            const session = new CFSession(this.state.sessionId, this.state.orderId, CFEnvironment.SANDBOX);
            console.log('Session', JSON.stringify(session));
            CFPaymentGatewayService.doWebPayment(JSON.stringify(session));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startCardPayment() {
        try {
            const session = new CFSession(this.state.sessionId, this.state.orderId, CFEnvironment.SANDBOX);
            console.log('Session', JSON.stringify(session));
            const card = new Card(this.state.cardNumber, this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, this.state.toggleCheckBox);
            console.log('Card', JSON.stringify(card));
            const cardPayment = new CFCardPayment(session, card);
            CFPaymentGatewayService.doCardPayment(cardPayment);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startSavedCardPayment() {
        try {
            const session = new CFSession(this.state.sessionId, this.state.orderId, CFEnvironment.SANDBOX);
            console.log('Session', JSON.stringify(session));
            const card = new SavedCard(this.state.instrumentId, this.state.cardCVV);
            const cardPayment = new CFCardPayment(session, card);
            CFPaymentGatewayService.doCardPayment(cardPayment);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startUPICheckout() {
        try {
            const session = new CFSession(this.state.sessionId, this.state.orderId, CFEnvironment.SANDBOX);
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
        }
        catch (e) {
            console.log(e.message);
        }
    }
    render() {
        return (React.createElement(ScrollView, null,
            React.createElement(View, { style: styles.container },
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                    } },
                    React.createElement(TextInput, { style: styles.input, placeholder: 'Session Id', keyboardType: 'default', onChangeText: this.handleSessionId }),
                    React.createElement(TextInput, { style: styles.input, placeholder: 'Order Id', keyboardType: 'default', onChangeText: this.handleOrderId })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startCheckout(), title: 'Start Payment' })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startWebCheckout(), title: 'Start Web Payment' })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startUPICheckout(), title: 'Start UPI Payment' })),
                React.createElement(Text, { style: styles.response_text },
                    " ",
                    this.state.responseText,
                    " "),
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                    } },
                    React.createElement(View, { style: { flexDirection: 'column', alignSelf: 'stretch', textAlign: 'center' } },
                        React.createElement(TextInput, { style: styles.input, placeholder: 'Card Number', keyboardType: 'numeric', maxLength: 16, onChangeText: this.handleCardNumber }),
                        React.createElement(TextInput, { style: styles.input, placeholder: 'Holder Name', keyboardType: 'default', onChangeText: this.handleCardHolderName })),
                    React.createElement(View, { style: { flexDirection: 'row', alignSelf: 'stretch' } },
                        React.createElement(TextInput, { style: styles.input, placeholder: 'Expiry Month', keyboardType: 'numeric', maxLength: 2, onChangeText: this.handleCardExpiryMM }),
                        React.createElement(TextInput, { style: styles.input, placeholder: 'Expiry Year', keyboardType: 'numeric', maxLength: 2, onChangeText: this.handleCardExpiryYY }),
                        React.createElement(TextInput, { style: styles.input, placeholder: 'CVV', keyboardType: 'numeric', maxLength: 3, secureTextEntry: true, onChangeText: this.handleCardCVV })),
                    React.createElement(View, { style: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', textAlign: 'center' } },
                        React.createElement(CheckBox, { value: this.state.toggleCheckBox, onValueChange: this.handleSaveCardToggle }),
                        React.createElement(Text, null, "Saved Card for future payment")),
                    React.createElement(View, { style: styles.button },
                        React.createElement(Button, { onPress: () => this._startCardPayment(), title: 'Card Payment' }))),
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                    } },
                    React.createElement(View, { style: { flexDirection: 'column', textAlign: 'center', alignSelf: 'stretch' } },
                        React.createElement(TextInput, { style: styles.input, placeholder: 'Instrument Id', keyboardType: 'default', onChangeText: this.handleInstrumentId }),
                        React.createElement(TextInput, { style: styles.input, placeholder: 'CVV', keyboardType: 'numeric', maxLength: 3, secureTextEntry: true, onChangeText: this.handleCardCVV })),
                    React.createElement(View, { style: styles.button },
                        React.createElement(Button, { onPress: () => this._startSavedCardPayment(), title: 'Saved Card Payment' }))))));
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
    input: {
        height: 40,
        margin: 12,
        borderWidth: 1,
        padding: 10,
    },
});
