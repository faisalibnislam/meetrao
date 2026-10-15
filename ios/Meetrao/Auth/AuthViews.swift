import AuthenticationServices
import CryptoKit
import SwiftUI

/// Sign in, or create an account.
struct AuthFlowView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @Environment(\.openURL) private var openURL

    enum Mode { case signIn, signUp }

    @State private var mode: Mode = .signIn
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @State private var appleNonce = ""
    @FocusState private var focus: Field?

    enum Field { case name, email, password }

    private var canSubmit: Bool {
        !busy && email.contains("@") && password.count >= (mode == .signUp ? 8 : 1)
            && (mode == .signIn || !name.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(alignment: .leading, spacing: 14) {
                        Wordmark(height: 28)
                        Text(mode == .signIn ? "Welcome back" : "Create your booking link")
                            .font(.serif(38, relativeTo: .largeTitle))
                        Text(mode == .signIn
                             ? "Sign in to see your bookings, share your links and set your hours."
                             : "Free to take bookings. Guests never need an account.")
                            .foregroundStyle(.secondary)
                    }

                    VStack(spacing: 12) {
                        if mode == .signUp {
                            TextField("Your name", text: $name)
                                .textContentType(.name)
                                .focused($focus, equals: .name)
                                .submitLabel(.next)
                                .onSubmit { focus = .email }
                                .fieldStyle()
                        }
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .password }
                            .fieldStyle()
                        SecureField(mode == .signUp ? "Password, at least 8 characters" : "Password", text: $password)
                            .textContentType(mode == .signUp ? .newPassword : .password)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .onSubmit { if canSubmit { submit() } }
                            .fieldStyle()

                        if let error {
                            Label(error, systemImage: "exclamationmark.circle")
                                .font(.callout)
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button(action: submit) {
                            Group {
                                if busy { ProgressView().tint(.white) } else {
                                    Text(mode == .signIn ? "Sign in" : "Create account")
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 30)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(!canSubmit)

                        if mode == .signIn {
                            Button("Forgot your password?") { openURL(Links.site("forgot")) }
                                .font(.callout)
                        }
                    }

                    HStack {
                        VStack { Divider() }
                        Text("or").font(.footnote).foregroundStyle(.secondary)
                        VStack { Divider() }
                    }

                    VStack(spacing: 12) {
                        if MeetraoConfig.appleSignInEnabled {
                            SignInWithAppleButton(mode == .signIn ? .signIn : .signUp) { request in
                                appleNonce = Self.randomNonce()
                                request.requestedScopes = [.fullName, .email]
                                request.nonce = Self.sha256(appleNonce)
                            } onCompletion: { result in
                                handleApple(result)
                            }
                            .frame(height: 50)
                            .clipShape(.capsule)
                        }

                        Button(action: google) {
                            HStack(spacing: 10) {
                                Image("GoogleG").resizable().scaledToFit().frame(width: 18, height: 18)
                                Text("Continue with Google").foregroundStyle(.primary)
                            }
                            .frame(maxWidth: .infinity, minHeight: 30)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(busy)
                    }

                    Button {
                        withAnimation { mode = mode == .signIn ? .signUp : .signIn }
                        error = nil
                    } label: {
                        Text(mode == .signIn ? "New to Meetrao? **Create an account**" : "Already have an account? **Sign in**")
                            .frame(maxWidth: .infinity)
                    }
                    .font(.callout)
                }
                .padding(24)
                .frame(maxWidth: 460)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color("LaunchBackground").ignoresSafeArea())
        }
    }

    private func submit() {
        guard canSubmit else { return }
        let request: SignInRequest = mode == .signIn
            ? .password(email: email, password: password)
            : .signUp(email: email, password: password, name: name)
        run { try await app.signIn(request) }
    }

    private func google() {
        run { try await app.signInWithGoogle(using: webAuthenticationSession) }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let failure):
            if (failure as? ASAuthorizationError)?.code != .canceled {
                error = "Sign in with Apple didn't finish. Try again."
            }
        case .success(let authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let token = String(data: tokenData, encoding: .utf8)
            else {
                error = "Sign in with Apple didn't finish. Try again."
                return
            }
            // Apple shares the name on the first sign-in only.
            let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            run { try await app.signIn(.apple(identityToken: token, nonce: appleNonce, name: name)) }
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                try await work()
            } catch let failure as ASWebAuthenticationSessionError where failure.code == .canceledLogin {
                // Closing the Google sheet is not an error.
            } catch {
                self.error = MeetraoError.from(error).message
            }
        }
    }

    static func randomNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    /// What Apple signs, and what convex/lib/appleIdentity.ts checks: sha256, as hex.
    static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

/// The confirmation link went out. It opens on the web, which spends it; the
/// app only has to wait and then sign in.
struct ConfirmEmailView: View {
    @Environment(AppModel.self) private var app
    let email: String

    var body: some View {
        ContentUnavailableView {
            Label("Check your email", systemImage: "envelope.badge")
        } description: {
            Text("We sent a confirmation link to \(email.isEmpty ? "your address" : email). Open it on this phone, then come back and sign in.")
        } actions: {
            Button("I've confirmed it — sign in") { app.backToSignIn() }
                .buttonStyle(.borderedProminent)
            if let mail = URL(string: "message://") {
                Link("Open Mail", destination: mail)
            }
        }
    }
}

private extension View {
    func fieldStyle() -> some View {
        padding(.horizontal, 14)
            .frame(minHeight: 50)
            .background(.background, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.quaternary))
    }
}
