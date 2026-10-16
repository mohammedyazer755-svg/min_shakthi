# MQTT protocol and measurement semantics
Contract v1; current firmware remains unchanged. Board → ESP32 → mqtt://192.155.92.123:1883, topic swiftpower → Node. Username/password, if required, are server-only environment values. Port 1883 is plaintext; browser HTTPS does not encrypt this hop.

## Accepted grammar
Envelope topic must equal configured MQTT_TOPIC exactly. CSV means simple unquoted comma-separated tokens; embedded quotes/newlines are not part of this firmware protocol. Trim leading/trailing payload and token whitespace. Decode valid UTF-8 strictly, limit payload to 1,024 bytes; reject internal control characters.

| Form | Field count | Example |
|---|---|---|
| Topic-space-device | 7 | swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98 |
| Device-only | 7 | prototype1,channel1,239.67,0.14,33.22,88.11,49.98 |
| Explicit topic | 8 | swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98 |

After prefix handling: deviceId, channelId, voltage, current, power, energyRaw, frequency. Preserve decimal source strings alongside numeric live values. IDs are case-sensitive, 1–64 ASCII letters/digits/underscore/hyphen, first character alphanumeric. Unknown but syntactically valid IDs enter a capped quarantine; they do not auto-enroll into an organization. The parser can return valid syntax with an ingestion disposition of UNREGISTERED_DEVICE or UNMAPPED_CHANNEL.

## Deterministic parser design
1. Capture serverReceivedAt at message callback entry, MQTT envelope metadata (qos,retain,dup) and source bytes; enforce size and encoding.
2. Reject incorrect envelope topic (TOPIC_MISMATCH).
3. Split and trim. Only 7 or 8 tokens accepted (FIELD_COUNT).
4. Eight fields: first token must equal configured topic, then remove it. Seven fields: if first field contains whitespace, split on one-or-more spaces/tabs; require exactly topic and device, and exact topic match. Otherwise it is device-only. Never strip an arbitrary prefix or normalize identifier case.
5. Validate IDs; do not coerce empty identifiers.
6. Each of five numeric fields must match `^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$`; no exponent, hex, commas, units, NaN, Infinity, partial numeric text or empty field. Enforce ≤24 characters and ≤12 decimal places; convert only after lexical validation, require finite magnitude ≤10^12. These are parser safety bounds, not metering specifications.
7. Voltage/current/frequency <0 are SEMANTIC_RANGE errors under this scalar-magnitude contract. Signed power and energy parse, but when signed-flow support is unknown flag SIGNED_FLOW_UNVERIFIED and exclude from verified reports. Zero is valid for every field; voltage/frequency zero can be electrically abnormal without being a parser failure.
8. Apply configured sensor envelope as a quality flag (SENSOR_RANGE) and preserve the sample for diagnosis. Alert thresholds are separate from parser rejection; real abnormal readings must not disappear silently.
9. Return a tagged success/error result, never throw into the subscriber callback. Include format and fields on success; bounded reason diagnostics on rejection.

Expected first real packet: deviceId=prototype1, channelId=channel1, voltage=239.67, current=0.14, power=33.22, energyRaw="88.11", frequency=49.98, energyUnit="unknown", deviceTimestamp=null. Do not add PF, RMS certification, THD or board temperature.

## Identity and mapping
Use structured nested maps or collision-safe composite encoding of (deviceId,channelId). Database uses site ownership plus device surrogate key; raw deviceId is unique per broker/source namespace. Device channel mappings enforce unique (device,rawChannelId) and (device,displaySlot), slot integer 1–5. Present as CH01…CH05. prototype1 has observed channel1/channel2; the remaining channels are unknown. prototype2 channel0–4 is a hypothesis to confirm, not an auto-applied global mapping. Unconfigured slots use null and “Not configured”. Changing a label does not rewrite raw history; version effective-dated mappings in reports.

## Time, duplicates, retained packets and ordering
Current firmware has no source timestamp, sequence, boot ID or event UUID. serverReceivedAt is ingestion time, not measurement time. Backend assigns eventId UUID, serverEpoch UUID per process and monotonically increasing sequence string per epoch. Receive order is the only defensible current-protocol order. UUIDs prevent DB replay duplication of our own spool events; they do not identify duplicate publications.

Do not globally deduplicate identical payload hashes: constant load legitimately repeats. Preserve repeated messages with suspectDuplicate metadata when MQTT dup is set or identical packets arrive unusually close; this is diagnostic, not certainty. MQTT packet IDs are reused and are not permanent event identifiers. Do not blindly discard a decreasing energy counter or rewrite latest power based on inferred device ordering. Flag counter discontinuities; consumption excludes unresolved intervals. A future versioned firmware envelope may add bootId, sequence and measuredAt, but it is not required for current parsing.

Retained deliveries on subscription are historical evidence of unknown age. Mark retained/unknown-origin-time; never make a device fresh solely from a retained message. Persistent-session queued deliveries after reconnect may also be delayed without a flag; display receipt freshness with source-age unknown, not proof hardware is physically on. Request a confirmed heartbeat/LWT/boot-sequence extension only if physical-state certainty is required.

## Counter/billing gate
Until owner confirms unit (Wh/kWh), cumulative vs incremental, reset/wrap/rollover behavior, directionality, calibration and channel topology: show “Energy counter · unit unverified”; disable consumption-cost verification. Preserve raw numeric value and configuration version. Incremental counters cannot be billed exactly with this duplicate-ambiguous protocol; require firmware event identity and delivery evidence before enabling verified incremental billing.

For verified cumulative counters within one stable epoch: delta=max? NO: use E2−E1 only if nonnegative and interval passes quality rules. A negative difference is a reset/discontinuity, not zero usage. Known wrap requires documented modulus and bounded physically plausible delta. Reset loses an interval; start a new epoch and expose the gap. Never sum counters directly or infer unit from sample magnitude.

## Reconnect and delivery policy
MQTT connection timeout 10s; capped exponential reconnect with jitter 1–30s. Subscribe on connect and require SUBACK success before brokerSubscribed=true. Stable unique client ID for this environment. Start with requested subscription QoS 1, inspect granted QoS; effective delivery still depends on publisher QoS and broker policy. Use clean start policy explicitly; initial V2 uses clean sessions to avoid pretending stale queued messages are current. Messages while subscriber is offline may be lost. Broker persistence and firmware QoS changes require separate verification. No “exactly once” guarantee.

Error counters by reason, last valid and invalid receipt, bounded admin-only payload sample, reconnect attempts and subscription result belong in diagnostics. Do not send malformed raw input to every browser.
