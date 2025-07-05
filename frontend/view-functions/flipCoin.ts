import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { COINFLIP_ADDRESS } from "@/constants";

export type FlipCoinArguments = {
  betAmountIndex: number;
  playerChoice: number; // 0 for heads, 1 for tails
};

export type FlipCoinDegenArguments = {
  betAmountIndex1: number;
  playerChoice1: number; // 0 for heads, 1 for tails
  betAmountIndex2: number;
  playerChoice2: number; // 0 for heads, 1 for tails
};

export type FlipCoinWhaleArguments = {
  betAmountIndex: number;
  playerChoice: number; // 0 for heads, 1 for tails
};

export const flipCoin = (args: FlipCoinArguments): InputTransactionData => {
  const { betAmountIndex, playerChoice } = args;
  return {
    data: {
      function: `${COINFLIP_ADDRESS}::coinflip::flip_coin_v1`,
      typeArguments: [],
      functionArguments: [
        betAmountIndex.toString(),
        playerChoice.toString(),
      ],
    },
  };
};

export const flipCoinDegen = (args: FlipCoinDegenArguments): InputTransactionData => {
  const { betAmountIndex1, playerChoice1, betAmountIndex2, playerChoice2 } = args;
  return {
    data: {
      function: `${COINFLIP_ADDRESS}::coinflip::flip_coin_degen_v1`,
      typeArguments: [],
      functionArguments: [
        betAmountIndex1.toString(),
        playerChoice1.toString(),
        betAmountIndex2.toString(),
        playerChoice2.toString(),
      ],
    },
  };
};

export const flipCoinWhale = (args: FlipCoinWhaleArguments): InputTransactionData => {
  const { betAmountIndex, playerChoice } = args;
  return {
    data: {
      function: `${COINFLIP_ADDRESS}::coinflip::flip_coin_whale_v1`,
      typeArguments: [],
      functionArguments: [
        betAmountIndex.toString(),
        playerChoice.toString(),
      ],
    },
  };
}; 