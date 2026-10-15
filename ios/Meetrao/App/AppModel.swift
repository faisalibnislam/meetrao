import AuthenticationServices
@preconcurrency import ConvexMobile
import Foundation
import Observation
import SwiftUI
import WidgetKit

/// The app's state: who is signed in, whether they may use the app yet, which
/// workspace they are in, and the live data every screen shares.
///
/// The gates are the web's, in the web's order (src/lib/data/session.ts):
/// signed in, email confirmed, has a profile, not suspended, onboarded.
@Observable
final class AppModel {
    enum Phase: Equatable {
        case launching
        case signedOut
        /// Signed up or signed in before confirming the email; a link is on its way.
        case confirmEmail(String)
        /// The account exists but onboarding (claiming a link) happens on the web.
        case finishOnWeb(Profile)
        case suspended
        case failed(String)
        case ready(Profile)
    }

    private(set) var phase: Phase = .launching
    private(set) var companies: [Company] = []
    var workspace: Workspace = .personal {
        didSet { UserDefaults.standard.set(workspace.companyID, forKey: Self.workspaceKey) }
    }

    let auth: ConvexAuthProvider
    let client: ConvexClientWithAuth<AuthTokens>
    let api: MeetraoAPI
    let router = Router()
    let unread = Live<Int>()

    @ObservationIgnored private let session = Live<SessionInfo>()
    @ObservationIgnored private let companiesQuery = Live<CompaniesResponse>()
    @ObservationIgnored private let widgetQuery = Live<[Booking]>()
    @ObservationIgnored private var pushToken: String?
    private static let workspaceKey = "workspace.company"

    init() {
        auth = ConvexAuthProvider(deploymentURL: MeetraoConfig.convexURL)
        client = ConvexClientWithAuth(deploymentUrl: MeetraoConfig.convexURL, authProvider: auth)
        api = MeetraoAPI(client: client, auth: auth)
    }

    var profile: Profile? {
        if case .ready(let profile) = phase { profile } else { nil }
    }

    // MARK: Launch and sign-in

    func start() async {
        guard phase == .launching else { return }
        guard AuthTokens.load() != nil else {
            phase = .signedOut
            return
        }
        switch await client.loginFromCache() {
        case .success: watchSession()
        case .failure(let error):
            // Offline at launch is not signed out; the session is still in the Keychain.
            phase = (error as? MeetraoError) == .offline ? .failed(MeetraoError.offline.message) : .signedOut
        }
    }

    func retryLaunch() async {
        phase = .launching
        await start()
    }

    func signIn(_ request: SignInRequest) async throws {
        auth.prepare(request)
        switch await client.login() {
        case .success:
            watchSession()
        case .failure(let error):
            if let sent = error as? VerificationSent {
                phase = .confirmEmail(sent.email)
                return
            }
            throw MeetraoError.from(error, fallback: Self.signInFallback(for: request))
        }
    }

    /// One message for "no such account" and "wrong password", as the web
    /// gives: telling them apart would tell anyone which emails have accounts.
    private static func signInFallback(for request: SignInRequest) -> String {
        if case .signUp = request { return "That email could not be registered." }
        return "That email and password don't match an account."
    }

    /// Google, through the browser. Convex finishes the OAuth dance on its own
    /// domain and hands back a one-time code at meetrao://auth, which is only
    /// useful with the verifier this app kept from the start.
    func signInWithGoogle(using session: WebAuthenticationSession) async throws {
        let start: SignInResult = try await auth.http.action("auth:signIn", args: [
            "provider": .string("google"),
            "params": .object(["redirectTo": .string("meetrao://auth")]),
        ])
        guard let redirect = start.redirect, let url = URL(string: redirect), let verifier = start.verifier else {
            throw MeetraoError(message: "Google sign-in is unavailable.")
        }
        let callback = try await session.authenticate(using: url, callback: .customScheme("meetrao"), additionalHeaderFields: [:])
        guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "code" })?.value
        else {
            throw MeetraoError(message: "Google didn't finish signing you in. Try again.")
        }
        try await signIn(.oauthCode(code: code, verifier: verifier))
    }

    func signOut() async {
        if let pushToken { try? await api.unregisterPush(token: pushToken) }
        stopWatching()
        await client.logout()
        WidgetSnapshot.clear()
        WidgetCenter.shared.reloadAllTimelines()
        companies = []
        workspace = .personal
        phase = .signedOut
    }

    /// Back to the sign-in screen from "confirm your email", to sign in once confirmed.
    func backToSignIn() {
        stopWatching()
        phase = .signedOut
    }

    // MARK: Session

    private func watchSession() {
        session.onValue = { [weak self] info in self?.apply(info) }
        session.onError = { [weak self] error in
            guard let self else { return }
            if AuthTokens.load() == nil {
                self.phase = .signedOut
            } else {
                self.phase = .failed(MeetraoError.from(error, fallback: "Meetrao didn't load. Try again.").message)
            }
        }
        session.watch(client, "whoami:session")
    }

    private func apply(_ info: SessionInfo) {
        guard info.authenticated else {
            Task { await signOut() }
            return
        }
        guard info.emailVerified == true else {
            phase = .confirmEmail(info.email ?? info.profile?.email ?? "")
            return
        }
        guard let profile = info.profile else {
            phase = .failed("This account has no profile. Contact support from meetrao.com.")
            return
        }
        if profile.isSuspended {
            phase = .suspended
            return
        }
        guard profile.isOnboarded else {
            phase = .finishOnWeb(profile)
            return
        }
        let firstTime = profile.id != self.profile?.id
        phase = .ready(profile)
        if firstTime { startWatching() }
    }

    private func startWatching() {
        watchCompanies()
        unread.watch(client, "notifications:unreadCount")
        refreshWidget()
        PushRegistrar.shared.onToken = { [weak self] token, sandbox in
            guard let self else { return }
            self.pushToken = token
            Task { try? await self.api.registerPush(token: token, sandbox: sandbox) }
        }
        PushRegistrar.shared.requestIfEnabled()
    }

    private func stopWatching() {
        session.stop()
        companiesQuery.stop()
        widgetQuery.stop()
        unread.stop()
    }

    private func watchCompanies() {
        let saved = UserDefaults.standard.string(forKey: Self.workspaceKey)
        companiesQuery.onValue = { [weak self] response in
            guard let self else { return }
            self.companies = response.companies
            // Keep the workspace in step with the list: a company somebody
            // was removed from cannot stay selected.
            let wanted = self.workspace.companyID ?? saved
            if let wanted, let company = response.companies.first(where: { $0.id == wanted }) {
                if self.workspace != .company(company) { self.workspace = .company(company) }
            } else if self.workspace != .personal {
                self.workspace = .personal
            }
        }
        companiesQuery.watch(client, "companies:mine")
    }

    // MARK: Widget

    /// The next fortnight of confirmed bookings, in every workspace, for the
    /// "Next meeting" widget. Called at launch and whenever the app comes back.
    func refreshWidget() {
        guard profile != nil else { return }
        let now = Date.now
        widgetQuery.onValue = { bookings in
            let items = bookings.prefix(12).map {
                WidgetSnapshot.Item(
                    id: $0.id, guest: $0.guestName, meeting: $0.meetingName,
                    startsAt: $0.startsAt, endsAt: $0.endsAt,
                    joinURL: $0.meetURL.flatMap(URL.init(string:))
                )
            }
            let snapshot = WidgetSnapshot(workspace: "", items: Array(items), updatedAt: .now)
            if snapshot.items != WidgetSnapshot.load()?.items {
                snapshot.save()
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
        widgetQuery.watch(client, "bookings:listForHost", [
            "from": (now.addingTimeInterval(-3 * 3600).timeIntervalSince1970 * 1000).rounded(),
            "to": (now.addingTimeInterval(14 * 86_400).timeIntervalSince1970 * 1000).rounded(),
            "status": "confirmed",
        ])
    }
}

/// Where the app should go next, from a widget tap, a push or a link.
@Observable
final class Router {
    enum Tab: Hashable {
        case today, bookings, meetings, availability, account
    }

    var tab: Tab = .today
    /// A booking to open once the Bookings tab is showing.
    var bookingID: String?

    func open(_ url: URL) {
        // meetrao://booking/<id>, from the widget.
        guard url.scheme == "meetrao", url.host() == "booking" else { return }
        let id = url.lastPathComponent
        guard !id.isEmpty, id != "/" else { return }
        openBooking(id)
    }

    func openBooking(_ id: String) {
        tab = .bookings
        bookingID = id
    }
}
