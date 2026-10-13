//
//  CashfreeEmitter.swift
//  react-native-cashfree-pg-api
//
//  Created by Aabhas Jindal on 14/06/22.
//

@objc(CashfreeEmitter)
public class CashfreeEmitter: NSObject {

    /// Shared Instance.
    @objc public static var sharedInstance = CashfreeEmitter()

    // The active RCTEventEmitter, registered by the module when React Native creates it.
    private var eventEmitter: RCTEventEmitter?

    private override init() {}

    // When React Native instantiates the emitter it is registered here.
    @objc public func registerEventEmitter(eventEmitter: RCTEventEmitter) {
        self.eventEmitter = eventEmitter
    }

    @objc public func dispatch(name: String, body: Any?) {
        eventEmitter?.sendEvent(withName: name, body: body)
    }

    /// All Events which must be supported by React Native.
    @objc public lazy var allEvents: [String] = {
        var allEventNames: [String] = ["cfSuccess", "cfFailure", "cfEvent", "cfUpiApps"]

        // Append all events here

        return allEventNames
    }()
}
