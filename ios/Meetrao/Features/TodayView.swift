import SwiftUI

/// What is next, today, and the links to hand out. A company's owners and
/// admins see the company dashboard instead, as on the web.
struct TodayView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        NavigationStack {
            Group {
                if case .company(let company) = app.workspace, company.canManage {
                    CompanyDashboardView(company: company)
                } else {
                    PersonalTodayView()
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { WorkspaceMenu() }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        NotificationsView()
                    } label: {
                        Image(systemName: (app.unread.value ?? 0) > 0 ? "bell.badge" : "bell")
                            .accessibilityLabel((app.unread.value ?? 0) > 0 ? "Notifications, \(app.unread.value ?? 0) unread" : "Notifications")
                    }
                }
            }
        }
    }
}

private struct PersonalTodayView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    @State private var bookings = Live<BookingsResponse>()
    @State private var meetings = Live<[Meeting]>()

    private var upcoming: [Booking] {
        (bookings.value?.rows ?? []).filter { !$0.isCancelled && $0.endsAt > .now }.sorted { $0.startsAt < $1.startsAt }
    }

    private var today: [Booking] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return upcoming.filter { calendar.isDateInToday($0.startsAt) }
    }

    private var links: [Meeting] {
        (meetings.value ?? []).filter { $0.isActive && $0.companyID == app.workspace.companyID }
    }

    var body: some View {
        List {
            if let error = bookings.error {
                ErrorRow(message: error.message) { bookings.retry() }
            } else if bookings.isLoading {
                ProgressView().frame(maxWidth: .infinity)
            } else if let next = upcoming.first {
                Section {
                    NextMeetingCard(booking: next)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
                let rest = today.filter { $0.id != next.id }
                if !rest.isEmpty {
                    Section("Later today") {
                        ForEach(rest) { BookingLink(booking: $0) }
                    }
                }
                let later = upcoming.filter { b in b.id != next.id && !today.contains(b) }.prefix(8)
                if !later.isEmpty {
                    Section("Coming up") {
                        ForEach(Array(later)) { BookingLink(booking: $0) }
                    }
                }
            } else {
                Section {
                    ContentUnavailableView(
                        "No upcoming bookings",
                        systemImage: "calendar",
                        description: Text(links.isEmpty ? "Create a meeting, then share its link." : "Your links are live. Share one and bookings land here.")
                    )
                }
            }

            if !links.isEmpty, let profile = app.profile {
                Section {
                    ForEach(links) { meeting in
                        if let url = Links.url(for: meeting.slug, in: app.workspace, username: profile.username) {
                            ShareLink(item: url) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(meeting.name).foregroundStyle(.primary)
                                        Text(Links.address(for: meeting.slug, in: app.workspace, username: profile.username))
                                            .font(.footnote).foregroundStyle(.secondary).lineLimit(1)
                                    }
                                    Spacer()
                                    Image(systemName: "square.and.arrow.up")
                                }
                            }
                        }
                    }
                } header: {
                    Text("Share a link")
                }
            }
        }
        .navigationTitle(app.workspace == .personal ? "Today" : app.workspace.title)
        .groundBackground()
        .task(id: app.workspace) {
            bookings.watch(app.client, "bookings:listForScreen", ["history": false, "companyId": app.workspace.companyID])
            meetings.watch(app.client, "meetingTypes:listOwn")
        }
    }
}

/// The booking that is next, large, with the one thing to do about it.
struct NextMeetingCard: View {
    @Environment(\.timeZone) private var timeZone
    @Environment(AppModel.self) private var app
    let booking: Booking

    private var inProgress: Bool { booking.startsAt <= .now && booking.endsAt > .now }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(inProgress ? "HAPPENING NOW" : "NEXT UP")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.75))
                Spacer()
                Text(booking.startsAt, style: .relative)
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.white.opacity(0.75))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(booking.guestName)
                    .font(.serif(32, relativeTo: .title))
                    .foregroundStyle(.white)
                Text("\(booking.meetingName) · \(Format.day(booking.startsAt, in: timeZone)), \(Format.timeRange(booking.startsAt, booking.endsAt, in: timeZone))")
                    .foregroundStyle(.white.opacity(0.85))
            }
            HStack(spacing: 10) {
                if let join = booking.joinURL {
                    Link(destination: join) {
                        Label("Join", systemImage: "video.fill")
                            .frame(maxWidth: .infinity, minHeight: 28)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white)
                    .foregroundStyle(Color.accentColor)
                }
                Button {
                    app.router.openBooking(booking.id)
                } label: {
                    Text("Details").frame(maxWidth: .infinity, minHeight: 28)
                }
                .buttonStyle(.bordered)
                .tint(.white)
            }
        }
        .padding(20)
        .background(
            LinearGradient(colors: [Color(red: 0.11, green: 0.40, blue: 0.35), Color(red: 0.05, green: 0.25, blue: 0.22)],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: .rect(cornerRadius: 22)
        )
        .accessibilityElement(children: .combine)
    }
}

/// A booking in a list, opening its details.
struct BookingLink: View {
    let booking: Booking

    var body: some View {
        NavigationLink {
            BookingDetailView(id: booking.id, initial: booking)
        } label: {
            BookingRow(booking: booking)
        }
    }
}

struct BookingRow: View {
    @Environment(\.timeZone) private var timeZone
    let booking: Booking
    var showsDay = true

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Format.time(booking.startsAt, in: timeZone))
                    .font(.headline.monospacedDigit())
                if showsDay {
                    Text(Format.day(booking.startsAt, in: timeZone))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(minWidth: 76, alignment: .leading)

            VStack(alignment: .leading, spacing: 3) {
                Text(booking.guestName)
                    .font(.body.weight(.medium))
                    .strikethrough(booking.isCancelled)
                Text("\(booking.meetingName) · \(Format.duration(booking.durationMinutes))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if booking.isCancelled {
                Badge(text: "Cancelled", tint: .red)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
