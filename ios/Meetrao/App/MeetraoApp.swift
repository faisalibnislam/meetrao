import SwiftUI

@main
struct MeetraoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var app = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Theme.configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .tint(Color("AccentColor"))
                .task { await app.start() }
                .onOpenURL { app.router.open($0) }
                .onChange(of: scenePhase) { _, phase in
                    // The widget's fortnight slides forward with the clock.
                    if phase == .active { app.refreshWidget() }
                }
                .onAppear {
                    PushRegistrar.shared.onOpenBooking = { [router = app.router] in router.openBooking($0) }
                }
        }
    }
}
