@preconcurrency import ConvexMobile
import Foundation

/// Every write the app makes, in one place, with the function names the web
/// uses. Reads are live queries (see Live.swift).
///
/// NUMBERS GO AS DOUBLES. ConvexMobile encodes a Swift Int as a Convex int64,
/// and every numeric argument in convex/ is `v.number()`, a float64, which
/// refuses an int64. A Double is the only safe top-level number.
struct MeetraoAPI {
    let client: ConvexClientWithAuth<AuthTokens>
    let auth: ConvexAuthProvider

    // MARK: Bookings (through meetrao.com, which sends the emails and updates Google Calendar)

    nonisolated struct ChangeResult: Decodable, Sendable {
        let calendarWarning: String?
    }

    func cancelBooking(_ id: String) async throws -> ChangeResult {
        try await post("api/app/bookings/cancel", body: ["id": .string(id)])
    }

    /// `date` and `minutes` are in the HOST's timezone; the server turns them
    /// into an instant against that zone, as it does for the web.
    func moveBooking(_ id: String, to day: CalendarDay, minutes: Int) async throws -> ChangeResult {
        try await post("api/app/bookings/move", body: [
            "id": .string(id), "date": .string(day.key), "time": .number(Double(minutes)),
        ])
    }

    private func post<T: Decodable>(_ path: String, body: [String: JSONValue]) async throws -> T {
        let token = try await auth.validToken()
        var request = URLRequest(url: MeetraoConfig.siteURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw MeetraoError.offline
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(status) { return try JSONDecoder().decode(T.self, from: data) }

        let message = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
        if status == 401 { throw MeetraoError.signedOut }
        throw MeetraoError(message: message ?? "That didn't work. Try again.")
    }

    // MARK: Calls whose result is not needed

    /// A mutation whose result the app does not use.
    ///
    /// ConvexMobile's own "no result" form still decodes the result, as a
    /// String, so a mutation that returns a number or an object threw AFTER
    /// it had succeeded: Availability said "That didn't work" over a saved
    /// week. Decoding into JSONValue accepts whatever comes back.
    private func run(_ name: String, _ args: sending [String: ConvexEncodable?] = [:]) async throws {
        let _: JSONValue? = try await client.mutation(name, with: args)
    }

    private func act(_ name: String, _ args: sending [String: ConvexEncodable?] = [:]) async throws {
        let _: JSONValue? = try await client.action(name, with: args)
    }

    // MARK: Meetings

    nonisolated struct MeetingDraft: Equatable, Sendable {
        var name = ""
        var description = ""
        var duration = 30
        var buffer = 0
        var notice = 240
        var window = 30
        var location = MeetingLocation.googleMeet
        var locationDetail = ""
        var seats = 1
        var scheduleID: String?
        var isActive = true

        init() {}

        init(_ meeting: Meeting) {
            name = meeting.name
            description = meeting.description
            duration = meeting.durationMinutes
            buffer = meeting.bufferMinutes
            notice = meeting.minimumNoticeMinutes
            window = meeting.bookingWindowDays
            location = MeetingLocation(raw: meeting.location)
            locationDetail = meeting.locationDetail ?? ""
            seats = meeting.seats
            scheduleID = meeting.scheduleID
            isActive = meeting.isActive
        }

        /// The checks src/lib/actions/meetings.ts makes before saving.
        var problem: String? {
            if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return "Give the meeting a name guests will recognise."
            }
            if seats < 1 || seats > 100 { return "Seats must be between 1 and 100." }
            if locationDetail.count > 200 { return "Keep the location under 200 characters." }
            return nil
        }

        fileprivate var fields: [String: ConvexEncodable?] {
            [
                "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
                "description": description.trimmingCharacters(in: .whitespacesAndNewlines),
                "duration_minutes": Double(duration),
                "buffer_minutes": Double(buffer),
                "minimum_notice_minutes": Double(notice),
                "booking_window_days": Double(window),
                "location": location.rawValue,
                "location_detail": locationDetail.trimmingCharacters(in: .whitespacesAndNewlines),
                "capacity": Double(seats),
                "is_active": isActive,
                "schedule_id": scheduleID,
            ]
        }
    }

    private nonisolated struct Created: Decodable, Sendable { let id: String }

    /// Filed under the workspace in force, as the web does.
    func createMeeting(_ draft: MeetingDraft, in workspace: Workspace, slug: String) async throws -> String {
        var args = draft.fields
        args["slug"] = slug
        args["company_id"] = workspace.companyID
        let created: Created = try await client.mutation("meetingTypes:create", with: args)
        return created.id
    }

    func updateMeeting(_ id: String, _ draft: MeetingDraft) async throws {
        var args = draft.fields
        args["id"] = id
        try await run("meetingTypes:update", args)
    }

    func setMeetingActive(_ id: String, _ active: Bool) async throws {
        try await run("meetingTypes:update", ["id": id, "is_active": active])
    }

    func deleteMeeting(_ id: String) async throws {
        try await run("meetingTypes:remove", ["id": id])
    }

    // MARK: Availability

    private nonisolated struct RuleArg: Encodable, ConvexEncodable {
        let weekday: Int
        let start_minute: Int
        let end_minute: Int
    }

    private nonisolated struct RangeArg: Encodable, ConvexEncodable {
        let start_minute: Int
        let end_minute: Int
    }

    func saveWeek(schedule: String, timezone: String, week: [DayHours]) async throws {
        try await run("availability:saveWeek", [
            "scheduleId": schedule, "timezone": timezone, "rules": Self.rules(for: week),
        ])
    }

    /// The week as availability:saveWeek takes it: one flat list of ranges.
    ///
    /// A plain loop, not flatMap: into [ConvexEncodable?], flatMap resolves to
    /// an overload that keeps each day's array as ONE element, and the server
    /// refused the rules nested a level too deep. MeetraoTests pins the shape.
    nonisolated static func rules(for week: [DayHours]) -> [ConvexEncodable?] {
        var rules: [ConvexEncodable?] = []
        for day in week where day.isOn {
            for range in day.ranges {
                rules.append(RuleArg(weekday: day.weekday, start_minute: range.startMinute, end_minute: range.endMinute))
            }
        }
        return rules
    }

    func saveTimeOff(schedule: String, day: CalendarDay, ranges: [AvailabilityScreen.TimeOff.Range], note: String) async throws {
        let encoded: [ConvexEncodable?] = ranges.map { RangeArg(start_minute: $0.startMinute, end_minute: $0.endMinute) }
        try await run("availability:saveOverride", [
            "scheduleId": schedule, "date": day.key, "ranges": encoded,
            "note": String(note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80)),
        ])
    }

    func deleteTimeOff(_ id: String) async throws {
        try await run("availability:deleteOverride", ["id": id])
    }

    func createSchedule(named name: String) async throws {
        try await run("availability:createSchedule", [
            "name": String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60)), "makeDefault": false,
        ])
    }

    func renameSchedule(_ id: String, to name: String) async throws {
        try await run("availability:renameSchedule", [
            "scheduleId": id, "name": String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60)),
        ])
    }

    func setDefaultSchedule(_ id: String) async throws {
        try await run("availability:setDefaultSchedule", ["scheduleId": id])
    }

    func deleteSchedule(_ id: String) async throws {
        try await run("availability:deleteSchedule", ["scheduleId": id])
    }

    // MARK: Notifications

    func markRead(_ id: String, read: Bool = true) async throws {
        try await run("notifications:markRead", ["id": id, "read": read])
    }

    func markAllRead() async throws {
        try await run("notifications:markAllRead")
    }

    func clearRead() async throws {
        try await run("notifications:clearRead")
    }

    // MARK: Account

    /// The web's order (src/lib/actions/settings.ts): revoke Google first,
    /// because deleting the account takes the stored refresh token with it,
    /// and a grant with nothing left to revoke it outlives the account.
    func deleteAccount(userID: String) async throws {
        try? await act("google:disconnectFor", ["userId": userID])
        try await run("profiles:deleteOwnAccount")
    }

    // MARK: Push

    func registerPush(token: String, sandbox: Bool) async throws {
        try await run("push:registerDevice", [
            "token": token, "environment": sandbox ? "sandbox" : "production",
        ])
    }

    func unregisterPush(token: String) async throws {
        try await run("push:unregisterDevice", ["token": token])
    }
}
