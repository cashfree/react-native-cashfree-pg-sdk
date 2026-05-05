import React, { forwardRef } from 'react';
import { CFSubsCard } from 'react-native-cashfree-pg-sdk';
const CustomSubsCardInput = forwardRef(({ cardListener, cfSubscriptionSession, ...props }, ref) => (React.createElement(CFSubsCard, { cfSubscriptionSession: cfSubscriptionSession, style: { flex: 1 }, cardListener: cardListener, placeholder: "Enter Card Number", placeholderTextColor: "#0000ff", underlineColorAndroid: "transparent", cursorColor: "gray", returnKeyType: "next", ref: ref, onSubmitEditing: () => console.log('onSubmitEditing'), onEndEditing: () => console.log('onEndEditing'), onBlur: () => console.log('onBlur'), onFocus: () => console.log('onFocus'), ...props })));
export default CustomSubsCardInput;
