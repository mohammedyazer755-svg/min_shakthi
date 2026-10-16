import type { ParserErrorCode } from './errors.js';

export type PacketFormat = 'topic_space_device' | 'device_only' | 'explicit_topic';

export interface ParsedMeasurement {
  deviceId: string;
  channelId: string;
  voltage: number;
  current: number;
  power: number;
  energyRaw: string;
  frequency: number;
  energyUnit: 'unknown';
  deviceTimestamp: null;
}

export interface ParseSuccess {
  valid: true;
  format: PacketFormat;
  data: ParsedMeasurement;
  quality: string[];
}

export interface ParseFailure {
  valid: false;
  error: ParserErrorCode;
  reason: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

export interface ParserOptions {
  configuredTopic: string;
  maxPayloadBytes?: number;
}
