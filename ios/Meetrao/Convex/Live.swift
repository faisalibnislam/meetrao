@preconcurrency import ConvexMobile
import Combine
import Foundation
import Observation

/// One live Convex query. The value updates by itself whenever the data on
/// the server changes; there is nothing to refresh by hand.
///
/// SUBSCRIBED WITH `sink`, NOT `for await … in publisher.values`. ConvexMobile
/// starts the server subscription the moment `subscribe` is called and
/// forwards results through a PassthroughSubject, which drops anything sent
/// before somebody is listening. An async loop starts listening a moment
/// later, on its own task, and the first result can land in that gap: the
/// screen then waits forever for data that already came and went. `sink`
/// attaches in the same synchronous step.
@Observable
final class Live<Value: Decodable & Sendable> {
    private(set) var value: Value?
    private(set) var error: MeetraoError?
    @ObservationIgnored private var cancellable: AnyCancellable?
    @ObservationIgnored private var started: (ConvexClient, String, [String: ConvexEncodable?]?)?
    /// Called on every new value, for owners that act on changes (the app model).
    @ObservationIgnored var onValue: ((Value) -> Void)?
    @ObservationIgnored var onError: ((Error) -> Void)?

    var isLoading: Bool { value == nil && error == nil }

    func watch(_ client: ConvexClient, _ name: String, _ args: [String: ConvexEncodable?]? = nil) {
        cancellable?.cancel()
        error = nil
        started = (client, name, args)
        cancellable = client.subscribe(to: name, with: args, yielding: Value.self)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                guard case .failure(let failure) = completion, let self else { return }
                self.error = MeetraoError.from(failure, fallback: "This didn't load. Try again.")
                self.onError?(failure)
            } receiveValue: { [weak self] next in
                self?.value = next
                self?.onValue?(next)
            }
    }

    /// Starts the same query again, after an error.
    func retry() {
        guard let (client, name, args) = started else { return }
        watch(client, name, args)
    }

    func stop() {
        cancellable?.cancel()
        cancellable = nil
    }

    // No deinit: an AnyCancellable cancels its subscription when it is released.
}
