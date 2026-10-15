import Foundation
import Testing
@testable import Meetrao

/// The rules the app shares with the web. Each of these is something the
/// two could disagree about, and a disagreement would show a host one thing
/// and their guests another.

@Suite struct LinkTests {
    let acme = Company.sample(slug: "acme", handle: "sam")

    @Test func personalMeetingsLiveAtTheUsername() {
        #expect(Links.address(for: "intro", in: .personal, username: "sam-jones", host: "meetrao.com") == "meetrao.com/sam-jones/intro")
    }

    @Test func companyMeetingsLiveAtTheCompanyAndHandle() {
        #expect(Links.address(for: "intro", in: .company(acme), username: "sam-jones", host: "meetrao.com") == "meetrao.com/acme/sam/intro")
    }

    @Test func aVerifiedDomainWins() {
        let domain = Company.sample(slug: "acme", handle: "sam", domain: "meet.acme.com", verified: true)
        #expect(Links.address(for: "intro", in: .company(domain), username: "x", host: "meetrao.com") == "meet.acme.com/sam/intro")
    }

    /// An unverified domain does not resolve yet; handing it out is handing out a 404.
    @Test func anUnverifiedDomainIsIgnored() {
        let domain = Company.sample(slug: "acme", handle: "sam", domain: "meet.acme.com", verified: false)
        #expect(Links.address(for: "intro", in: .company(domain), username: "x", host: "meetrao.com") == "meetrao.com/acme/sam/intro")
    }
}

@Suite struct MeetingTests {
    /// The same cases src/lib/username.ts's slugify handles.
    @Test(arguments: [
        ("30 Minute Intro Call", "30-minute-intro-call"),
        ("  Hello,   World!! ", "hello-world"),
        ("Café & Croissants", "caf-croissants"),
        ("!!!", "meeting"),
    ])
    func slugsMatchTheWeb(name: String, slug: String) {
        #expect(MeetingChoices.slug(for: name) == slug)
    }

    @Test func slugsAreMadeUnique() {
        #expect(MeetingChoices.uniqueSlug(for: "Intro", taken: ["intro", "intro-2"]) == "intro-3")
        #expect(MeetingChoices.uniqueSlug(for: "Intro", taken: []) == "intro")
    }

    @Test func aMeetingNeedsAName() {
        var draft = MeetraoAPI.MeetingDraft()
        #expect(draft.problem != nil)
        draft.name = "Intro"
        #expect(draft.problem == nil)
        draft.seats = 101
        #expect(draft.problem != nil)
    }
}

@Suite struct AvailabilityTests {
    typealias Rule = AvailabilityScreen.Rule

    @Test func theWeekStartsOnMonday() {
        let week = DayHours.week(from: [], schedule: "s")
        #expect(week.map(\.weekday) == [1, 2, 3, 4, 5, 6, 0])
        #expect(week.allSatisfy { !$0.isOn })
    }

    @Test func rulesBecomeDays() throws {
        let json = #"[{"schedule_id":"s","weekday":1,"start_minute":780,"end_minute":1020},{"schedule_id":"s","weekday":1,"start_minute":540,"end_minute":720},{"schedule_id":"other","weekday":2,"start_minute":0,"end_minute":60}]"#
        let rules = try JSONDecoder().decode([Rule].self, from: Data(json.utf8))
        let week = DayHours.week(from: rules, schedule: "s")
        #expect(week[0].isOn)
        #expect(week[0].ranges.map(\.startMinute) == [540, 780])
        #expect(!week[1].isOn, "another schedule's rules stay with that schedule")
    }

    @Test func overlapsAreRefused() {
        var week = DayHours.week(from: [], schedule: "s")
        week[0].isOn = true
        week[0].ranges = [.init(startMinute: 540, endMinute: 720), .init(startMinute: 700, endMinute: 800)]
        #expect(DayHours.problem(in: week)?.contains("overlap") == true)
    }

    @Test func backwardsHoursAreRefused() {
        var week = DayHours.week(from: [], schedule: "s")
        week[2].isOn = true
        week[2].ranges = [.init(startMinute: 600, endMinute: 600)]
        #expect(DayHours.problem(in: week) != nil)
    }

    /// Exactly what goes over the wire. It was once nested a level too deep,
    /// and the server refused every save.
    @Test func aWeekIsSentAsOneFlatList() throws {
        var week = DayHours.week(from: [], schedule: "s")
        week[0].isOn = true
        week[0].ranges = [.init(startMinute: 540, endMinute: 720), .init(startMinute: 840, endMinute: 1020)]
        week[4].isOn = true
        let encoded = try MeetraoAPI.rules(for: week).convexEncode()
        let decoded = try #require(try JSONSerialization.jsonObject(with: Data(encoded.utf8)) as? [[String: Double]])
        #expect(decoded.count == 3)
        #expect(decoded[0] == ["weekday": 1, "start_minute": 540, "end_minute": 720])
        #expect(decoded[2]["weekday"] == 5)
    }

    @Test func aDayOffDoesNotNeedValidHours() {
        var week = DayHours.week(from: [], schedule: "s")
        week[2].ranges = [.init(startMinute: 600, endMinute: 500)]
        #expect(DayHours.problem(in: week) == nil)
    }
}

@Suite struct DecodingTests {
    @Test func bookingsDecodeFromConvex() throws {
        let json = #"""
        {"rows":[{"id":"b1","reference":"MR-ABC","host_id":"h","meeting_type_id":null,"meeting_name":"Intro","duration_minutes":30,
        "guest_name":"Sam","guest_email":"sam@example.com","guest_note":"","guest_timezone":"Europe/London",
        "starts_at":"2026-10-20T09:00:00.000Z","ends_at":"2026-10-20T09:30:00.000Z","status":"confirmed","cancelled_at":null,
        "cancelled_by":null,"google_event_id":null,"meet_url":"https://meet.google.com/abc","guest_rsvp":null,"host_created":false,
        "page_view_id":null,"answers":[{"label":"Company","value":"Acme"}],"location":"google_meet","created_at":"2026-10-01T00:00:00.000Z",
        "updated_at":"2026-10-01T00:00:00.000Z"}],"invitees":{},"elsewhere":[]}
        """#
        let response = try JSONDecoder().decode(BookingsResponse.self, from: Data(json.utf8))
        let booking = try #require(response.rows.first)
        #expect(booking.startsAt == ISODate.parse("2026-10-20T09:00:00Z"))
        #expect(booking.answers?.first?.value == "Acme")
        #expect(booking.meetingLocation == .googleMeet)
    }

    @Test func aBookingDetailCarriesItsInvitees() throws {
        let json = #"{"id":"b1","reference":"R","meeting_name":"M","duration_minutes":30,"guest_name":"G","guest_email":"g@x.com","guest_note":"","starts_at":"2026-10-20T09:00:00.000Z","ends_at":"2026-10-20T09:30:00.000Z","status":"cancelled","host_created":true,"invitees":[{"name":"A","email":"a@x.com"}]}"#
        let detail = try JSONDecoder().decode(BookingWithInvitees.self, from: Data(json.utf8))
        #expect(detail.booking.isCancelled)
        #expect(detail.invitees.count == 1)
    }

    @Test func aConvexErrorBecomesItsMessage() {
        #expect(MeetraoError.message(fromConvexData: #"{"message":"That slot was just taken.","code":"INVALID"}"#) == "That slot was just taken.")
        #expect(MeetraoError.message(fromConvexData: #""Plain words""#) == "Plain words")
        #expect(MeetraoError.message(fromConvexData: "not json") == nil)
    }
}

@Suite struct AuthTests {
    @Test func theJWTExpiryIsRead() {
        // {"alg":"none"}.{"exp":1800000000}.sig
        let token = "eyJhbGciOiJub25lIn0.eyJleHAiOjE4MDAwMDAwMDB9.c2ln"
        #expect(JWT.expiry(of: token) == Date(timeIntervalSince1970: 1_800_000_000))
        #expect(JWT.expiry(of: "nonsense") == nil)
    }

    /// The same normalising as convex/auth.ts: one account per address.
    @Test func emailsAreNormalised() throws {
        let args = ConvexAuthProvider.arguments(for: .password(email: "  Sam@Example.COM ", password: "pw"))
        guard case .object(let params)? = args["params"] else { Issue.record("no params"); return }
        #expect(params["email"] == .string("sam@example.com"))
        #expect(params["flow"] == .string("signIn"))
        #expect(args["provider"] == .string("password"))
    }

    @Test func anOAuthCodeTravelsWithItsVerifier() {
        let args = ConvexAuthProvider.arguments(for: .oauthCode(code: "c", verifier: "v"))
        #expect(args["verifier"] == .string("v"))
        #expect(args["provider"] == nil, "the code exchange names no provider, as Convex Auth expects")
    }

    @Test func appleUsesTheNativeProvider() {
        let args = ConvexAuthProvider.arguments(for: .apple(identityToken: "t", nonce: "n", name: "Sam"))
        #expect(args["provider"] == .string("apple-native"))
    }
}

@Suite struct WidgetTests {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func item(_ id: String, start: TimeInterval, length: TimeInterval = 1800) -> WidgetSnapshot.Item {
        .init(id: id, guest: id, meeting: "M", startsAt: now.addingTimeInterval(start), endsAt: now.addingTimeInterval(start + length), joinURL: nil)
    }

    @Test func theMeetingInProgressComesFirst() {
        let snapshot = WidgetSnapshot(workspace: "", items: [item("later", start: 3600), item("now", start: -600)], updatedAt: now)
        #expect(snapshot.current(at: now)?.id == "now")
    }

    @Test func finishedMeetingsDropOff() {
        let snapshot = WidgetSnapshot(workspace: "", items: [item("done", start: -7200), item("next", start: 600)], updatedAt: now)
        #expect(snapshot.current(at: now)?.id == "next")
        #expect(snapshot.changePoints(after: now) == [now.addingTimeInterval(600), now.addingTimeInterval(2400)])
    }
}

@Suite struct CompanySummaryTests {
    @Test func countsTodayAndFindsWhoIsNext() throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let ms = { (offset: TimeInterval) in (now.timeIntervalSince1970 + offset) * 1000 }
        let json = """
        {"days":7,"now":\(ms(0)),"company_name":"Acme","members":[
          {"user_id":"a","name":"Ann","handle":"ann","role":"owner","active_links":2},
          {"user_id":"b","name":"Bo","handle":"bo","role":"member","active_links":0}],
         "bookings":[
          {"host_id":"a","starts_at":\(ms(3600)),"ends_at":\(ms(5400)),"duration_minutes":30,"status":"confirmed","cancelled_by":null,"meeting_name":"M","guest_name":"G1","guest_email":"g","created_at":\(ms(-86400))},
          {"host_id":"a","starts_at":\(ms(-3600)),"ends_at":\(ms(-1800)),"duration_minutes":30,"status":"cancelled","cancelled_by":"guest","meeting_name":"M","guest_name":"G2","guest_email":"g","created_at":\(ms(-86400))}]}
        """
        let data = try JSONDecoder().decode(CompanyAnalyticsData.self, from: Data(json.utf8))
        let summary = CompanySummary(data, timeZone: TimeZone(identifier: "UTC")!, now: now)
        #expect(summary.cancelled == 1)
        #expect(summary.team.first?.member.userID == "a")
        #expect(summary.team.first?.next?.guestName == "G1")
        #expect(summary.silent.map(\.userID) == ["b"])
        #expect(summary.perDay.count == 7)
    }
}

@Suite struct TimezoneTests {
    @Test func everyZoneIsOneIOSKnows() {
        for zone in Timezones.all { #expect(TimeZone(identifier: zone) != nil, "\(zone)") }
    }

    @Test func labelsMatchTheWebsShape() {
        let label = Timezones.label("Asia/Dhaka", at: Date(timeIntervalSince1970: 1_800_000_000))
        #expect(label == "GMT+06:00  Dhaka")
    }
}

extension Company {
    static func sample(slug: String, handle: String, domain: String? = nil, verified: Bool = false) -> Company {
        let json = """
        {"id":"c1","name":"Acme","slug":"\(slug)","handle":"\(handle)","role":"owner","domain":\(domain.map { "\"\($0)\"" } ?? "null"),
         "domain_verified":\(verified),"avatar_url":null,"brand_color":null,"member_count":3}
        """
        return try! JSONDecoder().decode(Company.self, from: Data(json.utf8))
    }
}
