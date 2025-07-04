import { Injectable } from '@nestjs/common';

// Mocked conversion rates (replace with real API integration as needed)
const MOCKED_RATES = {
  ETH: { USDC: 3500, STRK: 100, ETH: 1 },
  USDC: { ETH: 1 / 3500, STRK: 100 / 3500, USDC: 1 },
  STRK: { ETH: 1 / 100, USDC: 3500 / 100, STRK: 1 },
  // Add more as needed
};

@Injectable()
export class CurrencyConversionService {
  // Get conversion rate from one token to another
  getRate(from: string, to: string): number {
    if (!MOCKED_RATES[from] || MOCKED_RATES[from][to] === undefined) {
      throw new Error(`Conversion rate from ${from} to ${to} not available`);
    }
    return MOCKED_RATES[from][to];
  }

  // Convert an amount from one token to another
  convert(amount: number, from: string, to: string): number {
    const rate = this.getRate(from, to);
    return amount * rate;
  }

  // (Optional) Update rates from an external API
  // async updateRates() { ... }
}
