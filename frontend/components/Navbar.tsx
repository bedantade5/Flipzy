import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { NETWORK, APTOS_API_KEY } from "@/constants";

// Configure SDK with network only - API key handled separately for GraphQL
const API_KEY = APTOS_API_KEY;

interface FlipResult {
  player: string;
  bet_amount: string;
  player_choice: number;
  coin_result: number; // 0 = heads, 1 = tails
  won: boolean;
  payout: string;
  timestamp: string;
  transaction_version: number;
  game_id?: string;
}

export function Navbar() {
  const { disconnect, account } = useWallet();
  const [lastFlips, setLastFlips] = useState<FlipResult[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Calculate heads/tails percentage for last 100 flips
  const headsCount = lastFlips.filter(flip => flip.coin_result === 0).length;
  const tailsCount = lastFlips.filter(flip => flip.coin_result === 1).length;
  const totalFlips = lastFlips.length;
  
  const headsPercentage = totalFlips > 0 ? Math.round((headsCount / totalFlips) * 100) : 50;
  const tailsPercentage = totalFlips > 0 ? Math.round((tailsCount / totalFlips) * 100) : 50;

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  // Function to get number of flips to show based on screen size
  const getFlipsToShow = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 15; // Mobile: show 8 flips
      if (window.innerWidth < 768) return 15; // Tablet: show 15 flips
      if (window.innerWidth < 1024) return 30; // Small desktop: show 30 flips
      if (window.innerWidth < 1280) return 50; // Medium desktop: show 40 flips
      return 50; // Large desktop: show 50 flips
    }
    return 50;
  };

  const [flipsToShow, setFlipsToShow] = useState(getFlipsToShow());

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

  // Simple function to fetch recent flips
  const fetchFlips = async () => {
    try {
      const graphqlEndpoint = getGraphQLEndpoint();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      // Test 1: Try FlipzyyyFlipEvent
      const flipzyQuery = `
        query GetFlipzyyyFlipEvents {
          events(
            where: {
              type: {_like: "%::coinflip::FlipzyyyFlipEvent"}
            }
            order_by: {transaction_version: desc}
            limit: 10
          ) {
            type
            data
            transaction_version
          }
        }
      `;
      
      const flipzyResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: flipzyQuery })
      });
      
      if (flipzyResponse.ok) {
        const flipzyResult = await flipzyResponse.json();
        
        if (flipzyResult.data?.events?.length > 0) {
          // Convert to FlipResult format and update state
          const flips: FlipResult[] = flipzyResult.data.events.map((event: any) => {
            try {
              return {
                player: event.data.player,
                bet_amount: event.data.bet_amount,
                player_choice: event.data.player_choice,
                coin_result: event.data.coin_result,
                won: event.data.won,
                payout: event.data.payout,
                timestamp: new Date().toISOString(),
                transaction_version: parseInt(event.transaction_version),
                game_id: event.data.game_id,
              } as FlipResult;
            } catch (err) {
              return null;
            }
          }).filter((flip: FlipResult | null): flip is FlipResult => flip !== null);

          setLastFlips(flips);
          return; // Success, exit early
        }
      }
      
      // Test 2: Try CoinFlipEvent as fallback
      const coinFlipQuery = `
        query GetCoinFlipEvents {
          events(
            where: {
              type: {_like: "%::coinflip::CoinFlipEvent"}
            }
            order_by: {transaction_version: desc}
            limit: 5
          ) {
            type
            data
            transaction_version
          }
        }
      `;
      
      const coinFlipResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: coinFlipQuery })
      });
      
      if (coinFlipResponse.ok) {
        const coinFlipResult = await coinFlipResponse.json();
        
        if (coinFlipResult.data?.events?.length > 0) {
          // Convert to FlipResult format and update state
          const flips: FlipResult[] = coinFlipResult.data.events.map((event: any) => {
            try {
              return {
                player: event.data.player,
                bet_amount: event.data.bet_amount,
                player_choice: event.data.player_choice,
                coin_result: event.data.coin_result,
                won: event.data.won,
                payout: event.data.payout,
                timestamp: new Date().toISOString(),
                transaction_version: parseInt(event.transaction_version),
                game_id: event.data.game_id,
              } as FlipResult;
            } catch (err) {
              return null;
            }
          }).filter((flip: FlipResult | null): flip is FlipResult => flip !== null);

          setLastFlips(flips);
        }
      }

    } catch (error: any) {
      console.error("Error fetching flips:", error);
    }
  };

  // Check for mobile on resize
  useEffect(() => {
      const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
        setFlipsToShow(getFlipsToShow());
      };
      
    checkMobile(); // Check initially
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch flips on component mount and set up periodic updates
  useEffect(() => {
    fetchFlips(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchFlips();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#2D1810',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: 'white',
        zIndex: 999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          minHeight: '32px'
        }}>
          {/* Left section - Last Flips label and icons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            overflow: 'hidden',
            flex: 1
          }}>
            <span style={{ 
              color: '#FCD34D', 
              fontWeight: 'bold',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}>
              LAST FLIPS
            </span>
            
            {/* Flip results icons - more compact for mobile */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {lastFlips.slice(0, flipsToShow).map((flip, index) => (
                <div
                  key={index}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: flip.coin_result === 0 ? '#FCD34D' : '#E5E7EB',
                    border: '1px solid #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: 'black',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  {flip.coin_result === 0 ? "H" : "T"}
                </div>
              ))}
            </div>
          </div>

          {/* Right section - Disconnect button */}
          {account && (
            <Button
              onClick={handleDisconnect}
              style={{
                backgroundColor: '#DC2626',
                color: 'white',
                border: '2px solid #000',
                padding: '6px 10px',
                fontSize: '8px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: '"Press Start 2P", "Courier New", monospace',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              DISCONNECT
            </Button>
          )}
        </div>

        {/* Bottom row - Percentage display stretched across */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          borderTop: '1px solid #444',
          paddingTop: '4px'
        }}>
          {/* Percentage display with colored backgrounds */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            width: '100%', // Use full width instead of minWidth
            height: '24px', // Fixed height for mobile
          }}>
            <div style={{
              backgroundColor: '#F59E0B', // Orange/yellow background for HEADS
              color: 'black',
              padding: '4px 0',
              fontSize: '8px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: `${headsPercentage}%`, // Use actual percentage for width
            }}>
              HEADS {headsPercentage}%
            </div>
            <div style={{
              backgroundColor: '#374151', // Dark background for TAILS
              color: 'white',
              padding: '4px 0',
              fontSize: '8px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: `${tailsPercentage}%`, // Use actual percentage for width
            }}>
              TAILS {tailsPercentage}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#2D1810',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '12px',
      color: 'white',
      minHeight: '48px',
      gap: '16px',
      zIndex: 999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      {/* Left section - Last Flips (takes up available space) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        overflow: 'hidden',
        flex: 1
      }}>
        <span style={{ 
          color: '#FCD34D', 
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}>
          LAST FLIPS
        </span>
        
        {/* Flip results icons */}
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          {lastFlips.slice(0, flipsToShow).map((flip, index) => (
            <div
              key={index}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: flip.coin_result === 0 ? '#FCD34D' : '#E5E7EB',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'black',
                fontWeight: 'bold',
                flexShrink: 0
              }}
            >
              {flip.coin_result === 0 ? "H" : "T"}
            </div>
          ))}
        </div>
      </div>

      {/* Right section - Percentage display and Disconnect button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Percentage display with colored backgrounds */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          minWidth: '300px', // Increased minimum width significantly
          height: '32px' // Fixed height for consistency
        }}>
          <div style={{
            backgroundColor: '#F59E0B', // Orange/yellow background for HEADS
            color: 'black',
            padding: '6px 0',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: `${(headsPercentage / 100) * 300}px`, // Dynamic width based on percentage
            minWidth: '60px' // Minimum width to ensure text is readable
          }}>
            HEADS {headsPercentage}%
          </div>
          <div style={{
            backgroundColor: '#374151', // Dark background for TAILS
            color: 'white',
            padding: '6px 0',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: `${(tailsPercentage / 100) * 300}px`, // Dynamic width based on percentage
            minWidth: '60px' // Minimum width to ensure text is readable
          }}>
            TAILS {tailsPercentage}%
          </div>
        </div>

        {/* Disconnect button */}
        {account && (
          <Button
            onClick={handleDisconnect}
            style={{
              backgroundColor: '#DC2626',
              color: 'white',
              border: '2px solid #000',
              padding: '8px 16px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            DISCONNECT
          </Button>
        )}
      </div>
    </div>
  );
} 