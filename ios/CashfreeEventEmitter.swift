//
//  CashfreeEventEmitter.swift
//  DoubleConversion
//
//  Created by Aabhas Jindal on 13/06/22.
//

import Foundation

@objc(CashfreeEventEmitter)
open class CashfreeEventEmitter: RCTEventEmitter {

    override init() {
        super.init()
        CashfreeEmitter.sharedInstance.registerEventEmitter(eventEmitter: self)
    }

    /// Base overide for RCTEventEmitter.
    ///
    /// - Returns: all supported events
    @objc open override func supportedEvents() -> [String] {
        return CashfreeEmitter.sharedInstance.allEvents
    }

    @objc public override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
