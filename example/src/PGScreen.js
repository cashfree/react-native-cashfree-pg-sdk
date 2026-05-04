// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import CheckBox from '@react-native-community/checkbox';
import { Button, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, ToastAndroid, View, } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { Card, CFCardPayment, CFDropCheckoutPayment, CFEnvironment, CFPaymentComponentBuilder, CFPaymentModes, CFSession, CFThemeBuilder, CFUPI, CFUPIIntentCheckoutPayment, CFUPIPayment, ElementCard, SavedCard, UPIMode, } from 'cashfree-pg-api-contract';
import CustomCardInput from './CustomCardInput';
const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';
const SANDBOX_CLIENT_ID = 'TEST430329ae80e0f32e41a393d78b923034';
const SANDBOX_CLIENT_SECRET = 'TESTaf195616268bd6202eeb3bf8dc458956e7192a85';
const PROD_CLIENT_ID = '';
const PROD_CLIENT_SECRET = '';
function generateOrderId() {
    return ('devstudio_' +
        Math.floor(Math.random() * 9000000000000000000 + 1000000000000000000).toString());
}
export default class PGScreen extends Component {
    constructor(props) {
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
            cardNetwork: require('./assets/visa.png'),
        };
        this.cfCardInstance = this.createCFCard();
    }
    createCFCard() {
        return (React.createElement(CustomCardInput, { ref: this.creditCardRef, session: this.getFixSession(), cardListener: this.handleCFCardInput }));
    }
    updateStatus = (message) => {
        this.setState({ responseText: message });
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        }
    };
    handleCFCardInput = (data) => {
        const cardNetwork = JSON.parse(data)['card_network'];
        const networkMap = {
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
        CFPaymentGatewayService.setEventSubscriber({
            onReceivedEvent(eventName, map) {
                console.log('Event: ' + eventName + ' map: ' + JSON.stringify(map));
            },
        });
        CFPaymentGatewayService.setCallback({
            onVerify(orderID) {
                context.updateStatus('Verified: ' + orderID);
            },
            onError(error, orderID) {
                context.updateStatus(JSON.stringify(error));
            },
        });
    }
    getEnv() {
        return this.state.isSandbox
            ? CFEnvironment.SANDBOX
            : CFEnvironment.PRODUCTION;
    }
    getSession() {
        const env = this.getEnv();
        console.log('[PGScreen] getSession → env:', this.state.isSandbox ? 'SANDBOX' : 'PRODUCTION', '| orderId:', this.state.orderId);
        return new CFSession(this.state.sessionId, this.state.orderId, env);
    }
    getFixSession() {
        return new CFSession('session_4zxKsUyNPorU6aZbHcxf8LJmyET2xA_svlDF69vSa8k9mkjAV3Zeosc2l3__mxno38hTK3pXR6_jL8X5R5WVC9BEXoN6SPef5V5lAYJyIE234IODJE1TXtIpayment', 'devstudio_20339474', this.getEnv());
    }
    async createOrder() {
        this.setState({ isCreatingOrder: true, responseText: 'Creating order...' });
        const orderId = generateOrderId();
        const { isSandbox } = this.state;
        const apiUrl = isSandbox
            ? 'https://sandbox.cashfree.com/pg/orders'
            : 'https://api.cashfree.com/pg/orders';
        const clientId = isSandbox ? SANDBOX_CLIENT_ID : PROD_CLIENT_ID;
        const clientSecret = isSandbox ? SANDBOX_CLIENT_SECRET : PROD_CLIENT_SECRET;
        console.log('[PGScreen] createOrder → API:', apiUrl, '| env:', isSandbox ? 'SANDBOX' : 'PRODUCTION');
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
                    },
                    order_meta: {
                        return_url: `https://www.cashfree.com/devstudio/preview/pg/seamless?order_id={order_id}`,
                    },
                }),
            });
            const data = await response.json();
            if (data.payment_session_id) {
                this.setState({
                    orderId: data.order_id,
                    sessionId: data.payment_session_id,
                    responseText: 'Order created: ' + data.order_id,
                });
            }
            else {
                this.setState({
                    responseText: 'Order creation failed: ' + JSON.stringify(data),
                });
            }
        }
        catch (e) {
            this.setState({ responseText: 'Error: ' + e.message });
        }
        finally {
            this.setState({ isCreatingOrder: false });
        }
    }
    /** @deprecated Use WebCheckout or UPIIntent instead */
    async _startCheckout() {
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
            CFPaymentGatewayService.doPayment(new CFDropCheckoutPayment(this.getSession(), paymentModes, theme));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startWebCheckout() {
        try {
            CFPaymentGatewayService.doWebPayment(this.getSession());
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startUPICheckout() {
        try {
            const theme = new CFThemeBuilder()
                .setNavigationBarBackgroundColor('#E64A19')
                .setNavigationBarTextColor('#FFFFFF')
                .setButtonBackgroundColor('#FFC107')
                .setButtonTextColor('#FFFFFF')
                .setPrimaryTextColor('#212121')
                .setSecondaryTextColor('#757575')
                .build();
            CFPaymentGatewayService.doUPIPayment(new CFUPIIntentCheckoutPayment(this.getSession(), theme));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _makeUpiIntentPayment() {
        const apps = await CFPaymentGatewayService.getInstalledUpiApps();
        let id = '';
        JSON.parse(apps).forEach((item) => {
            id = item.appPackage;
        });
        try {
            const upi = new CFUPI(UPIMode.INTENT, this.state.upiId || id);
            CFPaymentGatewayService.makePayment(new CFUPIPayment(this.getSession(), upi));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    /** @deprecated Use UPI Intent instead */
    async _makeUpiCollectPayment() {
        try {
            const upi = new CFUPI(UPIMode.COLLECT, this.state.upiId);
            CFPaymentGatewayService.makePayment(new CFUPIPayment(this.getSession(), upi));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    handleSubmit = () => {
        if (this.creditCardRef.current) {
            const nonPciCard = new ElementCard(this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, this.state.toggleCheckBox);
            this.creditCardRef.current.doPaymentWithPaymentSessionId(nonPciCard, this.getSession());
        }
    };
    async _startCardPayment() {
        try {
            const card = new Card(this.state.cardNumber, this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, this.state.toggleCheckBox);
            CFPaymentGatewayService.makePayment(new CFCardPayment(this.getSession(), card));
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startSavedCardPayment() {
        try {
            const card = new SavedCard(this.state.instrumentId, this.state.cardCVV);
            CFPaymentGatewayService.makePayment(new CFCardPayment(this.getSession(), card));
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
                React.createElement(Text, { style: styles.headerTitle }, "Payment Gateway")),
            React.createElement(View, { style: styles.container },
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Session"),
                    React.createElement(Button, { title: this.state.isCreatingOrder
                            ? 'Creating Order...'
                            : 'Create Order', disabled: this.state.isCreatingOrder, onPress: () => this.createOrder() }),
                    React.createElement(View, { style: styles.divider }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Session Id", value: this.state.sessionId, onChangeText: v => this.setState({ sessionId: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Order Id", value: this.state.orderId, onChangeText: v => this.setState({ orderId: v }) }),
                    React.createElement(View, { style: styles.envToggleRow },
                        React.createElement(Text, { style: [
                                styles.envLabel,
                                this.state.isSandbox && styles.envLabelActive,
                            ] }, "SANDBOX"),
                        React.createElement(Switch, { value: !this.state.isSandbox, onValueChange: v => this.setState({ isSandbox: !v }), thumbColor: this.state.isSandbox ? '#2ecc71' : '#e74c3c', trackColor: { false: '#a8e6c1', true: '#f5a8a8' } }),
                        React.createElement(Text, { style: [
                                styles.envLabel,
                                !this.state.isSandbox && styles.envLabelActive,
                            ] }, "PRODUCTION")),
                    React.createElement(View, { style: [
                            styles.envBadge,
                            this.state.isSandbox
                                ? styles.envBadgeSandbox
                                : styles.envBadgeProd,
                        ] },
                        React.createElement(Text, { style: styles.envBadgeText }, this.state.isSandbox ? '🟢 SANDBOX' : '🔴 PRODUCTION')),
                    React.createElement(TextInput, { style: styles.input, placeholder: "VPA / PSP app package (UPI)", value: this.state.upiId, onChangeText: v => this.setState({ upiId: v }) })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Checkout"),
                    React.createElement(View, { style: styles.buttonGrid }, [
                        { title: 'Drop Payment', action: () => this._startCheckout() },
                        { title: 'Web Checkout', action: () => this._startWebCheckout() },
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
                    ].map(btn => (React.createElement(View, { key: btn.title, style: styles.gridButton },
                        React.createElement(Button, { title: btn.title, onPress: btn.action })))))),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Response"),
                    React.createElement(Text, { style: styles.responseText }, this.state.responseText)),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Card Payment (NonPCI)"),
                    React.createElement(View, { style: styles.cardContainer },
                        this.cfCardInstance,
                        React.createElement(Image, { style: styles.cardNetworkImg, source: this.state.cardNetwork })),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", placeholderTextColor: "#999", onChangeText: v => this.setState({ cardHolderName: v }) }),
                    React.createElement(View, { style: styles.row },
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "MM", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#999", onChangeText: v => this.setState({ cardExpiryMM: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "YY", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#999", onChangeText: v => this.setState({ cardExpiryYY: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, onChangeText: v => this.setState({ cardCVV: v }) })),
                    React.createElement(Button, { title: "Pay with Card (NonPCI)", onPress: this.handleSubmit })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Card Payment (PCI)"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Card Number", keyboardType: "numeric", maxLength: 16, placeholderTextColor: "#999", onChangeText: v => this.setState({ cardNumber: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", placeholderTextColor: "#999", onChangeText: v => this.setState({ cardHolderName: v }) }),
                    React.createElement(View, { style: styles.row },
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "MM", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#999", onChangeText: v => this.setState({ cardExpiryMM: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "YY", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#999", onChangeText: v => this.setState({ cardExpiryYY: v }) }),
                        React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, onChangeText: v => this.setState({ cardCVV: v }) })),
                    React.createElement(View, { style: styles.checkboxRow },
                        React.createElement(CheckBox, { value: this.state.toggleCheckBox, onValueChange: v => this.setState({ toggleCheckBox: v }) }),
                        React.createElement(Text, { style: styles.checkboxLabel }, "Save card for future payments")),
                    React.createElement(Button, { title: "Pay with Card (PCI)", onPress: () => this._startCardPayment() })),
                React.createElement(View, { style: styles.section },
                    React.createElement(Text, { style: styles.sectionTitle }, "Saved Card"),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Instrument Id", onChangeText: v => this.setState({ instrumentId: v }) }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, onChangeText: v => this.setState({ cardCVV: v }) }),
                    React.createElement(Button, { title: "Pay with Saved Card", onPress: () => this._startSavedCardPayment() })))));
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
