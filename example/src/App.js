// @ts-nocheck
import * as React from 'react';
import { Component } from 'react';
import CheckBox from '@react-native-community/checkbox';
import { Button, Image, Platform, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View, } from 'react-native';
import { CFPaymentGatewayService, } from 'react-native-cashfree-pg-sdk';
import { Card, CFCardPayment, CFDropCheckoutPayment, CFEnvironment, CFPaymentComponentBuilder, CFPaymentModes, CFSession, CFThemeBuilder, CFUPI, CFUPIIntentCheckoutPayment, CFUPIPayment, SavedCard, UPIMode, ElementCard, } from 'cashfree-pg-api-contract';
import CustomCardInput from './CustomCardInput';
const BASE_RESPONSE_TEXT = 'Payment Status will be shown here.';
export default class App extends Component {
    constructor() {
        super();
        this.creditCardRef = React.createRef();
        this.state = {
            responseText: BASE_RESPONSE_TEXT,
            cardNumber: '',
            cardHolderName: '',
            cardExpiryMM: '',
            cardExpiryYY: '',
            cardCVV: '',
            orderId: 'devstudio_76123729',
            sessionId: 'session_8HWBj0N2H2PKwKntO6sz6-490xsXxjxx45wLvgywsyn_Uvzk6UlA5aRxc41wR5qDkUHRfaiuHwFIztUtOhQvpGv0I-VJDMy2DtNQheppAO7pAxDMiA0Vifcpayment',
            instrumentId: '',
            toggleCheckBox: false,
            cfEnv: '',
            upiId: '',
            cardNetwork: require('./assets/visa.png'),
        };
        this.cfCardInstance = this.createCFCard();
    }
    createCFCard() {
        return React.createElement(CustomCardInput, { ref: this.creditCardRef, session: this.getFixSession(), cardListener: this.handleCFCardInput });
    }
    updateStatus = (message) => {
        this.setState({ responseText: message });
        ToastAndroid.show(message, ToastAndroid.SHORT);
    };
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
    handleEnv = (env) => {
        this.setState({ cfEnv: env });
    };
    handleUpi = (id) => {
        this.setState({ upiId: id });
    };
    handleCFCardInput = (data) => {
        console.log('CFCardInput FROM SDK', data);
        const cardNetwork = JSON.parse(data)['card_network'];
        switch (cardNetwork) {
            case 'visa': {
                this.setState({ cardNetwork: require('./assets/visa.png') });
                break;
            }
            case 'mastercard': {
                this.setState({ cardNetwork: require('./assets/mastercard.png') });
                break;
            }
            case 'amex': {
                this.setState({ cardNetwork: require('./assets/amex.png') });
                break;
            }
            case 'maestro': {
                this.setState({ cardNetwork: require('./assets/maestro.png') });
                break;
            }
            case 'rupay': {
                this.setState({ cardNetwork: require('./assets/rupay.png') });
                break;
            }
            case 'diners': {
                this.setState({ cardNetwork: require('./assets/diners.png') });
                break;
            }
            case 'discover': {
                this.setState({ cardNetwork: require('./assets/discover.png') });
                break;
            }
            case 'jcb': {
                this.setState({ cardNetwork: require('./assets/jcb.png') });
                break;
            }
            default: {
                this.setState({ cardNetwork: require('./assets/visa.png') });
            }
        }
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
                context.updateStatus(orderID);
            },
            onError(error, orderID) {
                console.log('exception is : ' +
                    JSON.stringify(error) +
                    '\norderId is :' +
                    orderID);
                context.updateStatus(JSON.stringify(error));
            },
        });
    }
    /**
     * @deprecated This is deprecated now. Please use WebCheckout or UPIIntentcheckout flow.
     */
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
            const session = this.getSession();
            console.log('Session', JSON.stringify(session));
            CFPaymentGatewayService.doWebPayment(session);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    /**
     * Use this method for card payment. This will require PCI-DSS certification to use.
     */
    async _startCardPayment() {
        try {
            const session = this.getSession();
            console.log('Session', JSON.stringify(session));
            const card = new Card(this.state.cardNumber, this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, this.state.toggleCheckBox);
            console.log('Card', JSON.stringify(card));
            const cardPayment = new CFCardPayment(session, card);
            CFPaymentGatewayService.makePayment(cardPayment);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    async _startSavedCardPayment() {
        try {
            const session = this.getSession();
            console.log('Session', JSON.stringify(session));
            const card = new SavedCard(this.state.instrumentId, this.state.cardCVV);
            const cardPayment = new CFCardPayment(session, card);
            CFPaymentGatewayService.makePayment(cardPayment);
        }
        catch (e) {
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
        }
        catch (e) {
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
        }
        catch (e) {
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
        }
        catch (e) {
            console.log(e.message);
        }
    }
    getSession() {
        return new CFSession(this.state.sessionId, this.state.orderId, this.state.cfEnv === 'PROD'
            ? CFEnvironment.PRODUCTION
            : CFEnvironment.SANDBOX);
    }
    /**
     *
     * @returns This is to handle Custom Card component.
     * Initially we will pass paymentSessionId to get view rendered properly. During payment, merchant will update or pass updated sessionId.
     * To handle scenario where merchant can't create order beforehand or before rendering.
     */
    getFixSession() {
        return new CFSession('session_4zxKsUyNPorU6aZbHcxf8LJmyET2xA_svlDF69vSa8k9mkjAV3Zeosc2l3__mxno38hTK3pXR6_jL8X5R5WVC9BEXoN6SPef5V5lAYJyIE234IODJE1TXtIpayment', 'devstudio_20339474', this.state.cfEnv === 'PROD'
            ? CFEnvironment.PRODUCTION
            : CFEnvironment.SANDBOX);
    }
    handleSubmit = () => {
        if (this.creditCardRef.current) {
            let nonPciCard = new ElementCard(this.state.cardHolderName, this.state.cardExpiryMM, this.state.cardExpiryYY, this.state.cardCVV, this.state.toggleCheckBox);
            console.log('Custom Card NonPCI', JSON.stringify(nonPciCard));
            this.creditCardRef.current.doPaymentWithPaymentSessionId(nonPciCard, this.getSession());
        }
    };
    render() {
        return (React.createElement(ScrollView, null,
            React.createElement(View, { style: styles.container },
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                    } },
                    React.createElement(TextInput, { style: styles.input, placeholder: "Session Id", keyboardType: "default", onChangeText: this.handleSessionId }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Order Id", keyboardType: "default", onChangeText: this.handleOrderId }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "SANDBOX", keyboardType: "default", onChangeText: this.handleEnv }),
                    React.createElement(TextInput, { style: styles.input, placeholder: "Enter VPA for Collect or PSP app package", keyboardType: "default", onChangeText: this.handleUpi })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startCheckout(), title: "Start Payment" })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startWebCheckout(), title: "Start Web Payment" })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._startUPICheckout(), title: "Start UPI Intent Checkout Payment" })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._makeUpiCollectPayment(), title: "Make UPI Collect Payment" })),
                React.createElement(View, { style: styles.button },
                    React.createElement(Button, { onPress: () => this._makeUpiIntentPayment(), title: "Make UPI Intent Payment" })),
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                        marginBottom: 10,
                    } },
                    React.createElement(Text, { style: styles.response_text },
                        " ",
                        this.state.responseText,
                        " ")),
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                        marginBottom: 10,
                    } },
                    React.createElement(View, { style: styles.cardContainer },
                        this.cfCardInstance,
                        React.createElement(Image, { color: "#000", style: {
                                margin: 5,
                            }, source: this.state.cardNetwork })),
                    React.createElement(View, { style: {
                            flexDirection: 'column',
                            alignSelf: 'stretch',
                            textAlign: 'center',
                        } },
                        React.createElement(TextInput, { style: styles.input, placeholder: "Holder Name", keyboardType: "default", placeholderTextColor: "#0000ff", underlineColorAndroid: 'transparent', cursorColor: 'gray', onChangeText: this.handleCardHolderName })),
                    React.createElement(View, { style: { flexDirection: 'row', alignSelf: 'stretch' } },
                        React.createElement(TextInput, { style: styles.input, placeholder: "Expiry Month", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#0000ff", underlineColorAndroid: 'transparent', cursorColor: 'gray', onChangeText: this.handleCardExpiryMM }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "Expiry Year", keyboardType: "numeric", maxLength: 2, placeholderTextColor: "#0000ff", underlineColorAndroid: 'transparent', cursorColor: 'gray', onChangeText: this.handleCardExpiryYY }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, onChangeText: this.handleCardCVV })),
                    React.createElement(View, { style: {
                            flexDirection: 'row',
                            alignSelf: 'stretch',
                            alignItems: 'center',
                            textAlign: 'center',
                        } },
                        React.createElement(CheckBox, { value: this.state.toggleCheckBox, onValueChange: this.handleSaveCardToggle }),
                        React.createElement(Text, null, "Saved Card for future payment")),
                    React.createElement(View, { style: styles.button },
                        React.createElement(Button, { onPress: () => this.handleSubmit(), title: "Card Payment" }))),
                React.createElement(View, { style: {
                        borderWidth: 1,
                        alignSelf: 'stretch',
                    } },
                    React.createElement(View, { style: {
                            flexDirection: 'column',
                            textAlign: 'center',
                            alignSelf: 'stretch',
                        } },
                        React.createElement(TextInput, { style: styles.input, placeholder: "Instrument Id", keyboardType: "default", onChangeText: this.handleInstrumentId }),
                        React.createElement(TextInput, { style: styles.input, placeholder: "CVV", keyboardType: "numeric", maxLength: 3, secureTextEntry: true, onChangeText: this.handleCardCVV })),
                    React.createElement(View, { style: styles.button },
                        React.createElement(Button, { onPress: () => this._startSavedCardPayment(), title: "Saved Card Payment" }))))));
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
    cardContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 10,
    },
});
