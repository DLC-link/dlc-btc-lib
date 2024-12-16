import { PaymentType, TransactionType } from '../dlc-handler.models.js';

export class DLCHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DLCHandlerError';
  }
}

export class PaymentNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'Payment information not initialized. Make sure to create payments before attempting to access them.'
  ) {
    super(message);
    this.name = 'PaymentNotSetError';
  }
}

export class AddressNotFoundError extends DLCHandlerError {
  constructor(paymentType: PaymentType) {
    super(`Address not found for ${paymentType} payment`);
    this.name = 'AddressNotFoundError';
  }
}

export class InvalidPaymentTypeError extends DLCHandlerError {
  constructor(paymentType: PaymentType) {
    super(`Invalid payment type: ${paymentType}`);
    this.name = 'InvalidPaymentTypeError';
  }
}

export class InvalidTransactionTypeError extends DLCHandlerError {
  constructor(transactionType: TransactionType) {
    super(`Invalid transaction type: ${transactionType}`);
    this.name = 'InvalidTransactionTypeError';
  }
}

export class InsufficientFundsError extends DLCHandlerError {
  constructor(available: bigint, required: bigint) {
    super(`Insufficient funds: have ${available}, need ${required}`);
    this.name = 'InsufficientFundsError';
  }
}

export class IncompatibleTransactionArgument extends DLCHandlerError {
  constructor() {
    super('Incompatible transaction argument');
    this.name = 'IncompatibleTransactionArgument';
  }
}

export class PolicyInformationNotSet extends DLCHandlerError {
  constructor(
    message: string = 'Policy Information not initialized. Make sure to create payments before attempting to access them.'
  ) {
    super(message);
    this.name = 'PolicyInformationNotSet';
  }
}

export class TaprootDerivedPublicKeyNotSet extends DLCHandlerError {
  constructor(
    message: string = 'Taproot Derived Public Key not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'TaprootDerivedPublicKeyNotSet';
  }
}

export class FundingDerivedPublicKeyNotSet extends DLCHandlerError {
  constructor(
    message: string = 'Funding Derived Public Key not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'FundingDerivedPublicKeyNotSet';
  }
}

export class DFNSWalletIDNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'DFNS Wallet ID not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'DFNSWalletIDNotSetError';
  }
}

export class BitGoAPIClientNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'BitGo API client not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'BitGoAPIClientNotSetError';
  }
}

export class BitGoWalletIDNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'BitGo Wallet ID not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'BitGoWalletIDNotSetError';
  }
}

export class BitGoAddressIDNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'BitGo Address ID not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'BitGoAddressIDNotSetError';
  }
}

export class SignatureGenerationFailed extends DLCHandlerError {
  constructor(
    message: string = 'Signature generation failed. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'SignatureGenerationFailed';
  }
}
