import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { COINFLIP_ADDRESS, NETWORK } from "@/constants";

// Configure Aptos client based on network
const getAptosConfig = () => {
  // Use predefined network configuration
  return new AptosConfig({ 
    network: NETWORK as Network
  });
};

const aptos = new Aptos(getAptosConfig());

// Interface definitions for better type safety
export interface GameState {
  totalVolume: number;
  totalGames: number;
  houseWins: number;
  playerWins: number;
}

export interface FlipResult {
  player: string;
  betAmount: number;
  playerChoice: number;
  coinResult: number;
  won: boolean;
  payout: number;
  timestamp: number;
}

export const getGameState = async (): Promise<GameState | null> => {
  try {
    if (!COINFLIP_ADDRESS) return null;
    
    const result = await aptos.view({
      payload: {
        function: `${COINFLIP_ADDRESS}::coinflip::get_house_stats_v1`,
        functionArguments: [],
      },
    });

    return {
      totalVolume: Number(result[0]),
      totalGames: Number(result[1]),
      houseWins: Number(result[2]),
      playerWins: Number(result[3]),
    };
  } catch (error) {
    console.error("Error fetching game state:", error);
    return null;
  }
};

export const getBetAmounts = async (): Promise<string[]> => {
  try {
    if (!COINFLIP_ADDRESS) return [];
    
    const result = await aptos.view({
      payload: {
        function: `${COINFLIP_ADDRESS}::coinflip::get_bet_amounts_v1`,
        functionArguments: [],
      },
    });

    return result[0] as string[];
  } catch (error) {
    console.error("Error fetching bet amounts:", error);
    return [];
  }
};

export const getLastGameResult = async (player: string): Promise<any> => {
  try {
    if (!COINFLIP_ADDRESS) return null;
    
    const result = await aptos.view({
      payload: {
        function: `${COINFLIP_ADDRESS}::coinflip::get_last_game_result_v1`,
        functionArguments: [player],
      },
    });

    return result;
  } catch (error) {
    console.error("Error fetching last game result:", error);
    return null;
  }
};

export const getLastDegenResult = async (player: string): Promise<any> => {
  try {
    if (!COINFLIP_ADDRESS) return null;
    
    const result = await aptos.view({
      payload: {
        function: `${COINFLIP_ADDRESS}::coinflip::get_last_degen_result_v1`,
        functionArguments: [player],
      },
    });

    return result;
  } catch (error) {
    console.error("Error fetching last degen result:", error);
    return null;
  }
}; 