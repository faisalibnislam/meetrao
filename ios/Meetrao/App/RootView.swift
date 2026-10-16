import SwiftUI

/// The gates, then the app.
struct RootView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        Group {
            switch app.phase {
            case .launching:
                LaunchView()
            case .signedOut:
                AuthFlowView()
            case .confirmEmail(let email):
                ConfirmEmailView(email: email)
            case .finishOnWeb(let profile):
                FinishOnWebView(profile: profile)
            case .suspended:
                SuspendedView()
            case .failed(let message):
                FailedView(message: message)
            case .ready(let profile):
                MainView()
                    .environment(\.timeZone, profile.timeZone)
            }
        }
        .animation(.default, value: app.phase)
    }
}

private struct LaunchView: View {
    var body: some View {
        ZStack {
            Color("LaunchBackground").ignoresSafeArea()
            ProgressView()
        }
    }
}

private struct FailedView: View {
    @Environment(AppModel.self) private var app
    let message: String

    var body: some View {
        ContentUnavailableView {
            Label("Meetrao didn't load", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try again") { Task { await app.retryLaunch() } }
                .buttonStyle(.borderedProminent)
            Button("Sign out", role: .destructive) { Task { await app.signOut() } }
        }
    }
}

private struct SuspendedView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL

    var body: some View {
        ContentUnavailableView {
            Label("This account is suspended", systemImage: "lock")
        } description: {
            Text("You can't sign in and your booking page isn't taking new bookings. Meetings already on your calendar are unaffected.")
        } actions: {
            Button("Contact support") { openURL(Links.site("support")) }
                .buttonStyle(.borderedProminent)
            Button("Sign out") { Task { await app.signOut() } }
        }
    }
}

/// Onboarding (claiming a link, the first meeting, the hours) is on the web
/// for now: it is a once-only, keyboard-heavy flow, and the web version is
/// the one that is kept up to date.
private struct FinishOnWebView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL
    let profile: Profile

    var body: some View {
        ContentUnavailableView {
            Label("Finish setting up", systemImage: "checklist")
        } description: {
            Text("Choose your booking link and your first meeting on meetrao.com. Then come back here, and everything will be waiting.")
        } actions: {
            Button("Continue on meetrao.com") { openURL(Links.site("onboarding/1")) }
                .buttonStyle(.borderedProminent)
            Button("Sign out") { Task { await app.signOut() } }
        }
    }
}
