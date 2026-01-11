import { TextInput, TextInputProps } from 'react-native';
import React, { forwardRef } from 'react';
import {
  CFCardPayment,
  CFEnvironment,
  type CFSession,
  ElementCard,
} from 'cashfree-pg-api-contract';
import { CFPaymentGatewayService } from '../index';

function luhnCheck(cardNumber: string): boolean {
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
 * Fetching Tdr info with card bin data & cfSession object
 * @param session :  for payment sessionId & env
 * @param bin : for card number
 */
async function getTDR(session: CFSession, bin: string) {
  const route: string = `/pg/sdk/js/${session.payment_session_id}/v2/tdr`;
  const body: string = JSON.stringify({ code: bin, code_type: 'bin' });
  return await getInfo(session.environment, route, body);
}

/**
 * Fetching CardBin info with card bin data & cfSession object
 * @param session :  for payment sessionId & env
 * @param bin : for card number
 */
async function getCardBin(session: CFSession, bin: string) {
  const route: string = `/pg/sdk/js/${session.payment_session_id}/cardBin`;
  const body: string = JSON.stringify({ card_number: bin });
  return await getInfo(session.environment, route, body);
}

async function getInfo(env: string, route: string, bodyData: string) {
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
  } catch (error) {
    return null;
  }
}

export type CardPaymentHandle = {
  doPayment: (cardInfo: ElementCard) => void;
  doPaymentWithPaymentSessionId: (
    cardInfo: ElementCard,
    cfSession: CFSession
  ) => void;
};

export type CardInputProps = {
  cfSession: CFSession;
  cardListener: (response: string) => void;
} & TextInputProps;

const CardInput: any = forwardRef<CardPaymentHandle, CardInputProps>(
  ({ cfSession, cardListener, style, ...props }: CardInputProps, ref) => {
    const [inputNumber, setInputNumber] = React.useState('');
    const inputNumberRef = React.useRef('');
    const sessionRef = React.useRef(cfSession);
    React.useImperativeHandle(ref, () => ({
      doPayment,
      doPaymentWithPaymentSessionId,
    }));

    const tdrJsonRef = React.useRef<any>(null);
    const cardBinJsonRef = React.useRef<any>(null);
    const firstEightDigitsRef = React.useRef<string>('');

    const handleChange = React.useCallback(
      async (cardNumber: string) => {
        let completeResponse: any = {};
        const textWithoutSpaces: string = cardNumber.replaceAll(' ', '');
        if (textWithoutSpaces.length === 0) setInputNumber('');

        let formattedText: string = '';
        /**
         * Code to format card input number & set to input box
         */
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

        let tdrResponse: any = null;
        let cardBinResponse: any = null;

        /**
         * Fetch Tdr & CardBin data & set to local variable
         */
        async function fetchDataAndSet() {
          await getTDR(cfSession, textWithoutSpaces)
            .then((response: string) => {
              tdrResponse = response;
              firstEightDigitsRef.current = textWithoutSpaces.substring(0, 8);
            })
            .catch(() => {
              tdrResponse = null;
            });

          await getCardBin(cfSession, textWithoutSpaces)
            .then((response: string) => {
              cardBinResponse = response;
              firstEightDigitsRef.current = textWithoutSpaces.substring(0, 8);
            })
            .catch(() => {
              cardBinResponse = null;
            });

          if (tdrResponse) {
            tdrJsonRef.current = tdrResponse;
            completeResponse.tdr_info = tdrJsonRef.current;
          }

          if (cardBinResponse) {
            cardBinJsonRef.current = cardBinResponse;
            completeResponse.card_bin_info = cardBinJsonRef.current;
            completeResponse.input_validation = getInputValidationDetails(
              cardBinJsonRef.current
            );
          }
        }

        if (textWithoutSpaces.length === 8) {
          await fetchDataAndSet();
        } else if (textWithoutSpaces.length > 8) {
          if (
            firstEightDigitsRef.current === textWithoutSpaces.substring(0, 8)
          ) {
            completeResponse.tdr_info = tdrJsonRef.current;
            completeResponse.card_bin_info = cardBinJsonRef.current;
            completeResponse.input_validation = getInputValidationDetails(
              cardBinJsonRef.current
            );
          } else {
            tdrJsonRef.current = null;
            cardBinJsonRef.current = null;
            await fetchDataAndSet();
          }
        }

        if (textWithoutSpaces.length < 8) {
          tdrJsonRef.current = null;
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
      [cfSession, cardListener]
    );

    const doPayment = (cardInfo: ElementCard) => {
      try {
        let cfCardNumber = inputNumberRef.current;
        cardInfo.cardNumber = cfCardNumber.replaceAll(' ', '');
        const cardPayment = new CFCardPayment(sessionRef.current, cardInfo);
        CFPaymentGatewayService.makePayment(cardPayment);
      } catch (e: any) {
        console.log(e.message);
      }
    };

    const doPaymentWithPaymentSessionId = (
      cardInfo: ElementCard,
      session: CFSession
    ) => {
      try {
        sessionRef.current = session;
        doPayment(cardInfo);
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

export default CardInput;
