export class EthereumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EthereumError';
  }
}

export class EthereumHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EthereumHandlerError';
  }
}

export class BitcoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitcoinError';
  }
}

export class AttestorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttestorError';
  }
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class RippleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RippleError';
  }
}
