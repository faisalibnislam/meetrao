import Foundation

/// Where the app talks to, and which features are switched on.
///
/// Everything here comes from Info.plist, which is filled from the build
/// settings in project.yml, so a build points at one backend and cannot be
/// pointed elsewhere at runtime. The one exception is a DEBUG build, which
/// honours `MEETRAO_CONVEX_URL` / `MEETRAO_SITE_URL` from the environment so a
/// simulator run can use a local backend without editing the project.
nonisolated enum MeetraoConfig {
    private static func value(_ key: String) -> String? {
        #if DEBUG
        if let override = ProcessInfo.processInfo.environment[overrideName(for: key)], !override.isEmpty {
            return override
        }
        #endif
        let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String
        return raw?.trimmingCharacters(in: .whitespaces).isEmpty == false ? raw : nil
    }

    private static func overrideName(for key: String) -> String {
        switch key {
        case "MeetraoConvexURL": "MEETRAO_CONVEX_URL"
        case "MeetraoSiteURL": "MEETRAO_SITE_URL"
        default: key
        }
    }

    /// The Convex deployment, e.g. https://avid-dotterel-109.convex.cloud.
    static var convexURL: String {
        value("MeetraoConvexURL") ?? "https://avid-dotterel-109.convex.cloud"
    }

    /// The website: booking links, the app's API routes, and anything only the web can do.
    static var siteURL: URL {
        URL(string: value("MeetraoSiteURL") ?? "https://meetrao.com") ?? URL(string: "https://meetrao.com")!
    }

    /// meetrao.com, without the scheme, as booking links are written.
    static var siteHost: String {
        siteURL.host(percentEncoded: false) ?? "meetrao.com"
    }

    /// The Keychain group the app and the widget share. Includes the team
    /// prefix once a team is chosen in Xcode; without one it is unprefixed,
    /// which the simulator accepts and a device build without a team cannot.
    static var keychainGroup: String? {
        value("MeetraoKeychainGroup")
    }

    /// Sign in with Apple. Needs an Apple Developer membership; see ios/README.md.
    static var appleSignInEnabled: Bool { value("MeetraoAppleSignIn") == "YES" }

    /// Push notifications. Needs an Apple Developer membership; see ios/README.md.
    static var pushEnabled: Bool { value("MeetraoPush") == "YES" }
}
