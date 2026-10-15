import SwiftUI

struct AccountView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL
    @State private var confirmingSignOut = false
    @State private var confirmingDelete = false
    @State private var deleting = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                if let profile = app.profile {
                    Section {
                        HStack(spacing: 14) {
                            Avatar(url: profile.avatarURL, name: profile.displayName)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(profile.displayName).font(.headline)
                                Text(profile.email).font(.subheadline).foregroundStyle(.secondary)
                                Text("\(MeetraoConfig.siteHost)/\(profile.username)").font(.footnote).foregroundStyle(Color.accentColor)
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    if !app.companies.isEmpty {
                        Section("Workspace") {
                            Picker("Workspace", selection: Binding(get: { app.workspace }, set: { app.workspace = $0 })) {
                                Text("Personal").tag(Workspace.personal)
                                ForEach(app.companies) { company in
                                    VStack(alignment: .leading) {
                                        Text(company.name)
                                        Text("\(company.role.label) · \(company.memberCount) \(company.memberCount == 1 ? "person" : "people")")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                    .tag(Workspace.company(company))
                                }
                            }
                            .pickerStyle(.inline)
                            .labelsHidden()
                        }
                    }

                    Section {
                        NavigationLink {
                            NotificationsView()
                        } label: {
                            LabeledContent("Notifications") {
                                if let unread = app.unread.value, unread > 0 { Text("\(unread) new") }
                            }
                        }
                        Button("Calendar, profile and branding") { openURL(Links.site("settings")) }
                        Button("Help centre") { openURL(Links.site("help")) }
                        Button("Contact support") { openURL(Links.site("support")) }
                    } footer: {
                        Text("Calendar connection, your profile, branding and companies are managed on meetrao.com.")
                    }

                    Section {
                        Button("Sign out") { confirmingSignOut = true }
                            .confirmationDialog("Sign out of Meetrao?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
                                Button("Sign out", role: .destructive) { Task { await app.signOut() } }
                            }
                    }

                    Section {
                        Button("Delete account", role: .destructive) { confirmingDelete = true }
                            .disabled(deleting)
                            .confirmationDialog("Delete your account?", isPresented: $confirmingDelete, titleVisibility: .visible) {
                                Button("Delete account and everything in it", role: .destructive, action: deleteAccount)
                            } message: {
                                Text("Your booking links stop working, and your meetings, bookings, contacts and settings are deleted. Google Calendar is disconnected. This can't be undone.")
                            }
                        if let error {
                            Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red)
                        }
                    } footer: {
                        Text("Meetrao \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                    }
                }
            }
            .navigationTitle("Account")
        }
    }

    private func deleteAccount() {
        guard let profile = app.profile else { return }
        deleting = true
        error = nil
        Task {
            defer { deleting = false }
            do {
                try await app.api.deleteAccount(userID: profile.id)
                await app.signOut()
            } catch {
                self.error = MeetraoError.from(error, fallback: "The account could not be deleted. Try again, or contact support.").message
            }
        }
    }
}

struct Avatar: View {
    let url: String?
    let name: String
    var size: CGFloat = 52

    private var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        return parts.compactMap(\.first).map(String.init).joined().uppercased()
    }

    var body: some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Text(initials.isEmpty ? "?" : initials)
                .font(.headline)
                .foregroundStyle(Color.accentColor)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.accentSoft)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }
}
