import { TextInput } from 'react-native';
import React, { forwardRef } from 'react';
import { CFCardPayment, CFEnvironment } from 'cashfree-pg-api-contract';
import { CFPaymentGatewayService } from '../index';
function luhnCheck(cardNumber) {
    if (cardNumber.length === 0) {
        return false;
    }
    cardNumber = cardNumber.replace(/\s/g, ''); // Remove spaces
    let sum = 0;
    let isAlternate = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i], 10);
        if (isAlternate) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        isAlternate = !isAlternate;
    }
    return sum % 10 === 0;
}
/**
 * Fetching Tdr info with card bin data & cfSession object
 * @param session :  for payment sessionId & env
 * @param bin : for card number
 */
async function getTDR(session, bin) {
    const route = `/pg/sdk/js/${session.payment_session_id}/v2/tdr`;
    const body = JSON.stringify({ 'code': bin, 'code_type': 'bin' });
    return await getInfo(session.environment, route, body);
}
/**
 * Fetching CardBin info with card bin data & cfSession object
 * @param session :  for payment sessionId & env
 * @param bin : for card number
 */
async function getCardBin(session, bin) {
    const route = `/pg/sdk/js/${session.payment_session_id}/cardBin`;
    const body = JSON.stringify({ 'card_number': bin });
    return await getInfo(session.environment, route, body);
}
async function getInfo(env, route, bodyData) {
    let baseUrl = 'https://api.cashfree.com';
    if (env === CFEnvironment.SANDBOX) {
        baseUrl = 'https://sandbox.cashfree.com';
    }
    const url = baseUrl + route;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: bodyData,
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    }
    catch (error) {
        return null;
    }
}
const CardInput = forwardRef(({ cfSession, cardListener, style, ...props }, ref) => {
    const [inputNumber, setInputNumber] = React.useState('');
    React.useImperativeHandle(ref, () => ({ doPayment }));
    let tdrJson = null;
    let cardBinJson = null;
    let firstEightDigits = '';
    const handleChange = React.useCallback(async (cardNumber) => {
        let completeResponse = {};
        const textWithoutSpaces = cardNumber.replaceAll(' ', '');
        if (textWithoutSpaces.length === 0)
            setInputNumber('');
        let formattedText = '';
        /**
         * Code to format card input number & set to input box
         */
        for (let i = 0; i < textWithoutSpaces.length; i += 4) {
            let end = i + 4;
            if (end > textWithoutSpaces.length) {
                end = textWithoutSpaces.length;
            }
            formattedText += textWithoutSpaces.substring(i, end);
            if (end !== textWithoutSpaces.length) {
                formattedText += ' ';
            }
            setInputNumber(formattedText);
        }
        let tdrResponse = null;
        let cardBinResponse = null;
        /**
         * Fetch Tdr & CardBin data & set to local variable
         */
        async function fetchDataAndSet() {
            await getTDR(cfSession, textWithoutSpaces)
                .then((response) => {
                tdrResponse = response;
            })
                .catch(() => {
                tdrResponse = null;
            });
            await getCardBin(cfSession, textWithoutSpaces)
                .then((response) => {
                cardBinResponse = response;
            })
                .catch(() => {
                cardBinResponse = null;
            });
            if (tdrResponse) {
                tdrJson = tdrResponse;
                completeResponse['tdr_info'] = tdrJson;
            }
            if (cardBinResponse) {
                cardBinJson = cardBinResponse;
                completeResponse['card_bin_info'] = cardBinJson;
            }
        }
        if (textWithoutSpaces.length === 8) {
            firstEightDigits = textWithoutSpaces;
            await fetchDataAndSet();
        }
        else if (textWithoutSpaces.length > 8) {
            if (firstEightDigits === textWithoutSpaces.substring(0, 8)) {
                completeResponse['tdr_info'] = tdrJson;
                completeResponse['card_bin_info'] = cardBinJson;
            }
            else {
                firstEightDigits = textWithoutSpaces.substring(0, 8);
                tdrJson = null;
                cardBinJson = null;
                await fetchDataAndSet();
            }
        }
        if (textWithoutSpaces.length < 8) {
            cardBinJson = null;
            tdrJson = null;
            firstEightDigits = '';
        }
        if (cardBinJson !== null) {
            completeResponse['card_network'] = cardBinJson['scheme'];
        }
        completeResponse['luhn_check_info'] = 'SUCCESS';
        if (!luhnCheck(textWithoutSpaces)) {
            completeResponse['luhn_check_info'] = 'FAIL';
        }
        completeResponse['card_length'] = textWithoutSpaces.length;
        return cardListener(JSON.stringify(completeResponse));
    }, [cardListener]);
    const doPayment = (cardInfo) => {
        try {
            cardInfo.cardNumber = inputNumber.replaceAll(' ', '');
            const cardPayment = new CFCardPayment(cfSession, cardInfo);
            CFPaymentGatewayService.makePayment(cardPayment);
        }
        catch (e) {
            console.log(e.message);
        }
    };
    const handleSubmitEditingEvent = (event) => {
        const newEvent = { ...event };
        delete newEvent.nativeEvent.text;
        if (onSubmitEditing) {
            onSubmitEditing(newEvent);
        }
    };
    const handleEndEditingEvent = (event) => {
        const newEvent = { ...event };
        delete newEvent.nativeEvent.text;
        if (onEndEditing) {
            onEndEditing(newEvent);
        }
    };
    const handleFocusEvent = (event) => {
        const newEvent = { ...event };
        delete newEvent.nativeEvent.text;
        if (onFocus) {
            onFocus(newEvent);
        }
    };
    const handleBlurEvent = (event) => {
        const newEvent = { ...event };
        delete newEvent.nativeEvent.text;
        if (onBlur) {
            onBlur(newEvent);
        }
    };
    const InputComponent = TextInput;
    const { onChangeText, onChange, onSubmitEditing, onEndEditing, onFocus, onBlur, ...otherProps } = props;
    return (React.createElement(InputComponent, { keyboardType: 'numeric', inputMode: 'numeric', value: inputNumber, onChangeText: handleChange, onSubmitEditing: handleSubmitEditingEvent, onEndEditing: handleEndEditingEvent, onFocus: handleFocusEvent, onBlur: handleBlurEvent, style: style, ...otherProps }));
});
export default CardInput;
