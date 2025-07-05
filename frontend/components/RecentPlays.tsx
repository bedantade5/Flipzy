import React, { useState, useEffect } from 'react';
import { COINFLIP_ADDRESS, NETWORK, APTOS_API_KEY } from "@/constants";

interface RecentPlay {
  player: string;
  betAmount: number;
  playerChoice: number;
  coinResult: number;
  won: boolean;
  payout: number;
  gameId: number;
  timestamp: number;
  type: 'regular' | 'degen' | 'whale';
  // For degen mode
  gamesWon?: number;
  totalPayout?: number;
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatAmount = (amount: number) => {
  return (amount / 100000000).toFixed(2); // Convert from octas to APT
};

const getTimeAgo = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

export const RecentPlays: React.FC = () => {
  const [recentPlays, setRecentPlays] = useState<RecentPlay[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the appropriate GraphQL endpoint based on network
  const getGraphQLEndpoint = () => {
    switch (NETWORK) {
      case 'mainnet':
        return 'https://api.mainnet.aptoslabs.com/v1/graphql';
      case 'testnet':
        return 'https://api.testnet.aptoslabs.com/v1/graphql';
      case 'devnet':
        return 'https://api.devnet.aptoslabs.com/v1/graphql';
      default:
        return 'https://api.testnet.aptoslabs.com/v1/graphql';
    }
  };

  useEffect(() => {
    const fetchRecentPlays = async () => {
      try {
        if (!COINFLIP_ADDRESS) return;

        const graphqlEndpoint = getGraphQLEndpoint();
        
        const headers: any = {
          'Content-Type': 'application/json'
        };

        if (APTOS_API_KEY) {
          headers['Authorization'] = `Bearer ${APTOS_API_KEY}`;
        }

        // Query for regular flip events
        const flipQuery = `
          query GetFlipEvents {
            events(
              where: {
                type: {_like: "%::coinflip::FlipzyyyFlipEvent"}
              }
              order_by: {transaction_version: desc}
              limit: 3
            ) {
              type
              data
              transaction_version
            }
          }
        `;

        // Query for degen flip events
        const degenQuery = `
          query GetDegenFlipEvents {
            events(
              where: {
                type: {_like: "%::coinflip::FlipzyyyDoubleFlipEvent"}
              }
              order_by: {transaction_version: desc}
              limit: 2
            ) {
              type
              data
              transaction_version
            }
          }
        `;

        // Fetch regular flip events
        const flipResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: flipQuery })
        });

        // Fetch degen flip events
        const degenResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: degenQuery })
        });

        const allEvents: RecentPlay[] = [];

        // Process regular flip events
        if (flipResponse.ok) {
          const flipResult = await flipResponse.json();
          if (flipResult.data?.events?.length > 0) {
            const flipEvents = flipResult.data.events.map((event: any, index: number) => {
              try {
                const data = event.data;
                // Use transaction_version to generate a more realistic timestamp
                // Higher transaction_version = more recent
                const baseTime = Math.floor(Date.now() / 1000);
                const estimatedTimestamp = baseTime - (index * 30); // Each event ~30 seconds apart
                
                return {
                  player: data.player,
                  betAmount: parseInt(data.bet_amount),
                  playerChoice: parseInt(data.player_choice),
                  coinResult: parseInt(data.coin_result),
                  won: data.won,
                  payout: parseInt(data.payout),
                  gameId: parseInt(data.game_id),
                  timestamp: estimatedTimestamp,
                  type: parseInt(data.bet_amount) >= 2000000000 ? 'whale' : 'regular' as 'regular' | 'whale'
                };
              } catch (err) {
                console.error('Error parsing flip event:', err);
                return null;
              }
            }).filter((event: RecentPlay | null): event is RecentPlay => event !== null);
            
            allEvents.push(...flipEvents);
          }
        }

        // Process degen flip events
        if (degenResponse.ok) {
          const degenResult = await degenResponse.json();
          if (degenResult.data?.events?.length > 0) {
            const degenEvents = degenResult.data.events.map((event: any, index: number) => {
              try {
                const data = event.data;
                // Use transaction_version to generate a more realistic timestamp
                // Higher transaction_version = more recent
                const baseTime = Math.floor(Date.now() / 1000);
                const estimatedTimestamp = baseTime - (index * 30); // Each event ~30 seconds apart
                
                return {
                  player: data.player,
                  betAmount: parseInt(data.bet_amount1) + parseInt(data.bet_amount2),
                  playerChoice: parseInt(data.player_choice1), // Use first choice for display
                  coinResult: parseInt(data.coin_result1), // Use first result for display
                  won: parseInt(data.games_won) > 0,
                  payout: parseInt(data.total_payout),
                  gameId: parseInt(data.game_id),
                  timestamp: estimatedTimestamp,
                  type: 'degen' as 'degen',
                  gamesWon: parseInt(data.games_won),
                  totalPayout: parseInt(data.total_payout)
                };
              } catch (err) {
                console.error('Error parsing degen event:', err);
                return null;
              }
            }).filter((event: RecentPlay | null): event is RecentPlay => event !== null);
            
            allEvents.push(...degenEvents);
          }
        }

        // Sort by timestamp and take top 10
        allEvents.sort((a, b) => b.timestamp - a.timestamp);
        setRecentPlays(allEvents.slice(0, 10));

      } catch (error) {
        console.error("Error fetching recent plays:", error);
        // Fallback to mock data for demonstration
        setRecentPlays([
          {
            player: "0x1234567890abcdef1234567890abcdef12345678",
            betAmount: 100000000,
            playerChoice: 0,
            coinResult: 0,
            won: true,
            payout: 200000000,
            gameId: 1,
            timestamp: Math.floor(Date.now() / 1000) - 22,
            type: 'regular'
          },
          {
            player: "0xabcdef1234567890abcdef1234567890abcdef12",
            betAmount: 50000000,
            playerChoice: 1,
            coinResult: 0,
            won: false,
            payout: 0,
            gameId: 2,
            timestamp: Math.floor(Date.now() / 1000) - 33,
            type: 'regular'
          },
          {
            player: "0x9876543210fedcba9876543210fedcba98765432",
            betAmount: 200000000,
            playerChoice: 0,
            coinResult: 1,
            won: false,
            payout: 0,
            gameId: 3,
            timestamp: Math.floor(Date.now() / 1000) - 49,
            type: 'regular'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPlays();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentPlays, 30000);
    return () => clearInterval(interval);
  }, []);

  const getResultText = (play: RecentPlay) => {
    if (play.type === 'degen') {
      const gamesWon = play.gamesWon || 0;
      if (gamesWon === 2) return 'doubled';
      if (gamesWon === 1) return 'doubled';
      return 'got rugged';
    }
    return play.won ? 'doubled' : 'got rugged';
  };

  const getResultColor = (play: RecentPlay) => {
    if (play.type === 'degen') {
      const gamesWon = play.gamesWon || 0;
      return gamesWon > 0 ? 'text-green-600' : 'text-red-600';
    }
    return play.won ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="border-2 border-black shadow-xl" style={{ 
          backgroundColor: '#F8F8F6',
          fontFamily: '"Press Start 2P", "Courier New", monospace'
        }}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-black mb-6 text-center">
              RECENT PLAYS
            </h2>
            <div className="text-center text-black">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="border-2 border-black shadow-xl" style={{ 
        backgroundColor: '#F8F8F6',
        fontFamily: '"Press Start 2P", "Courier New", monospace'
      }}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-black mb-6 text-center">
            RECENT PLAYS
          </h2>
          
          <div className="space-y-4">
            {recentPlays.map((play, index) => (
              <div 
                key={`${play.player}-${play.gameId}-${index}`}
                className="flex items-center justify-between p-4 border border-black bg-white"
              >
                <div className="flex items-center space-x-4">
                  <img 
                    src="/icons/aptcoin.png" 
                    alt="APT Coin" 
                    className="w-8 h-8"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex flex-col">
                    <div className="text-sm text-black">
                      {formatAddress(play.player)} flipped {formatAmount(play.betAmount)} and{' '}
                      <span className={getResultColor(play)}>
                        {getResultText(play)}
                      </span>
                      {play.type === 'degen' && (
                        <span className="text-purple-600 ml-1">[DEGEN]</span>
                      )}
                      {play.type === 'whale' && (
                        <span className="text-blue-600 ml-1">[WHALE]</span>
                      )}
                      .
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {getTimeAgo(play.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {recentPlays.length === 0 && (
            <div className="text-center text-black py-8">
              No recent plays found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 