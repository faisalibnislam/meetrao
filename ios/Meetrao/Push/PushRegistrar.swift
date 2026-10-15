import Foundation
import UIKit
import UserNotifications

/// Push notifications. Built, and OFF until the build sets MEETRAO_PUSH=YES,
/// which needs an Apple Developer membership and the aps-environment
/// entitlement; see ios/README.md. Until then nothing here asks for
/// permission or registers anything, and the in-app list and email carry
/// every notification as before.
final class PushRegistrar: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushRegistrar()

    var onToken: ((String, Bool) -> Void)?
    var onOpenBooking: ((String) -> Void)?

    func requestIfEnabled() {
        guard MeetraoConfig.pushEnabled else { return }
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        Task {
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            if granted { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func didRegister(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        #if DEBUG
        onToken?(token, true)
        #else
        onToken?(token, false)
        #endif
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let id = response.notification.request.content.userInfo["bookingId"] as? String
        guard let id else { return }
        await MainActor.run { onOpenBooking?(id) }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushRegistrar.shared.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Push is a convenience; the in-app list and email still carry everything.
    }
}
