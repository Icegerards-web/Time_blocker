import AppIntents
import Foundation

// A custom Shortcuts action: "Is app blocked". The Shortcuts app can run this
// from an automation ("When <app> is opened"). The Time Blocker app writes its
// current block list to blocks.json in its Documents folder, and this action
// reads that file and answers true/false. Shortcuts then decides what to do
// (for example "Go to Home Screen").
private struct StoredBlock: Decodable {
    let target: String
    let endsAt: Double?    // milliseconds since 1970, nil = permanent
    let unlockAt: Double?  // set once a permanent block's 72h unlock was requested
}

@available(iOS 16.0, *)
struct IsAppBlockedIntent: AppIntent {
    static let title: LocalizedStringResource = "Is App Blocked"
    static let description = IntentDescription("Checks whether an app is currently blocked in Time Blocker.")

    @Parameter(title: "App name")
    var appName: String

    func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let url = docs.appendingPathComponent("blocks.json")
        guard let data = try? Data(contentsOf: url),
              let blocks = try? JSONDecoder().decode([StoredBlock].self, from: data) else {
            return .result(value: false)
        }
        let nowMs = Date().timeIntervalSince1970 * 1000
        let wanted = appName.trimmingCharacters(in: .whitespaces).lowercased()
        let blocked = blocks.contains { b in
            let name = b.target.lowercased()
            guard name == wanted || name.contains(wanted) || wanted.contains(name) else { return false }
            if let end = b.endsAt { return end > nowMs }
            if let unlock = b.unlockAt { return unlock > nowMs }
            return true
        }
        return .result(value: blocked)
    }
}
