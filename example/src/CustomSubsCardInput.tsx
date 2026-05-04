import type {CFSubscriptionSession} from 'cashfree-pg-api-contract';
import React, {forwardRef} from 'react';
import {CFSubsCard} from 'react-native-cashfree-pg-sdk';

interface CustomSubsCardInputProps {
  cardListener?: (response: string) => void;
  cfSubscriptionSession: CFSubscriptionSession;
  [key: string]: any;
}

const CustomSubsCardInput = forwardRef<any, CustomSubsCardInputProps>(
  ({cardListener, cfSubscriptionSession, ...props}, ref) => (
    <CFSubsCard
      cfSubscriptionSession={cfSubscriptionSession}
      style={{flex: 1}}
      cardListener={cardListener}
      placeholder="Enter Card Number"
      placeholderTextColor="#0000ff"
      underlineColorAndroid="transparent"
      cursorColor="gray"
      returnKeyType="next"
      ref={ref}
      onSubmitEditing={() => console.log('onSubmitEditing')}
      onEndEditing={() => console.log('onEndEditing')}
      onBlur={() => console.log('onBlur')}
      onFocus={() => console.log('onFocus')}
      {...props}
    />
  ),
);

export default CustomSubsCardInput;
