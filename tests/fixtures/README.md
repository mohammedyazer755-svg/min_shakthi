# TEST ONLY fixtures
Never publish these to the production broker. original_mqtt.csv is byte-for-byte the supplied nine-case fixture. parser_cases.json expands it to 30 cases; expected energyRaw is a decimal string. Error taxonomy is in MQTT_PROTOCOL.md. Registration authorization is a separate stage; parser-valid does not imply an unknown device is authorized.

report_cases.json contains deterministic arithmetic and timezone cases, not real consumption or an official tariff. failure_scenarios.json provides stateful inputs; TEST_PLAN.md defines the full 28-test and 6-hardware matrix. Phase 2/3 agents implement runners; there is deliberately no application parser or test publisher in this documentation-only package.

Additional implementation tests must include malformed UTF-8 bytes, decimal precision bounds, invalid first-token whitespace, random fuzz input, buffer overflow and all crash points. These require binary/generated input rather than misleading text-only CSV fixtures.
