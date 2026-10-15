import SwiftUI

struct BookingsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    @State private var bookings = Live<BookingsResponse>()
    @State private var showing: Showing = .upcoming
    @State private var path: [String] = []
    @State private var search = ""

    enum Showing: String, CaseIterable { case upcoming = "Upcoming", past = "Past" }

    private var rows: [Booking] {
        let all = bookings.value?.rows ?? []
        let chosen = showing == .upcoming
            ? all.filter { !$0.isPast }.sorted { $0.startsAt < $1.startsAt }
            : all.filter(\.isPast).sorted { $0.startsAt > $1.startsAt }
        let query = search.trimmingCharacters(in: .whitespaces).lowercased()
        guard !query.isEmpty else { return chosen }
        return chosen.filter {
            $0.guestName.lowercased().contains(query) || $0.guestEmail.lowercased().contains(query)
                || $0.meetingName.lowercased().contains(query) || $0.reference.lowercased().contains(query)
        }
    }

    /// Grouped by the host's day, in order.
    private var days: [(day: CalendarDay, rows: [Booking])] {
        var groups: [CalendarDay: [Booking]] = [:]
        var order: [CalendarDay] = []
        for booking in rows {
            let day = CalendarDay(booking.startsAt, in: timeZone)
            if groups[day] == nil { order.append(day) }
            groups[day, default: []].append(booking)
        }
        return order.map { ($0, groups[$0] ?? []) }
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Picker("Show", selection: $showing) {
                    ForEach(Showing.allCases, id: \.self) { Text($0.rawValue) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))

                if let error = bookings.error {
                    ErrorRow(message: error.message) { bookings.retry() }
                } else if bookings.isLoading {
                    ProgressView().frame(maxWidth: .infinity)
                } else if rows.isEmpty {
                    ContentUnavailableView(
                        search.isEmpty ? (showing == .upcoming ? "No upcoming bookings" : "No past bookings") : "No matches",
                        systemImage: "calendar",
                        description: Text(search.isEmpty ? "Share a link from the Meetings tab and bookings land here." : "Try a name, an email or a reference.")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(days, id: \.day) { group in
                        Section(Format.day(group.rows[0].startsAt, in: timeZone)) {
                            ForEach(group.rows) { booking in
                                NavigationLink(value: booking.id) {
                                    BookingRow(booking: booking, showsDay: false)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Bookings")
            .searchable(text: $search, prompt: "Guest, email or reference")
            .toolbar { ToolbarItem(placement: .topBarLeading) { WorkspaceMenu() } }
            .navigationDestination(for: String.self) { id in
                BookingDetailView(id: id, initial: bookings.value?.rows.first { $0.id == id })
            }
            .task(id: app.workspace) {
                bookings.watch(app.client, "bookings:listForScreen", [
                    "history": true, "pastLimit": 50.0, "companyId": app.workspace.companyID,
                ])
            }
            .onChange(of: app.router.bookingID, initial: true) { _, id in
                guard let id else { return }
                path = [id]
                app.router.bookingID = nil
            }
        }
    }
}

struct BookingDetailView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    @Environment(\.dismiss) private var dismiss
    let id: String
    var initial: Booking?

    @State private var detail = Live<BookingWithInvitees>()
    @State private var confirmingCancel = false
    @State private var moving = false
    @State private var busy = false
    @State private var message: String?
    @State private var warning: String?

    private var booking: Booking? { detail.value?.booking ?? initial }
    private var invitees: [Invitee] {
        (detail.value?.invitees ?? []).filter { $0.email.lowercased() != booking?.guestEmail.lowercased() }
    }

    var body: some View {
        List {
            if let booking {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(booking.meetingName).font(.subheadline).foregroundStyle(.secondary)
                            Spacer()
                            if booking.isCancelled {
                                Badge(text: booking.cancelledBy == "guest" ? "Cancelled by guest" : "Cancelled", tint: .red)
                            } else if booking.isPast {
                                Badge(text: "Past")
                            }
                        }
                        Text(booking.guestName).font(.serif(34, relativeTo: .largeTitle))
                        Text(Format.longDay(booking.startsAt, in: timeZone))
                        Text(Format.timeRange(booking.startsAt, booking.endsAt, in: timeZone))
                            .font(.title3.weight(.semibold).monospacedDigit())
                        if let guestZone = booking.guestTimezone, guestZone != timeZone.identifier,
                           let zone = TimeZone(identifier: guestZone) {
                            Text("\(Format.timeRange(booking.startsAt, booking.endsAt, in: zone)) for the guest (\(guestZone.replacingOccurrences(of: "_", with: " ")))")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)

                    if let join = booking.joinURL {
                        Link(destination: join) {
                            Label("Join Google Meet", systemImage: "video.fill")
                        }
                    }
                }

                Section("Guest") {
                    LabeledContent("Email") {
                        if let mail = URL(string: "mailto:\(booking.guestEmail)") {
                            Link(booking.guestEmail, destination: mail)
                        }
                    }
                    if !booking.guestNote.isEmpty {
                        LabeledContent("Note", value: booking.guestNote)
                    }
                    ForEach(booking.answers ?? [], id: \.self) { answer in
                        LabeledContent(answer.label, value: answer.value.isEmpty ? "—" : answer.value)
                    }
                    if booking.guestRSVP == "declined" {
                        Label("Declined the calendar invitation", systemImage: "person.crop.circle.badge.xmark")
                            .foregroundStyle(.orange)
                    }
                }

                if !invitees.isEmpty {
                    Section("Also invited") {
                        ForEach(invitees, id: \.self) { invitee in
                            LabeledContent(invitee.name.isEmpty ? invitee.email : invitee.name, value: invitee.name.isEmpty ? "" : invitee.email)
                        }
                    }
                }

                Section("Details") {
                    LabeledContent("Length", value: Format.duration(booking.durationMinutes))
                    LabeledContent("Where") {
                        Label(booking.meetingLocation.label, systemImage: booking.meetingLocation.symbol)
                    }
                    if let detail = booking.locationDetail, !detail.isEmpty, booking.meetingLocation != .googleMeet {
                        Text(detail).foregroundStyle(.secondary)
                    }
                    LabeledContent("Reference", value: booking.reference)
                        .contextMenu {
                            Button("Copy reference", systemImage: "doc.on.doc") {
                                UIPasteboard.general.string = booking.reference
                            }
                        }
                }

                if let message {
                    Section { Label(message, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
                }
                if let warning {
                    Section { Label(warning, systemImage: "calendar.badge.exclamationmark").foregroundStyle(.orange) }
                }

                if !booking.isCancelled && !booking.isPast {
                    Section {
                        Button {
                            moving = true
                        } label: {
                            Label("Move to another time", systemImage: "calendar.badge.clock")
                        }
                        Button(role: .destructive) {
                            confirmingCancel = true
                        } label: {
                            Label("Cancel booking", systemImage: "xmark.circle")
                        }
                        .confirmationDialog("Cancel this booking?", isPresented: $confirmingCancel, titleVisibility: .visible) {
                            Button("Cancel booking", role: .destructive) { cancel() }
                            Button("Keep it", role: .cancel) {}
                        } message: {
                            Text("\(booking.guestName) will be emailed that it's cancelled. This can't be undone.")
                        }
                    } footer: {
                        Text("The guest is emailed either way, and Google Calendar is updated.")
                    }
                    .disabled(busy)
                }
            } else if let error = detail.error {
                ErrorRow(message: error.message) { detail.retry() }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Booking")
        .navigationBarTitleDisplayMode(.inline)
        .task { detail.watch(app.client, "bookings:getForHost", ["id": id]) }
        .sheet(isPresented: $moving) {
            if let booking {
                MoveBookingView(booking: booking) { warning in self.warning = warning }
            }
        }
    }

    private func cancel() {
        busy = true
        message = nil
        Task {
            defer { busy = false }
            do {
                let result = try await app.api.cancelBooking(id)
                warning = result.calendarWarning
            } catch {
                message = MeetraoError.from(error, fallback: "That booking could not be cancelled.").message
            }
        }
    }
}

/// A new date and time, in the host's own timezone, as the web asks for it.
struct MoveBookingView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    @Environment(\.dismiss) private var dismiss
    let booking: Booking
    var onMoved: (String?) -> Void

    @State private var when: Date
    @State private var busy = false
    @State private var error: String?

    init(booking: Booking, onMoved: @escaping (String?) -> Void) {
        self.booking = booking
        self.onMoved = onMoved
        _when = State(initialValue: max(booking.startsAt, Date.now.addingTimeInterval(3600)))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("New time", selection: $when, in: Date.now..., displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.graphical)
                } footer: {
                    Text("In your timezone, \(timeZone.identifier.replacingOccurrences(of: "_", with: " ")). Your usual hours aren't checked, as when you schedule a meeting yourself; another booking at that time still is.")
                }
                Section {
                    LabeledContent("From", value: "\(Format.day(booking.startsAt, in: timeZone)), \(Format.time(booking.startsAt, in: timeZone))")
                    LabeledContent("To", value: "\(Format.day(when, in: timeZone)), \(Format.time(when, in: timeZone))")
                }
                if let error {
                    Section { Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
                }
            }
            .navigationTitle("Move booking")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Move", action: move).disabled(busy)
                }
            }
        }
    }

    private func move() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: when)
        let day = CalendarDay(year: parts.year ?? 0, month: parts.month ?? 0, day: parts.day ?? 0)
        let minutes = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                let result = try await app.api.moveBooking(booking.id, to: day, minutes: minutes)
                onMoved(result.calendarWarning)
                dismiss()
            } catch {
                self.error = MeetraoError.from(error, fallback: "That meeting could not be moved.").message
            }
        }
    }
}
