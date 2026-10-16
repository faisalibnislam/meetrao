import SwiftUI

struct NotificationsView: View {
    @Environment(AppModel.self) private var app
    @State private var notices = Live<[Notice]>()
    @State private var error: String?

    var body: some View {
        List {
            if let error {
                Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red)
            }
            if let failure = notices.error {
                ErrorRow(message: failure.message) { notices.retry() }
            } else if notices.isLoading {
                ProgressView().frame(maxWidth: .infinity)
            } else if (notices.value ?? []).isEmpty {
                ContentUnavailableView("Nothing new", systemImage: "bell", description: Text("New bookings, moves and cancellations show up here."))
                    .listRowBackground(Color.clear)
            } else {
                ForEach(notices.value ?? []) { notice in
                    Button { open(notice) } label: { NoticeRow(notice: notice) }
                        .swipeActions {
                            Button(notice.isUnread ? "Read" : "Unread") { mark(notice, read: notice.isUnread) }
                                .tint(.accentColor)
                        }
                }
            }
        }
        .navigationTitle("Notifications")
        .groundBackground()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Mark all as read", systemImage: "checkmark.circle") { run { try await app.api.markAllRead() } }
                    Button("Clear read", systemImage: "trash", role: .destructive) { run { try await app.api.clearRead() } }
                } label: {
                    Label("More", systemImage: "ellipsis.circle")
                }
            }
        }
        .task { notices.watch(app.client, "notifications:listOwn", ["limit": 50.0]) }
    }

    private func open(_ notice: Notice) {
        if notice.isUnread { mark(notice, read: true) }
        if let id = notice.bookingID { app.router.openBooking(id) }
    }

    private func mark(_ notice: Notice, read: Bool) {
        run { try await app.api.markRead(notice.id, read: read) }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        error = nil
        Task {
            do { try await work() }
            catch { self.error = MeetraoError.from(error).message }
        }
    }
}

private struct NoticeRow: View {
    let notice: Notice

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: notice.symbol)
                .foregroundStyle(notice.isUnread ? Color.accentColor : .secondary)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(notice.title).font(.body.weight(notice.isUnread ? .semibold : .regular))
                    Spacer()
                    Text(notice.createdAt, format: .relative(presentation: .named))
                        .font(.caption).foregroundStyle(.secondary)
                }
                Text(notice.body).font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .foregroundStyle(.primary)
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(notice.isUnread ? [.isButton, .isSelected] : .isButton)
    }
}
