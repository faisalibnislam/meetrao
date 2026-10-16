import Combine
@preconcurrency import ConvexMobile
import Foundation
import Testing
@testable import Meetrao

/// Every read and write the app makes, against a real Convex backend.
///
/// Skipped unless pointed at one, because it signs in and changes data:
///
///     TEST_RUNNER_MEETRAO_IT_CONVEX_URL=http://127.0.0.1:3210 \
///     TEST_RUNNER_MEETRAO_IT_EMAIL=… TEST_RUNNER_MEETRAO_IT_PASSWORD=… \
///     TEST_RUNNER_MEETRAO_SITE_URL=http://localhost:3007 \
///     xcodebuild test …
///
/// Use a local backend with throwaway data, never production. The unit tests
/// check what the app builds; this checks that the server agrees, which is
/// where a rules list nested one level too deep was found.
@Suite(.serialized, .timeLimit(.minutes(1)), .enabled(if: ProcessInfo.processInfo.environment["MEETRAO_IT_CONVEX_URL"] != nil))
@MainActor
struct BackendIntegrationTests {
    let env = ProcessInfo.processInfo.environment

    private func signedIn() async throws -> (MeetraoAPI, ConvexClientWithAuth<AuthTokens>) {
        let url = try #require(env["MEETRAO_IT_CONVEX_URL"])
        AuthTokens.clear()
        let auth = ConvexAuthProvider(deploymentURL: url)
        let client = ConvexClientWithAuth(deploymentUrl: url, authProvider: auth)
        auth.prepare(.password(email: try #require(env["MEETRAO_IT_EMAIL"]), password: try #require(env["MEETRAO_IT_PASSWORD"])))
        if case .failure(let error) = await client.login() { throw error }
        return (MeetraoAPI(client: client, auth: auth), client)
    }

    /// The first value of a live query, the way Live subscribes.
    private func first<T: Decodable & Sendable>(_ client: ConvexClient, _ name: String, _ args: [String: ConvexEncodable?]? = nil, as: T.Type = T.self) async throws -> T {
        try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            var done = false
            cancellable = client.subscribe(to: name, with: args, yielding: T.self)
                .receive(on: DispatchQueue.main)
                .sink { completion in
                    if case .failure(let error) = completion, !done {
                        done = true
                        continuation.resume(throwing: error)
                    }
                } receiveValue: { value in
                    guard !done else { return }
                    done = true
                    continuation.resume(returning: value)
                    cancellable?.cancel()
                }
            _ = cancellable
        }
    }

    @Test func everyQueryDecodes() async throws {
        let (_, client) = try await signedIn()
        let session: SessionInfo = try await first(client, "whoami:session")
        #expect(session.authenticated)
        let profile = try #require(session.profile)

        let companies: CompaniesResponse = try await first(client, "companies:mine")
        let _: BookingsResponse = try await first(client, "bookings:listForScreen", ["history": true, "pastLimit": 50.0, "companyId": nil])
        let personal: BookingsResponse = try await first(client, "bookings:listForScreen", ["history": false, "companyId": nil])
        let _: [Meeting] = try await first(client, "meetingTypes:listOwn")
        let _: AvailabilityScreen = try await first(client, "availability:screen")
        let _: [Notice] = try await first(client, "notifications:listOwn", ["limit": 50.0])
        let _: Int = try await first(client, "notifications:unreadCount")
        let now = Date.now.timeIntervalSince1970 * 1000
        let _: [Booking] = try await first(client, "bookings:listForHost", ["from": now - 3_600_000, "to": now + 14 * 86_400_000, "status": "confirmed"])
        if let booking = personal.rows.first {
            let _: BookingWithInvitees = try await first(client, "bookings:getForHost", ["id": booking.id])
        }
        if let company = companies.companies.first {
            let data: CompanyAnalyticsData = try await first(client, "companyAnalytics:forCompany", ["id": company.id, "days": 30.0])
            _ = CompanySummary(data, timeZone: profile.timeZone)
            let _: BookingsResponse = try await first(client, "bookings:listForScreen", ["history": true, "pastLimit": 50.0, "companyId": company.id])
        }
    }

    @Test func meetingsCanBeCreatedChangedAndDeleted() async throws {
        let (api, client) = try await signedIn()
        var draft = MeetraoAPI.MeetingDraft()
        draft.name = "Integration check"
        draft.description = "Made by BackendIntegrationTests"
        draft.location = .phone
        draft.locationDetail = "+44 20 7946 0000"
        let slug = "integration-\(Int(Date.now.timeIntervalSince1970))"
        let id = try await api.createMeeting(draft, in: .personal, slug: slug)

        draft.duration = 45
        draft.seats = 1
        draft.notice = 1440
        draft.window = 60
        try await api.updateMeeting(id, draft)
        try await api.setMeetingActive(id, false)

        let meetings: [Meeting] = try await first(client, "meetingTypes:listOwn")
        let saved = try #require(meetings.first { $0.id == id })
        #expect(saved.durationMinutes == 45)
        #expect(saved.slug == slug)
        #expect(!saved.isActive)
        #expect(saved.locationDetail == "+44 20 7946 0000")

        try await api.deleteMeeting(id)
        let after: [Meeting] = try await first(client, "meetingTypes:listOwn")
        #expect(!after.contains { $0.id == id })
    }

    @Test func availabilityCanBeSaved() async throws {
        let (api, client) = try await signedIn()
        let session: SessionInfo = try await first(client, "whoami:session")
        let screen: AvailabilityScreen = try await first(client, "availability:screen")
        let schedule = try #require(screen.defaultSchedule)
        let original = DayHours.week(from: screen.rules, schedule: schedule.id)

        var week = original
        week[5].isOn = true // Saturday
        week[5].ranges = [.init(startMinute: 600, endMinute: 660)]
        try await api.saveWeek(schedule: schedule.id, timezone: session.profile?.timezone ?? "UTC", week: week)
        let changed: AvailabilityScreen = try await first(client, "availability:screen")
        #expect(changed.rules.contains { $0.weekday == 6 && $0.startMinute == 600 })
        try await api.saveWeek(schedule: schedule.id, timezone: session.profile?.timezone ?? "UTC", week: original)

        let day = CalendarDay(Date.now.addingTimeInterval(20 * 86_400), in: .gmt)
        try await api.saveTimeOff(schedule: schedule.id, day: day, ranges: [.init(startMinute: 540, endMinute: 600)], note: "IT")
        let withOff: AvailabilityScreen = try await first(client, "availability:screen")
        let off = try #require(withOff.overrides.first { $0.date == day.key })
        #expect(off.ranges.first?.startMinute == 540)
        try await api.deleteTimeOff(off.id)

        try await api.createSchedule(named: "Integration schedule")
        let withNew: AvailabilityScreen = try await first(client, "availability:screen")
        let created = try #require(withNew.schedules.first { $0.name == "Integration schedule" })
        try await api.renameSchedule(created.id, to: "Integration renamed")
        try await api.deleteSchedule(created.id)
    }

    @Test func notificationsCanBeReadAndUnread() async throws {
        let (api, client) = try await signedIn()
        let notices: [Notice] = try await first(client, "notifications:listOwn", ["limit": 50.0])
        if let notice = notices.first {
            try await api.markRead(notice.id, read: false)
            try await api.markRead(notice.id, read: true)
        }
        try await api.markAllRead()
        let unread: Int = try await first(client, "notifications:unreadCount")
        #expect(unread == 0)
    }

    @Test func aPushTokenCanBeRegisteredAndRemoved() async throws {
        let (api, _) = try await signedIn()
        let token = String(repeating: "ab", count: 32)
        try await api.registerPush(token: token, sandbox: true)
        try await api.unregisterPush(token: token)
    }

    /// Through meetrao.com's routes, which send the mail and update Google Calendar.
    @Test(.enabled(if: ProcessInfo.processInfo.environment["MEETRAO_SITE_URL"] != nil))
    func aBookingCanBeMovedThroughTheSite() async throws {
        let (api, client) = try await signedIn()
        let session: SessionInfo = try await first(client, "whoami:session")
        let zone = session.profile?.timeZone ?? .gmt
        let response: BookingsResponse = try await first(client, "bookings:listForScreen", ["history": false, "companyId": nil])
        let booking = try #require(response.rows.first { !$0.isCancelled && $0.startsAt > .now })
        let target = booking.startsAt.addingTimeInterval(7 * 86_400 + 3600)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let parts = calendar.dateComponents([.hour, .minute], from: target)
        _ = try await api.moveBooking(booking.id, to: CalendarDay(target, in: zone), minutes: (parts.hour ?? 0) * 60 + (parts.minute ?? 0))
        let moved: BookingWithInvitees = try await first(client, "bookings:getForHost", ["id": booking.id])
        #expect(abs(moved.booking.startsAt.timeIntervalSince(target)) < 60)
    }
}
