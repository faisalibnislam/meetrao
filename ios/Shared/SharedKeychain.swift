import Foundation
import Security

/// The few values the app and its widget share: the session tokens and the
/// widget's snapshot of upcoming bookings.
///
/// The Keychain rather than an App Group, because a shared Keychain group
/// works on a free Apple account and an App Group does not. Items are
/// readable after the first unlock, so the widget can refresh on a locked
/// phone; they never leave the device (`ThisDeviceOnly`), so a backup restored
/// onto another phone does not carry somebody's session with it.
nonisolated enum SharedKeychain {
    private static let service = "com.meetrao.app"

    private static func baseQuery(_ account: String, group: String?) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if let group { query[kSecAttrAccessGroup as String] = group }
        return query
    }

    /// The shared group when the build is entitled to it, otherwise the app's
    /// own Keychain. errSecMissingEntitlement is what a build without the
    /// group (an unsigned simulator build, say) gets for asking.
    private static func perform<T>(_ body: (String?) -> (OSStatus, T)) -> T {
        let shared = body(MeetraoConfig.keychainGroup)
        if shared.0 == errSecMissingEntitlement { return body(nil).1 }
        return shared.1
    }

    static func read(_ account: String) -> Data? {
        perform { group -> (OSStatus, Data?) in
            var query = baseQuery(account, group: group)
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            var result: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &result)
            return (status, status == errSecSuccess ? result as? Data : nil)
        }
    }

    @discardableResult
    static func write(_ data: Data, account: String) -> Bool {
        perform { group -> (OSStatus, Bool) in
            let query = baseQuery(account, group: group)
            let attributes: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            ]
            var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if status == errSecItemNotFound {
                var add = query
                add.merge(attributes) { $1 }
                status = SecItemAdd(add as CFDictionary, nil)
            }
            return (status, status == errSecSuccess)
        }
    }

    static func delete(_ account: String) {
        perform { group -> (OSStatus, Void) in
            (SecItemDelete(baseQuery(account, group: group) as CFDictionary), ())
        }
    }
}
