export type ParserErrorCode =
  | 'TOPIC_MISMATCH'
  | 'FIELD_COUNT'
  | 'ID_INVALID'
  | 'NUMERIC_SYNTAX'
  | 'NUMERIC_RANGE'
  | 'SEMANTIC_RANGE'
  | 'PAYLOAD_SIZE'
  | 'CONTROL_CHARACTER';

export class ProtocolError extends Error {
  constructor(
    public readonly code: ParserErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ProtocolError';
  }
}
