import type {CFSession} from 'cashfree-pg-api-contract';
import React, {forwardRef} from 'react';
import {CFCard} from 'react-native-cashfree-pg-sdk';

interface CustomCardInputProps {
  cardListener?: (response: any) => void;
  session: CFSession;
  [key: string]: any; // Allow other props
}
const CustomCardInput = forwardRef<any, CustomCardInputProps>(
  ({cardListener, session, ...props}, ref) => (
    <CFCard
      cfSession={session}
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

export default CustomCardInput;
