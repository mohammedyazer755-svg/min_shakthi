import type { ParserOptions, ParseResult, PacketFormat, ParsedMeasurement } from './types.js';

const NUMERIC_REGEX = /^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
const ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0A-\x1F\x7F]/; // Note: \x0A is \n, \x0D is \r

/**
 * Pure deterministic parser for legacy MQTT payloads.
 * Accepts:
 *   1. topic-space-device (7 fields)
 *   2. device-only (7 fields)
 *   3. explicit-topic (8 fields)
 */
export function parseLegacyMqttPacket(
  envelopeTopic: string,
  payloadStr: string,
  options: ParserOptions
): ParseResult {
  const maxBytes = options.maxPayloadBytes ?? 1024;
  const payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');

  // Enforce byte size limit
  if (payloadBytes > maxBytes) {
    return {
      valid: false,
      error: 'PAYLOAD_SIZE',
      reason: `Payload size ${payloadBytes} bytes exceeds maximum limit of ${maxBytes} bytes.`,
    };
  }

  // Reject envelope topic mismatch
  if (envelopeTopic !== options.configuredTopic) {
    return {
      valid: false,
      error: 'TOPIC_MISMATCH',
      reason: `Envelope topic "${envelopeTopic}" does not match configured topic "${options.configuredTopic}".`,
    };
  }

  // Check for internal control characters (newlines, carriage returns, null bytes, etc.)
  if (CONTROL_CHAR_REGEX.test(payloadStr)) {
    return {
      valid: false,
      error: 'CONTROL_CHARACTER',
      reason: 'Payload contains illegal control characters or unescaped line breaks.',
    };
  }

  const trimmed = payloadStr.trim();
  const rawTokens = trimmed.split(',');

  if (rawTokens.length !== 7 && rawTokens.length !== 8) {
    return {
      valid: false,
      error: 'FIELD_COUNT',
      reason: `Expected 7 or 8 comma-separated fields, got ${rawTokens.length}.`,
    };
  }

  const tokens = rawTokens.map((t) => t.trim());

  let format: PacketFormat;
  let deviceId: string;
  let channelId: string;
  let numericTokens: string[];

  if (tokens.length === 8) {
    format = 'explicit_topic';
    const first = tokens[0]!;
    if (first !== options.configuredTopic) {
      return {
        valid: false,
        error: 'TOPIC_MISMATCH',
        reason: `Explicit topic token "${first}" does not match configured topic "${options.configuredTopic}".`,
      };
    }
    deviceId = tokens[1]!;
    channelId = tokens[2]!;
    numericTokens = tokens.slice(3);
  } else {
    // 7 tokens
    const first = tokens[0]!;
    if (/\s+/.test(first)) {
      // Topic-space-device format
      format = 'topic_space_device';
      const parts = first.split(/\s+/);
      if (parts.length !== 2) {
        return {
          valid: false,
          error: 'FIELD_COUNT',
          reason: `Invalid topic-space-device prefix token: "${first}".`,
        };
      }
      if (parts[0] !== options.configuredTopic) {
        return {
          valid: false,
          error: 'TOPIC_MISMATCH',
          reason: `Prefix topic "${parts[0]}" does not match configured topic "${options.configuredTopic}".`,
        };
      }
      deviceId = parts[1]!;
    } else {
      format = 'device_only';
      deviceId = first;
    }
    channelId = tokens[1]!;
    numericTokens = tokens.slice(2);
  }

  // Validate identifiers
  if (!ID_REGEX.test(deviceId)) {
    return {
      valid: false,
      error: 'ID_INVALID',
      reason: `Invalid deviceId: "${deviceId}". Must start with alphanumeric and contain only [a-zA-Z0-9_-], max 64 chars.`,
    };
  }
  if (!ID_REGEX.test(channelId)) {
    return {
      valid: false,
      error: 'ID_INVALID',
      reason: `Invalid channelId: "${channelId}". Must start with alphanumeric and contain only [a-zA-Z0-9_-], max 64 chars.`,
    };
  }

  // Expect exactly 5 numeric tokens: voltage, current, power, energyRaw, frequency
  if (numericTokens.length !== 5) {
    return {
      valid: false,
      error: 'FIELD_COUNT',
      reason: `Expected 5 numeric measurement fields, got ${numericTokens.length}.`,
    };
  }

  const [voltageStr, currentStr, powerStr, energyRawStr, frequencyStr] = numericTokens as [
    string,
    string,
    string,
    string,
    string,
  ];

  // Lexical validation for all 5 numeric fields
  for (const [name, token] of [
    ['voltage', voltageStr],
    ['current', currentStr],
    ['power', powerStr],
    ['energyRaw', energyRawStr],
    ['frequency', frequencyStr],
  ] as const) {
    if (!token || !NUMERIC_REGEX.test(token) || token.length > 24) {
      return {
        valid: false,
        error: 'NUMERIC_SYNTAX',
        reason: `Field "${name}" with value "${token}" failed lexical numeric validation.`,
      };
    }

    const dotIndex = token.indexOf('.');
    if (dotIndex !== -1 && token.length - dotIndex - 1 > 12) {
      return {
        valid: false,
        error: 'NUMERIC_SYNTAX',
        reason: `Field "${name}" exceeds maximum 12 decimal places.`,
      };
    }
  }

  const voltage = Number(voltageStr);
  const current = Number(currentStr);
  const power = Number(powerStr);
  const frequency = Number(frequencyStr);
  const energyNum = Number(energyRawStr);

  const maxMagnitude = 1e12;
  for (const [name, val] of [
    ['voltage', voltage],
    ['current', current],
    ['power', power],
    ['energyRaw', energyNum],
    ['frequency', frequency],
  ] as const) {
    if (!Number.isFinite(val) || Math.abs(val) > maxMagnitude) {
      return {
        valid: false,
        error: 'NUMERIC_RANGE',
        reason: `Field "${name}" value exceeds finite magnitude bound of 10^12.`,
      };
    }
  }

  // Scalar magnitude contract: voltage, current, frequency cannot be negative
  if (voltage < 0 || current < 0 || frequency < 0) {
    return {
      valid: false,
      error: 'SEMANTIC_RANGE',
      reason: 'Negative voltage, current, or frequency violates scalar measurement contract.',
    };
  }

  const quality: string[] = [];
  if (power < 0 || energyNum < 0) {
    quality.push('SIGNED_FLOW_UNVERIFIED');
  }

  const data: ParsedMeasurement = {
    deviceId,
    channelId,
    voltage,
    current,
    power,
    energyRaw: energyRawStr,
    frequency,
    energyUnit: 'unknown',
    deviceTimestamp: null,
  };

  return {
    valid: true,
    format,
    data,
    quality,
  };
}
