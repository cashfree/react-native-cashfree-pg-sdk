import { TextInput, TextInputProps } from 'react-native';
import React, { forwardRef } from 'react';
import {
  CFSubsCardPayment,
  CFEnvironment,
  type CFSubscriptionSession,
  ElementCard,
} from 'cashfree-pg-api-contract';
import { CFPaymentGatewayService } from '../index';

function luhnCheck(cardNumber: string): boolean {
  if (cardNumber.length === 0) {
    return false;
  }

  cardNumber = cardNumber.replace(/\s/g, '');

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

function getInputValidationDetails(cardBinResponse: any) {
  if (!cardBinResponse || !cardBinResponse.scheme) {
    return null;
  }

  let schemeType = cardBinResponse.scheme.toLowerCase();
  let inputValidationDetails: { max_input_length: number; cvv_length: number };
  switch (schemeType) {
    case 'amex':
      inputValidationDetails = { max_input_length: 15, cvv_length: 4 };
      break;
    case 'diners':
      inputValidationDetails = { max_input_length: 14, cvv_length: 3 };
      break;
    default: // Covers visa, mastercard, rupay, jcb, discover, and unknown schemes
      inputValidationDetails = { max_input_length: 16, cvv_length: 3 };
  }
  return inputValidationDetails;
}

/**
 * Fetching CardBin info with card bin data & CFSubscriptionSession object
 * @param session :  for subs sessionId & env
 * @param bin : for card number
 */
async function getCardBin(session: CFSubscriptionSession, bin: string) {
  const route: string = `/pg/sdk/js/subscription/card/bin`;
  const body: string = JSON.stringify({ card_number: bin });
  let baseUrl = 'https://api.cashfree.com';
  if (session.environment === CFEnvironment.SANDBOX) {
    baseUrl = 'https://sandbox.cashfree.com';
  }
  const url = baseUrl + route;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sub-session-id': session.subscription_session_id,
      },
      body,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    return null;
  }
}

export type SubsCardPaymentHandle = {
  doSubscriptionPayment: (cardInfo: ElementCard) => void;
  doSubscriptionPaymentWithNewSession: (
    cardInfo: ElementCard,
    cfSubscriptionSession: CFSubscriptionSession
  ) => void;
};

export type SubsCardInputProps = {
  cfSubscriptionSession: CFSubscriptionSession;
  cardListener: (response: string) => void;
} & TextInputProps;

const SubsCardInput: any = forwardRef<
  SubsCardPaymentHandle,
  SubsCardInputProps
>(
  (
    {
      cfSubscriptionSession,
      cardListener,
      style,
      ...props
    }: SubsCardInputProps,
    ref
  ) => {
    const [inputNumber, setInputNumber] = React.useState('');
    const inputNumberRef = React.useRef('');
    const sessionRef = React.useRef(cfSubscriptionSession);
    React.useImperativeHandle(ref, () => ({
      doSubscriptionPayment,
      doSubscriptionPaymentWithNewSession,
    }));

    const cardBinJsonRef = React.useRef<any>(null);
    const firstEightDigitsRef = React.useRef<string>('');

    const handleChange = React.useCallback(
      async (cardNumber: string) => {
        let completeResponse: any = {};
        const textWithoutSpaces: string = cardNumber.replaceAll(' ', '');
        if (textWithoutSpaces.length === 0) setInputNumber('');

        let formattedText: string = '';
        for (let i: number = 0; i < textWithoutSpaces.length; i += 4) {
          let end: number = i + 4;
          if (end > textWithoutSpaces.length) {
            end = textWithoutSpaces.length;
          }
          formattedText += textWithoutSpaces.substring(i, end);
          if (end !== textWithoutSpaces.length) {
            formattedText += ' ';
          }
          inputNumberRef.current = formattedText;
          setInputNumber((prev) =>
            prev === formattedText ? prev : formattedText
          );
        }

        let cardBinResponse: any = null;

        async function fetchCardBinAndSet() {
          await getCardBin(cfSubscriptionSession, textWithoutSpaces)
            .then((response: string) => {
              cardBinResponse = response;
              firstEightDigitsRef.current = textWithoutSpaces.substring(0, 8);
            })
            .catch(() => {
              cardBinResponse = null;
            });

          if (cardBinResponse) {
            cardBinJsonRef.current = cardBinResponse;
            completeResponse.card_bin_info = cardBinJsonRef.current;
            completeResponse.input_validation = getInputValidationDetails(
              cardBinJsonRef.current
            );
          }
        }

        if (textWithoutSpaces.length === 8) {
          await fetchCardBinAndSet();
        } else if (textWithoutSpaces.length > 8) {
          if (
            firstEightDigitsRef.current === textWithoutSpaces.substring(0, 8)
          ) {
            completeResponse.card_bin_info = cardBinJsonRef.current;
            completeResponse.input_validation = getInputValidationDetails(
              cardBinJsonRef.current
            );
          } else {
            cardBinJsonRef.current = null;
            await fetchCardBinAndSet();
          }
        }

        if (textWithoutSpaces.length < 8) {
          cardBinJsonRef.current = null;
          firstEightDigitsRef.current = '';
        }

        if (cardBinJsonRef.current !== null) {
          completeResponse.card_network = cardBinJsonRef.current.scheme;
        }
        let luhnStatus = luhnCheck(textWithoutSpaces);
        if (luhnStatus) {
          completeResponse.luhn_check_info = 'SUCCESS';
          if (textWithoutSpaces && textWithoutSpaces.length > 4) {
            completeResponse.last_four_digit = textWithoutSpaces.substring(
              textWithoutSpaces.length - 4
            );
          }
        } else {
          completeResponse.luhn_check_info = 'FAIL';
        }
        completeResponse.card_length = textWithoutSpaces.length;

        return cardListener(JSON.stringify(completeResponse));
      },
      [cfSubscriptionSession, cardListener]
    );

    const doSubscriptionPayment = (cardInfo: ElementCard) => {
      try {
        let cfCardNumber = inputNumberRef.current;
        cardInfo.cardNumber = cfCardNumber.replaceAll(' ', '');
        const cardPayment = new CFSubsCardPayment(sessionRef.current, cardInfo);
        CFPaymentGatewayService.makeSubsPayment(cardPayment);
      } catch (e: any) {
        console.log(e.message);
      }
    };

    const doSubscriptionPaymentWithNewSession = (
      cardInfo: ElementCard,
      session: CFSubscriptionSession
    ) => {
      try {
        sessionRef.current = session;
        doSubscriptionPayment(cardInfo);
      } catch (e: any) {
        console.log(e.message);
      }
    };

    const handleSubmitEditingEvent = (event: any) => {
      const newEvent = { ...event };
      delete newEvent.nativeEvent.text;
      if (onSubmitEditing) {
        onSubmitEditing(newEvent);
      }
    };

    const handleEndEditingEvent = (event: any) => {
      const newEvent = { ...event };
      delete newEvent.nativeEvent.text;
      if (onEndEditing) {
        onEndEditing(newEvent);
      }
    };

    const handleFocusEvent = (event: any) => {
      const newEvent = { ...event };
      delete newEvent.nativeEvent.text;
      if (onFocus) {
        onFocus(newEvent);
      }
    };

    const handleBlurEvent = (event: any) => {
      const newEvent = { ...event };
      delete newEvent.nativeEvent.text;
      if (onBlur) {
        onBlur(newEvent);
      }
    };

    const InputComponent: any = TextInput;
    const {
      onChangeText,
      onChange,
      onSubmitEditing,
      onEndEditing,
      onFocus,
      onBlur,
      ...otherProps
    } = props;

    return (
      <InputComponent
        keyboardType="numeric"
        inputMode={'numeric'}
        value={inputNumber}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmitEditingEvent}
        onEndEditing={handleEndEditingEvent}
        onFocus={handleFocusEvent}
        onBlur={handleBlurEvent}
        style={style}
        {...otherProps}
      />
    );
  }
);

export default SubsCardInput;
