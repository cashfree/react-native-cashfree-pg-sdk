// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import { Alert, Button, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View, } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { Card, CFEnvironment, CFSubsCardPayment, CFSubsNB, CFSubsNBPayment, CFSubsUPIPayment, CFSubscriptionSession, CFUPI, ElementCard, UPIMode, } from 'cashfree-pg-api-contract';
import CustomSubsCardInput from './CustomSubsCardInput';
const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';
const CollapsibleSection = ({ title, children, defaultExpanded = true, }) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    return (React.createElement(View, { style: sectionStyles.section },
        React.createElement(Pressable, { onPress: () => setExpanded(e => !e), style: sectionStyles.header },
            React.createElement(Text, { style: sectionStyles.title }, title),
            React.createElement(Text, { style: sectionStyles.arrow }, expanded ? '▲' : '▼')),
        expanded && React.createElement(View, { style: sectionStyles.body }, children)));
};
const sectionStyles = StyleSheet.create({
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    arrow: {
        fontSize: 11,
        color: '#888',
    },
    body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
});
const showAlert = (message) => Alert.alert('Response', message, [{ text: 'OK' }]);
const CF_CLIENT_ID = 'TEST430329ae80e0f32e41a393d78b923034';
const CF_CLIENT_SECRET = 'TESTaf195616268bd6202eeb3bf8dc458956e7192a85';
function generateSubscriptionId() {
    return ('devstudio_subs_' +
        Math.floor(Math.random() * 9000000000000000000 + 1000000000000000000).toString());
}
export default class SubscriptionScreen extends Component {
    constructor(props) {
        super(props);
        this.subsCardRef = React.createRef();
        this.state = {
            responseText: BASE_RESPONSE_TEXT,
            orderId: '',
            sessionId: '',
            cfEnv: 'SANDBOX',
            isCreatingOrder: false,
            cardHolderName: 'Kishan Maurya',
            cardNumber: '4400060119105004',
            subsCardNetwork: require('./assets/visa.png'),
            cardExpiryMM: '09',
            cardExpiryYY: '30',
            cardCVV: '123',
            upiId: '',
            upiScheme: '',
            upiApps: [],
            showUpiSheet: false,
            nbAccountHolderName: 'Kishan Maurya',
            nbAccountNumber: '123456789',
            nbAccountBankCode: 'UTIB',
            nbAccountType: 'SAVINGS',
        };
        this.cfSubsCardInstance = this.createCFSubsCard();
    }
    createCFSubsCard() {
        const placeholderSession = new CFSubscriptionSession('sub_session_qgPMeZI6ndTwxX_i2LOzxWfc3aOiHtDMERAEcAOuzEPfZ3RhDGGlmvBYbar3qyEYFaIZf18onMEVPiyKKCtrAqW3X2drZt3KggKOGOIn2EuRaJ-eJefmekJmQLPL00Qpayment', 'devstudio_subs_7452294901250932111', CFEnvironment.SANDBOX);
        return (React.createElement(CustomSubsCardInput, { ref: this.subsCardRef, cfSubscriptionSession: placeholderSession, cardListener: this.handleSubsCardInput }));
    }
    handleSubsCardInput = (data) => {
        console.log('handleSubsCardInput Called', data);
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
            subsCardNetwork: networkMap[cardNetwork] ?? require('./assets/visa.png'),
        });
    };
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
        this.createSubscription();
        const context = this;
        CFPaymentGatewayService.setCallback({
            onVerify(orderID) {
                console.log('onVerify Called', orderID);
                context.updateStatus('Verified: ' + orderID);
                context.setState({ upiScheme: '' });
                showAlert(`Subs ID: ${orderID}`);
            },
            onError(error, orderID) {
                console.log('onError Called', error.getMessage());
                context.updateStatus(JSON.stringify(error));
                showAlert(`Order ID: ${orderID}\nCode: ${error.getCode()}\nMessage: ${error.getMessage()}`);
            },
        });
    }
    getSubscriptionSession() {
        return new CFSubscriptionSession(this.state.sessionId, this.state.orderId, this.state.cfEnv === 'PROD'
            ? CFEnvironment.PRODUCTION
            : CFEnvironment.SANDBOX);
    }
    async createSubscription() {
        this.setState({
            isCreatingOrder: true,
            responseText: 'Creating subscription...',
        });
        const subscriptionId = generateSubscriptionId();
        try {
            const response = await fetch('https://sandbox.cashfree.com/pg/subscriptions', {
                method: 'POST',
                headers: {
                    'x-client-id': CF_CLIENT_ID,
                    'x-client-secret': CF_CLIENT_SECRET,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-api-version': '2025-01-01',
                },
                body: JSON.stringify({
                    subscription_id: subscriptionId,
                    customer_details: {
                        customer_name: 'Harshith',
                        customer_email: 'test@cashfree.com',
                        customer_phone: '9876543210',
                    },
                    plan_details: {
                        plan_name: 'devstudio_subs_plan',
                        plan_type: 'ON_DEMAND',
                        plan_currency: 'INR',
                        plan_amount: 1,
                        plan_max_amount: 100,
                        plan_max_cycles: 0,
                        plan_note: 'on demand INR 1 plan',
                    },
                    authorization_details: {
                        authorization_amount: 1,
                        authorization_amount_refund: true,
                    },
                    subscription_meta: {
                        return_url: 'https://www.cashfree.com/devstudio/preview/subs/seamless',
                    },
                    subscription_expiry_time: '2027-03-12T09:51:01.688Z',
                }),
            });
            const data = await response.json();
            if (data.subscription_session_id) {
                this.setState({
                    orderId: data.subscription_id,
                    sessionId: data.subscription_session_id,
                    responseText: 'Subscription created: ' + data.subscription_id,
                });
            }
            else {
                this.setState({
                    responseText: 'Subscription creation failed: ' + JSON.stringify(data),
                });
                showAlert(this.state.responseText);
            }
        }
        catch (e) {
            this.setState({ responseText: 'Error: ' + e.message });
        }
        finally {
            this.setState({ isCreatingOrder: false });
        }
    }
    async _startSubscriptionCheckout() {
        try {
            const subscriptionSession = this.getSubscriptionSession();
            console.log('Subscription Session', JSON.stringify(subscriptionSession));
            CFPaymentGatewayService.doSubscriptionPayment(subscriptionSession);
        }
        catch (e) {
            console.log(e.message);
            showAlert(e.message);
        }
    }
    async _startSubsCardPayment() {
        try {
            const card = new Card(this.state.cardNumber, this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV);
            CFPaymentGatewayService.makeSubsPayment(new CFSubsCardPayment(this.getSubscriptionSession(), card));
        }
        catch (e) {
            console.log(e.message);
            showAlert(e.message);
        }
    }
    _startSubsCardPaymentNonPCI = () => {
        if (this.subsCardRef.current) {
            const elementCard = new ElementCard(this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, false);
            // this.subsCardRef.current.doSubscriptionPaymentWithNewSession(
            //   elementCard,
            //   this.getSubscriptionSession(),
            // );
            this.subsCardRef.current.doSubscriptionPayment(elementCard);
        }
    };
    async _startSubsNBPayment() {
        try {
            const nb = new CFSubsNB(this.state.nbAccountHolderName, this.state.nbAccountNumber, this.state.nbAccountBankCode, this.state.nbAccountType);
            CFPaymentGatewayService.makeSubsPayment(new CFSubsNBPayment(this.getSubscriptionSession(), nb));
        }
        catch (e) {
            console.log(e.message);
            showAlert(e.message);
        }
    }
    async _makeSubsUpiIntentPayment() {
        // If user typed a scheme manually, use it directly without showing sheet
        const manualScheme = this.state.upiScheme.trim();
        if (manualScheme.length > 0) {
            this._doSubsUpiPayment(manualScheme);
            return;
        }
        const FALLBACK_UPI_APPS = [
            { appName: 'Google Pay', appPackage: 'tez://' },
            { appName: 'PhonePe', appPackage: 'phonepe://' },
            { appName: 'Paytm', appPackage: 'paytmmp://' },
            { appName: 'BHIM', appPackage: 'bhim://' },
        ];
        try {
            const apps = await CFPaymentGatewayService.getInstalledUpiApps();
            const parsed = JSON.parse(apps);
            const list = parsed.length > 0 ? parsed : FALLBACK_UPI_APPS;
            this.setState({ upiApps: list, showUpiSheet: true });
        }
        catch (e) {
            console.log(e.message);
            this.setState({ upiApps: FALLBACK_UPI_APPS, showUpiSheet: true });
        }
    }
    async _doSubsUpiPayment(appPackage) {
        this.setState({
            upiId: appPackage,
            upiScheme: appPackage,
            showUpiSheet: false,
        });
        try {
            const upi = new CFUPI(UPIMode.INTENT, appPackage);
            const subsUpiPayment = new CFSubsUPIPayment(this.getSubscriptionSession(), upi);
            console.log('subsUpiPayment scheme:', appPackage, JSON.stringify(subsUpiPayment));
            CFPaymentGatewayService.makeSubsPayment(subsUpiPayment);
        }
        catch (e) {
            console.log(e.message);
            showAlert(e.message);
        }
    }
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement(ScrollView, { style: styles.screen },
                React.createElement(View, { style: styles.header },
                    React.createElement(Pressable, { onPress: this.props.onBack, style: styles.backBtn },
                        React.createElement(Text, { style: styles.backBtnText }, "\u2190 Back")),
                    React.createElement(Text, { style: styles.headerTitle }, "Subscription")),
                React.createElement(View, { style: styles.container },
                    React.createElement(CollapsibleSection, { title: "Session" },
                        React.createElement(Button, { title: this.state.isCreatingOrder
                                ? 'Creating Subscription...'
                                : 'Create Subscription', disabled: this.state.isCreatingOrder, onPress: () => this.createSubscription() }),
                        React.createElement(View, { style: styles.divider }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Subscription Session Id", value: this.state.sessionId, onChangeText: v => this.setState({ sessionId: v }) }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Order Id", value: this.state.orderId, onChangeText: v => this.setState({ orderId: v }) }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Environment (SANDBOX / PRODUCTION)", value: this.state.cfEnv, onChangeText: v => this.setState({ cfEnv: v }) })),
                    React.createElement(CollapsibleSection, { title: "Checkout" },
                        React.createElement(Button, { title: "Start Subscription Checkout", onPress: () => this._startSubscriptionCheckout() })),
                    React.createElement(CollapsibleSection, { title: "Response" },
                        React.createElement(Text, { style: styles.responseText }, this.state.responseText)),
                    React.createElement(CollapsibleSection, { title: "Card Payment", defaultExpanded: false },
                        React.createElement(TextInput, { style: styles.input, placeholder: "Card Number", keyboardType: "numeric", value: this.state.cardNumber, onChangeText: v => this.setState({ cardNumber: v }) }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", value: this.state.cardHolderName, onChangeText: v => this.setState({ cardHolderName: v }) }),
                        React.createElement(View, { style: styles.row },
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "MM", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryMM, onChangeText: v => this.setState({ cardExpiryMM: v }) }),
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "YY", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryYY, onChangeText: v => this.setState({ cardExpiryYY: v }) }),
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, value: this.state.cardCVV, onChangeText: v => this.setState({ cardCVV: v }) })),
                        React.createElement(Button, { title: "Pay with Card", onPress: () => this._startSubsCardPayment() })),
                    React.createElement(CollapsibleSection, { title: "Card Payment (NonPCI)", defaultExpanded: false },
                        React.createElement(View, { style: styles.cardContainer },
                            this.cfSubsCardInstance,
                            React.createElement(Image, { style: styles.cardNetworkImg, source: this.state.subsCardNetwork })),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", value: this.state.cardHolderName, onChangeText: v => this.setState({ cardHolderName: v }) }),
                        React.createElement(View, { style: styles.row },
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "MM", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryMM, onChangeText: v => this.setState({ cardExpiryMM: v }) }),
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "YY", keyboardType: "numeric", maxLength: 2, value: this.state.cardExpiryYY, onChangeText: v => this.setState({ cardExpiryYY: v }) }),
                            React.createElement(TextInput, { style: [styles.input, styles.flex1], placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, value: this.state.cardCVV, onChangeText: v => this.setState({ cardCVV: v }) })),
                        React.createElement(Button, { title: "Pay with Card (NonPCI)", onPress: this._startSubsCardPaymentNonPCI })),
                    React.createElement(CollapsibleSection, { title: "Net Banking Payment", defaultExpanded: false },
                        React.createElement(TextInput, { style: styles.input, placeholder: "Account Holder Name", value: this.state.nbAccountHolderName, onChangeText: v => this.setState({ nbAccountHolderName: v }) }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Account Number", keyboardType: "numeric", value: this.state.nbAccountNumber, onChangeText: v => this.setState({ nbAccountNumber: v }) }),
                        React.createElement(TextInput, { style: styles.input, autoCapitalize: "characters", placeholder: "Bank Code (e.g. UTIB)", value: this.state.nbAccountBankCode, onChangeText: v => this.setState({ nbAccountBankCode: v.toUpperCase() }) }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Account Type (e.g. SAVINGS)", autoCapitalize: "characters", value: this.state.nbAccountType, onChangeText: v => this.setState({ nbAccountType: v.toUpperCase() }) }),
                        React.createElement(Button, { title: "Pay with Net Banking", onPress: () => this._startSubsNBPayment() })),
                    React.createElement(CollapsibleSection, { title: "UPI Payment", defaultExpanded: false },
                        React.createElement(TextInput, { style: styles.input, placeholder: "UPI App Scheme (e.g. tez, phonepe) \u2014 leave empty for app list", autoCapitalize: "none", autoCorrect: false, value: this.state.upiScheme, onChangeText: v => this.setState({ upiScheme: v }) }),
                        React.createElement(Button, { title: "Pay with UPI Intent", onPress: () => this._makeSubsUpiIntentPayment() })))),
            React.createElement(Modal, { visible: this.state.showUpiSheet, transparent: true, animationType: "slide", onRequestClose: () => this.setState({ showUpiSheet: false }) },
                React.createElement(Pressable, { style: styles.sheetBackdrop, onPress: () => this.setState({ showUpiSheet: false }) }),
                React.createElement(View, { style: styles.sheet },
                    React.createElement(Text, { style: styles.sheetTitle }, "Select UPI App"),
                    React.createElement(FlatList, { data: this.state.upiApps, keyExtractor: (item) => item.appPackage, renderItem: ({ item }) => (React.createElement(Pressable, { style: styles.sheetItem, onPress: () => this._doSubsUpiPayment(item.appPackage) },
                            React.createElement(Text, { style: styles.sheetItemText }, item.appName),
                            React.createElement(Text, { style: styles.sheetItemSub }, item.appPackage))), ListEmptyComponent: React.createElement(Text, { style: styles.sheetEmpty }, "No UPI apps found") })))));
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
    divider: {
        height: 12,
    },
    sheetBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        maxHeight: '60%',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
    },
    sheetItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sheetItemText: {
        fontSize: 15,
        color: '#1a1a2e',
        fontWeight: '500',
    },
    sheetItemSub: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    sheetEmpty: {
        textAlign: 'center',
        color: '#888',
        paddingVertical: 24,
    },
});
