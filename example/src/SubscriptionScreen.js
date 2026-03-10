// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import { Button, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View, } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { Card, CFEnvironment, CFSubsCardPayment, CFSubsNB, CFSubsNBPayment, CFSubsUPIPayment, CFSubscriptionSession, CFUPI, UPIMode, } from 'cashfree-pg-api-contract';
const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';
export default class SubscriptionScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            responseText: BASE_RESPONSE_TEXT,
            orderId: 'devstudio_subs_7436757734765534284',
            sessionId: 'sub_session_g9jf7wWoyPn4UgZNDEWPBK9v9vV3lQfjJ-DkM8Y_UfosK2H0R7gEvYpiW7zSlUNkdYWJ2ADLAQdigQRXt3AVTkQrUceFhIPgpFxOFvPJTPwaJlkQn3LLqUQ-Z0aGqTcpayment',
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
    updateStatus = (message) => {
        this.setState({ responseText: message });
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
            onVerify(orderID) {
                console.log('onVerify Called', orderID);
                context.updateStatus('Verified: ' + orderID);
            },
            onError(error, orderID) {
                console.log('onError Called', error.getMessage());
                context.updateStatus(JSON.stringify(error));
            },
        });
    }
    getSubscriptionSession() {
        return new CFSubscriptionSession(this.state.sessionId, this.state.orderId, this.state.cfEnv === 'PROD'
            ? CFEnvironment.PRODUCTION
            : CFEnvironment.SANDBOX);
    }
    async _startSubscriptionCheckout() {
        try {
            const subscriptionSession = this.getSubscriptionSession();
            console.log('Subscription Session', JSON.stringify(subscriptionSession));
            CFPaymentGatewayService.doSubscriptionPayment(subscriptionSession);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startSubsCardPayment() {
        try {
            const card = new Card(this.state.cardNumber, this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV);
            CFPaymentGatewayService.makeSubsPayment(new CFSubsCardPayment(this.getSubscriptionSession(), card));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startSubsNBPayment() {
        try {
            const nb = new CFSubsNB(this.state.nbAccountHolderName, this.state.nbAccountNumber, this.state.nbAccountBankCode, this.state.nbAccountType);
            CFPaymentGatewayService.makeSubsPayment(new CFSubsNBPayment(this.getSubscriptionSession(), nb));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _makeSubsUpiIntentPayment() {
        const apps = await CFPaymentGatewayService.getInstalledUpiApps();
        let id = '';
        JSON.parse(apps).forEach((item) => {
            id = item.appPackage;
        });
        try {
            const upi = new CFUPI(UPIMode.INTENT, this.state.upiId || id);
            CFPaymentGatewayService.makeSubsPayment(new CFSubsUPIPayment(this.getSubscriptionSession(), upi));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    render() {
        return (React.createElement(ScrollView, { style: styles.screen },
            React.createElement(View, { style: styles.header },
                React.createElement(Pressable, { onPress: this.props.onBack, style: styles.backBtn },
                    React.createElement(Text, { style: styles.backBtnText }, "\u2190 Back")),
                React.createElement(Text, { style: styles.headerTitle }, "Subscription")),
            React.createElement(View, { style: styles.container },
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Session"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Subscription Session Id", value: this.state.sessionId, onChangeText: v => this.setState({ sessionId: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Order Id", value: this.state.orderId, onChangeText: v => this.setState({ orderId: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Environment (SANDBOX / PRODUCTION)", value: this.state.cfEnv, onChangeText: v => this.setState({ cfEnv: v }) })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Checkout"),
                    React.createElement(Button, { title: "Start Subscription Checkout", onPress: () => this._startSubscriptionCheckout() })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Response"),
                    React.createElement(Text, { style: styles.responseText }, this.state.responseText)),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Card Payment"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Card Number", keyboardType: "numeric", onChangeText: v => this.setState({ cardNumber: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", value: this.state.cardHolderName, onChangeText: v => this.setState({ cardHolderName: v }) }),
                    React.createElement(View, { style: styles.row },
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "MM", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryMM, onChangeText: v => this.setState({ cardExpiryMM: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "YY", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryYY, onChangeText: v => this.setState({ cardExpiryYY: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, value: this.state.cardCVV, onChangeText: v => this.setState({ cardCVV: v }) })),
                    React.createElement(Button, { title: "Pay with Card", onPress: () => this._startSubsCardPayment() })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Net Banking Payment"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Account Holder Name", value: this.state.nbAccountHolderName, onChangeText: v => this.setState({ nbAccountHolderName: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Account Number", keyboardType: "numeric", onChangeText: v => this.setState({ nbAccountNumber: v }) }),
                    React.createElement(TextInput, { style: styles.input, autoCapitalize: "characters", placeholder: "Bank Code (e.g. UTIB)", onChangeText: v => this.setState({ nbAccountBankCode: v.toUpperCase() }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Account Type (e.g. SAVINGS)", autoCapitalize: "characters", value: this.state.nbAccountType, onChangeText: v => this.setState({ nbAccountType: v.toUpperCase() }) }),
                    React.createElement(Button, { title: "Pay with Net Banking", onPress: () => this._startSubsNBPayment() })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "UPI Payment"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "PSP app package", onChangeText: v => this.setState({ upiId: v }) }),
                    React.createElement(Button, { title: "Pay with UPI Intent", onPress: () => this._makeSubsUpiIntentPayment() })))));
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
        shadowOffset: { width: 0, height: 1 },
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
