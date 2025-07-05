import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useToast } from "@/components/ui/use-toast";
import { flipCoin, flipCoinDegen, flipCoinWhale } from "@/view-functions/flipCoin";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { COINFLIP_ADDRESS, NETWORK } from "@/constants";

const aptosConfig = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(aptosConfig);

const BET_AMOUNTS = [0.5, 1, 2, 5, 7, 9]; // APT amounts
const WHALE_BET_AMOUNTS = [20, 30, 50, 75, 90, 100]; // APT amounts for whale mode

type GamePhase = 'choosing' | 'waiting' | 'result';
type GameResult = {
  won: boolean;
  payout?: number;
  gamesWon?: number;
  totalPayout?: number;
};

export function CoinFlipGame() {
  const { signAndSubmitTransaction, account } = useWallet();
  const { toast } = useToast();
  
  const [selectedChoice, setSelectedChoice] = useState<"heads" | "tails" | null>("heads");
  const [selectedBetIndex, setSelectedBetIndex] = useState<number | null>(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDegenMode, setIsDegenMode] = useState(false);
  const [isWhaleMode, setIsWhaleMode] = useState(false);
  const [isFreeMode, setIsFreeMode] = useState(false);
  
  // Game phase and result state
  const [gamePhase, setGamePhase] = useState<GamePhase>('choosing');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Second flip state for Degen mode
  const [selectedChoice2, setSelectedChoice2] = useState<"heads" | "tails" | null>("heads");
  const [selectedBetIndex2, setSelectedBetIndex2] = useState<number | null>(0);


  // Get display text for the flip button
  const getFlipButtonText = () => {
    if (isFlipping) return 'FLIPPING...';
    if (isFreeMode) return 'FLIP FOR FREE!';
    if (isDegenMode) {
      if (selectedBetIndex !== null && selectedBetIndex2 !== null) {
        return 'DOUBLE OR NOTHING';
      }
      return 'DOUBLE OR NOTHING x2';
    } else {
      if (selectedBetIndex !== null) {
        if (isWhaleMode) {
          return 'WHALE FLIP';
        } else {
          return 'DOUBLE OR NOTHING';
        }
      }
      return isWhaleMode ? 'WHALE FLIP' : 'DOUBLE OR NOTHING';
    }
  };

  const resetGame = () => {
    setGamePhase('choosing');
    setGameResult(null);
    setSelectedChoice("heads");
    setSelectedBetIndex(0);
    setSelectedChoice2("heads");
    setSelectedBetIndex2(0);
    setIsFlipping(false);
  };

  const handleFlip = async () => {
    if (isFreeMode) {
      // Free Mode logic: random flip, show result phase
      if (selectedChoice === null) {
        toast({
          title: "Error",
          description: "Please select heads or tails",
          variant: "destructive",
        });
        return;
      }
      
      setIsFlipping(true);
      setGamePhase('waiting');
      
      setTimeout(() => {
        const randomResult = Math.random() < 0.5 ? "heads" : "tails";
        const userWon = selectedChoice === randomResult;
        
        setGameResult({
          won: userWon,
          payout: 0 // Free mode has no payout
        });
        setGamePhase('result');
        setIsFlipping(false);
      }, 2000); // 2 second delay for the spinning animation
      return;
    }

    if (!account) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    // Check requirements for single or double flip
    if (!isDegenMode) {
      // Single flip mode
      if (selectedChoice === null || selectedBetIndex === null) {
        toast({
          title: "Error",
          description: "Please select both heads/tails and a bet amount",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Degen mode - require both flips to be configured
      if (selectedChoice === null || selectedBetIndex === null || 
          selectedChoice2 === null || selectedBetIndex2 === null) {
        toast({
          title: "Error",
          description: "Please configure both flips in Degen mode",
          variant: "destructive",
        });
        return;
      }
    }

    setIsFlipping(true);
    setGamePhase('waiting');
    
    try {
      let response;
      if (!isDegenMode) {
        // Single flip transaction - use whale function if whale mode is active
        const playerChoice = selectedChoice === "heads" ? 0 : 1;
        
        if (isWhaleMode) {
          response = await signAndSubmitTransaction(
            flipCoinWhale({
              betAmountIndex: selectedBetIndex!,
              playerChoice,
            })
          );
        } else {
          response = await signAndSubmitTransaction(
            flipCoin({
              betAmountIndex: selectedBetIndex!,
              playerChoice,
            })
          );
        }
      } else {
        // Degen mode - dual flip transaction
        const playerChoice1 = selectedChoice === "heads" ? 0 : 1;
        const playerChoice2 = selectedChoice2 === "heads" ? 0 : 1;
        
        if (selectedBetIndex === null || selectedBetIndex2 === null) {
          throw new Error("Bet indices not properly selected");
        }
        
        response = await signAndSubmitTransaction(
          flipCoinDegen({
            betAmountIndex1: selectedBetIndex,
            playerChoice1,
            betAmountIndex2: selectedBetIndex2,
            playerChoice2,
          })
        );
      }
  
      // toast({
      //   title: "Flip Submitted!",
      //   description: "Waiting for the transaction to be confirmed...",
      // });
  
      try {
        await aptos.waitForTransaction({ transactionHash: response.hash });
        
        const txn = await aptos.getTransactionByHash({ 
          transactionHash: response.hash 
        });

        if ("success" in txn && !txn.success) {
          throw new Error(txn.vm_status || "Transaction failed");
        }

        if ("events" in txn) {
          const flipEvents = txn.events?.filter(e => 
            e.type === `${COINFLIP_ADDRESS}::coinflip::FlipzyyyFlipEvent` ||
            e.type === `${COINFLIP_ADDRESS}::coinflip::FlipzyyyDoubleFlipEvent`
          );
          
          if (flipEvents.length > 0) {
            const flipEvent = flipEvents[0];
            if (flipEvent.type.includes("FlipzyyyDoubleFlipEvent")) {
              const { games_won, total_payout } = flipEvent.data;
              const payout_in_apt = Number(total_payout) / 10**8;

              setGameResult({
                won: games_won > 0,
                gamesWon: games_won,
                totalPayout: payout_in_apt
              });
            } else {
              const { won, payout } = flipEvent.data;
              const payout_in_apt = Number(payout) / 10**8;

              setGameResult({
                won: won,
                payout: payout_in_apt
              });
            }
            
            setGamePhase('result');
          } else {
            throw new Error("Could not find flip event in transaction");
          }
        }
      } catch (error: any) {
        console.error("Transaction failed:", error);
        toast({
          title: "Transaction Failed",
          description: error.message || "Failed to process transaction",
          variant: "destructive",
        });
        setGamePhase('choosing');
      }
    } catch (error: any) {
      console.error("Error flipping coin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit coinflip transaction",
        variant: "destructive",
      });
      setGamePhase('choosing');
    } finally {
      setIsFlipping(false);
    }
  };

  // Function to render a flip module
  const renderFlipModule = (
    title: string,
    selectedChoice: "heads" | "tails" | null,
    setSelectedChoice: (choice: "heads" | "tails") => void,
    selectedBetIndex: number | null,
    setSelectedBetIndex: (index: number) => void
  ) => (
    <div style={{ flex: isDegenMode ? '1' : 'none', minWidth: isDegenMode ? '0' : 'auto' }}>
      {/* I LIKE section */}
      <div className="text-center mb-6">
        <h2 style={{
          fontSize: isDegenMode ? '14px' : '18px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: 'black',
          fontFamily: '"Press Start 2P", "Courier New", monospace'
        }}>
          {title}
        </h2>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setSelectedChoice("heads")}
            style={{
              background: isWhaleMode ? '#00bfff' : '#FCD34D',
              color: 'black',
              border: selectedChoice === "heads" ? '3px solid black' : '2px solid #666',
              padding: isDegenMode ? '14px' : '18px',
              fontSize: isDegenMode ? '14px' : '18px',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer',
              minWidth: isDegenMode ? '167px' : '170px',
              transition: 'all 0.2s ease',
              transform: 'translateY(0)',
              fontFamily: '"Press Start 2P", "Courier New", monospace'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            HEADS
          </button>
          
          <button
            onClick={() => setSelectedChoice("tails")}
            style={{
              background: isWhaleMode ? '#00bfff' : '#FCD34D',
              color: 'black',
              border: selectedChoice === "tails" ? '3px solid black' : '2px solid #666',
              padding: isDegenMode ? '14px' : '18px',
              fontSize: isDegenMode ? '14px' : '18px',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer',
              minWidth: isDegenMode ? '167px' : '170px',
              transition: 'all 0.2s ease',
              transform: 'translateY(0)',
              fontFamily: '"Press Start 2P", "Courier New", monospace'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            TAILS
          </button>
        </div>
      </div>

      {/* FOR section - hide in Free Mode */}
      {!isFreeMode && (
        <div className="text-center mb-6">
          <h2 style={{
            fontSize: isDegenMode ? '14px' : '18px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: 'black',
            fontFamily: '"Press Start 2P", "Courier New", monospace'
          }}>
            FOR
          </h2>
          
          <div className="grid grid-cols-3 gap-2">
            {(isWhaleMode ? WHALE_BET_AMOUNTS : BET_AMOUNTS).map((amount, index) => {
              const isSelected = selectedBetIndex === index;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedBetIndex(index)}
                  style={{
                    background: isWhaleMode ? '#00bfff' : '#FCD34D',
                    color: 'black',
                    border: isSelected ? '3px solid black' : '2px solid #666',
                    padding: isDegenMode ? 
                      (typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : '9px') : 
                      '14px',
                    fontSize: isDegenMode ? 
                      (typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : '14px') : 
                      '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: 'translateY(0)',
                    fontFamily: '"Press Start 2P", "Courier New", monospace'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {amount} APT
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Check if both flips are configured in Degen mode
  const isDegenModeReady = isFreeMode
    ? selectedChoice !== null
    : isDegenMode
      ? (selectedChoice && selectedBetIndex !== null && selectedChoice2 && selectedBetIndex2 !== null)
      : (selectedChoice && selectedBetIndex !== null);

  // Render waiting state
  const renderWaitingState = () => (
    <div className="text-center">
      {/* Spinning coin */}
      <div style={{
        width: typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px',
        height: typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px',
        margin: '0 auto 32px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img 
          src={isWhaleMode ? "/icons/whalecoinflip.gif" : "/icons/flipcoin.gif"}
          alt="Flipping Coin" 
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Waiting text */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
          fontWeight: 'bold',
          color: 'black',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          marginBottom: '16px'
        }}>
          WAITING FOR DEPOSIT.
        </h2>
        
        {/* Show different text based on mode */}
        {isDegenMode && selectedBetIndex !== null && selectedBetIndex2 !== null ? (
          <p style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '14px',
            color: 'black',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            textDecoration: 'underline',
            lineHeight: '1.5'
          }}>
            1 {selectedChoice?.toUpperCase()} FOR {(isWhaleMode ? WHALE_BET_AMOUNTS : BET_AMOUNTS)[selectedBetIndex].toFixed(2)} APT
            <br />
            & 1 {selectedChoice2?.toUpperCase()} FOR {(isWhaleMode ? WHALE_BET_AMOUNTS : BET_AMOUNTS)[selectedBetIndex2].toFixed(2)} APT
          </p>
        ) : (
          <p style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '14px',
            color: 'black',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            textDecoration: 'underline'
          }}>
            {selectedChoice?.toUpperCase()} FOR {!isFreeMode && selectedBetIndex !== null ? 
              `${(isWhaleMode ? WHALE_BET_AMOUNTS : BET_AMOUNTS)[selectedBetIndex].toFixed(2)}` : 
              '0.00'} APT
          </p>
        )}
      </div>
    </div>
  );

  // Render result state
  const renderResultState = () => {
    if (!gameResult) return null;

    const coinSrc = gameResult.won ? (isWhaleMode ? "/icons/woncoinwhale.png" : "/icons/woncoin.png") : (isWhaleMode ? "/icons/lostcoinwhale.png" : "/icons/lostcoin.png");
    
    // Different result text based on mode
    let resultText = "";
    let detailText = "";
    
    if (isDegenMode && gameResult.gamesWon !== undefined) {
      const gamesWon = gameResult.gamesWon;
      if (gamesWon === 2) {
        resultText = "YOU WON 2 FLIPS";
        detailText = "WON FIRST FLIP & SECOND FLIP";
      } else if (gamesWon === 1) {
        resultText = "YOU WON 1 FLIP";
        detailText = "WON 1 FLIP & LOST 1 FLIP";
      } else {
        resultText = "YOU LOST";
        detailText = "LOST FIRST FLIP & SECOND FLIP";
      }
    } else {
      resultText = gameResult.won ? "YOU WON" : "YOU LOST";
    }
    
    const payoutText = isFreeMode ? "0.00 APT" : 
      isDegenMode ? `${gameResult.totalPayout?.toFixed(2) || '0.00'} APT` :
      `${gameResult.payout?.toFixed(2) || '0.00'} APT`;

    return (
      <div className="text-center">
        {/* Result coin */}
        <div style={{
          width: typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px',
          height: typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px',
          margin: '0 auto 32px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img 
            src={coinSrc}
            alt={resultText} 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Result text */}
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            fontWeight: 'bold',
            color: 'black',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            marginBottom: '16px'
          }}>
            {resultText}
          </h2>
          
          {/* Show detailed result for degen mode */}
          {isDegenMode && detailText && (
            <p style={{
              fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : '12px',
              color: 'black',
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}>
              {detailText}
            </p>
          )}
          
          <p style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '14px',
            color: gameResult.won ? '#22c55e' : '#ef4444',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            fontWeight: 'bold',
            marginBottom: '24px'
          }}>
            {payoutText}
          </p>

          <div style={{
            borderTop: '2px solid #000',
            margin: '16px 0',
            width: '100%'
          }} />

          <p style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '14px',
            color: 'black',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            marginBottom: '16px'
          }}>
            TRY AGAIN?
          </p>
        </div>

        {/* Try Again button */}
        <button
          onClick={resetGame}
          style={{
            background: isWhaleMode ? '#00bfff' : '#FCD34D',
            color: 'black',
            border: '3px solid black',
            padding: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px 24px' : '16px 32px',
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '14px' : '18px',
            fontWeight: 'bold',
            borderRadius: '12px',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s ease',
            transform: 'translateY(0)',
            fontFamily: '"Press Start 2P", "Courier New", monospace'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          DOUBLE OR NOTHING
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Degen and Whale Toggles for Desktop only - sticky to screen - only show in choosing phase */}
      {gamePhase === 'choosing' && typeof window !== 'undefined' && window.innerWidth >= 768 && (
        <div style={{
          position: 'fixed',
          top: 'clamp(70px, 12vw, 70px)',
          left: '16px',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          zIndex: 1000,
        }}>
          {/* Degen Toggle - hide when whale mode or free mode is active */}
          {!isWhaleMode && !isFreeMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8F8F6',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '2px solid #000',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'black',
                fontFamily: '"Press Start 2P", "Courier New", monospace'
              }}>
                DEGEN
              </span>
              {/* Toggle Switch */}
              <div
                onClick={() => {
                  setIsDegenMode(!isDegenMode);
                  setSelectedChoice("heads");
                  setSelectedBetIndex(0);
                  setSelectedChoice2("heads");
                  setSelectedBetIndex2(0);
                }}
                style={{
                  width: '38px',
                  height: '20px',
                  backgroundColor: isDegenMode ? '#22c55e' : '#6b7280',
                  borderRadius: '10px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  border: '2px solid #000'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '1px',
                    left: isDegenMode ? '19px' : '1px',
                    transition: 'left 0.3s ease',
                    border: '1px solid #333'
                  }}
                />
              </div>
            </div>
          )}
          {/* Whale Toggle - hide when degen mode or free mode is active */}
          {!isDegenMode && !isFreeMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8F8F6',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '2px solid #000',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'black',
                fontFamily: '"Press Start 2P", "Courier New", monospace'
              }}>
                WHALE
              </span>
              {/* Toggle Switch */}
              <div
                onClick={() => {
                  setIsWhaleMode(!isWhaleMode);
                  setSelectedChoice("heads");
                  setSelectedBetIndex(0);
                  setSelectedChoice2("heads");
                  setSelectedBetIndex2(0);
                }}
                style={{
                  width: '38px',
                  height: '20px',
                  backgroundColor: isWhaleMode ? '#22c55e' : '#6b7280',
                  borderRadius: '10px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  border: '2px solid #000'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '1px',
                    left: isWhaleMode ? '19px' : '1px',
                    transition: 'left 0.3s ease',
                    border: '1px solid #333'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full mx-auto border-2 border-black shadow-2xl" style={{ 
        maxWidth: isDegenMode && gamePhase === 'choosing' ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '95vw' : '800px') : 
                               (typeof window !== 'undefined' && window.innerWidth < 768 ? '90vw' : '400px'),
        minHeight: typeof window !== 'undefined' && window.innerWidth >= 768 && gamePhase === 'choosing' && !isDegenMode ? '600px' : 'auto',
        borderRadius: '16px',
        paddingLeft: isDegenMode && gamePhase === 'choosing' ? 
                     (typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '20px') : 
                     (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '24px'),
        paddingRight: isDegenMode && gamePhase === 'choosing' ? 
                      (typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '20px') : 
                      (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '24px'),
        paddingTop: typeof window !== 'undefined' && window.innerWidth < 768 ? '50px' : 
                   (isDegenMode && gamePhase === 'choosing' ? 
                    (typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '20px') : 
                    (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '24px')),
        paddingBottom: isDegenMode && gamePhase === 'choosing' ? 
                       (typeof window !== 'undefined' && window.innerWidth < 768 ? '8px' : '12px') : 
                       (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '24px'),
        position: 'relative',
        color: 'black',
        backgroundColor: '#F8F8F6',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        transition: 'max-width 0.3s ease, padding-bottom 0.3s ease, padding-left 0.3s ease, padding-right 0.3s ease, padding-top 0.3s ease, min-height 0.3s ease'
      }}>
        {/* Render different content based on game phase */}
        {gamePhase === 'waiting' && renderWaitingState()}
        {gamePhase === 'result' && renderResultState()}
        {/* Original choosing phase content */}
        {gamePhase === 'choosing' && (
          <>
            {/* Toggles and logo row for mobile */}
            {typeof window !== 'undefined' && window.innerWidth < 768 ? (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: isDegenMode ? '8px' : '16px' }}>
                {/* Logo only */}
                <div className="text-center" style={{ margin: 0 }}>
                  <div style={{
                    width: isDegenMode ? '80px' : '120px',
                    height: isDegenMode ? '80px' : '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'width 0.3s ease, height 0.3s ease'
                  }}>
                    <img 
                      src={isDegenMode ? "/icons/smilecoin.png" : (isWhaleMode ? "/icons/whalecoin.png" : "/icons/flipzylogo.png")}
                      alt="Flipzy Coin" 
                      style={{ 
                        width: isDegenMode ? '80px' : '120px',
                        height: isDegenMode ? '80px' : '120px',
                        objectFit: 'contain',
                        transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
                        opacity: 1
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Desktop or fallback: logo only
              <div className="text-center" style={{ 
                marginBottom: isDegenMode ? 
                             (typeof window !== 'undefined' && window.innerWidth < 768 ? '8px' : '12px') : 
                             (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '32px')
              }}>
                <div style={{
                  width: isDegenMode ? 
                         (typeof window !== 'undefined' && window.innerWidth < 768 ? '80px' : '100px') : 
                         (typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px'),
                  height: isDegenMode ? 
                          (typeof window !== 'undefined' && window.innerWidth < 768 ? '80px' : '100px') : 
                          (typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px'),
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'width 0.3s ease, height 0.3s ease'
                }}>
                  <img 
                    src={isDegenMode ? "/icons/smilecoin.png" : (isWhaleMode ? "/icons/whalecoin.png" : "/icons/flipzylogo.png")}
                    alt="Flipzy Coin" 
                    style={{ 
                      width: isDegenMode ? 
                             (typeof window !== 'undefined' && window.innerWidth < 768 ? '80px' : '100px') : 
                             (typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px'),
                      height: isDegenMode ? 
                              (typeof window !== 'undefined' && window.innerWidth < 768 ? '80px' : '100px') : 
                              (typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '150px'),
                      objectFit: 'contain',
                      transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
                      opacity: 1
                    }}
                  />
                </div>
              </div>
            )}
            {/* Flip Modules Container */}
            <div style={{
              display: 'flex',
              flexDirection: isDegenMode ? 
                           (typeof window !== 'undefined' && window.innerWidth < 768 ? 'column' : 'row') : 'column',
              gap: isDegenMode ? 
                   (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px') : '0',
              marginBottom: isDegenMode ? 
                           (typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '16px') : 
                           (typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px')
            }}>
              {/* First Flip Module */}
              {renderFlipModule(
                "I LIKE",
                selectedChoice,
                setSelectedChoice,
                selectedBetIndex,
                setSelectedBetIndex
              )}
              {/* Vertical Separator for Degen mode - only show on desktop */}
              {isDegenMode && typeof window !== 'undefined' && window.innerWidth >= 768 && (
                <div style={{
                  width: '2px',
                  backgroundColor: '#000',
                  alignSelf: 'stretch',
                  margin: '0 10px'
                }} />
              )}
              {/* Horizontal Separator for Degen mode - only show on mobile */}
              {isDegenMode && typeof window !== 'undefined' && window.innerWidth < 768 && (
                <div style={{
                  height: '2px',
                  backgroundColor: '#000',
                  width: '100%',
                  margin: '8px 0'
                }} />
              )}
              {/* Second Flip Module (only in Degen mode) */}
              {isDegenMode && (
                renderFlipModule(
                  "I ALSO LIKE",
                  selectedChoice2,
                  setSelectedChoice2,
                  selectedBetIndex2,
                  setSelectedBetIndex2
                )
              )}
            </div>
            {/* Single Double or Nothing button */}
            <div className="text-center">
              <button
                onClick={handleFlip}
                disabled={!isDegenModeReady || isFlipping}
                style={{
                  background: (!isDegenModeReady || isFlipping) ? '#9CA3AF' : (isWhaleMode ? '#00bfff' : '#FCD34D'),
                  color: 'black',
                  border: '3px solid black',
                  padding: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px 24px' : '16px 32px',
                  fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '14px' : '18px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  cursor: (!isDegenModeReady || isFlipping) ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: (!isDegenModeReady || isFlipping) ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  transform: 'translateY(0)',
                  fontFamily: '"Press Start 2P", "Courier New", monospace'
                }}
                onMouseEnter={(e) => {
                  if (isDegenModeReady && !isFlipping) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {getFlipButtonText()}
              </button>
            </div>
            {/* Main Title and TRY FREE label */}
            <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              {/* TRY FREE clickable label */}
              <span
                onClick={() => {
                  setIsFreeMode((prev) => {
                    if (!prev) {
                      setIsDegenMode(false);
                      setIsWhaleMode(false);
                    }
                    return !prev;
                  });
                  setSelectedBetIndex(0);
                  setSelectedBetIndex2(0);
                }}
                style={{
                  fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '12px' : '14px',
                  fontWeight: isFreeMode ? 'bold' : 'normal',
                  color: isFreeMode ? '#22c55e' : '#2563eb',
                  textDecoration: isFreeMode ? 'underline' : 'none',
                  cursor: 'pointer',
                  marginTop: '2px',
                  marginBottom: '2px',
                  transition: 'color 0.2s, text-decoration 0.2s',
                  fontFamily: '"Press Start 2P", "Courier New", monospace',
                  letterSpacing: '0.5px',
                  borderBottom: isFreeMode ? '2px solid #22c55e' : 'none',
                  borderRadius: '2px',
                  padding: '1px 4px',
                  background: isFreeMode ? 'rgba(34,197,94,0.08)' : 'none'
                }}
              >
                TRY FREE
              </span>
            </div>
          </>
        )}
        {/* Mobile toggles below flip container */}
        {gamePhase === 'choosing' && typeof window !== 'undefined' && window.innerWidth < 768 && (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            {/* Degen Toggle - hide when whale mode or free mode is active */}
            {!isWhaleMode && !isFreeMode && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8F8F6',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #000',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'black',
                  fontFamily: '"Press Start 2P", "Courier New", monospace'
                }}>
                  DEGEN
                </span>
                {/* Toggle Switch */}
                <div
                  onClick={() => {
                    setIsDegenMode(!isDegenMode);
                    setSelectedChoice("heads");
                    setSelectedBetIndex(0);
                    setSelectedChoice2("heads");
                    setSelectedBetIndex2(0);
                  }}
                  style={{
                    width: '32px',
                    height: '16px',
                    backgroundColor: isDegenMode ? '#22c55e' : '#6b7280',
                    borderRadius: '8px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                    border: '2px solid #000'
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '1px',
                      left: isDegenMode ? '17px' : '1px',
                      transition: 'left 0.3s ease',
                      border: '1px solid #333'
                    }}
                  />
                </div>
              </div>
            )}
            {/* Whale Toggle - hide when degen mode or free mode is active */}
            {!isDegenMode && !isFreeMode && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8F8F6',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #000',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'black',
                  fontFamily: '"Press Start 2P", "Courier New", monospace'
                }}>
                  WHALE
                </span>
                {/* Toggle Switch */}
                <div
                  onClick={() => {
                    setIsWhaleMode(!isWhaleMode);
                    setSelectedChoice("heads");
                    setSelectedBetIndex(0);
                    setSelectedChoice2("heads");
                    setSelectedBetIndex2(0);
                  }}
                  style={{
                    width: '32px',
                    height: '16px',
                    backgroundColor: isWhaleMode ? '#22c55e' : '#6b7280',
                    borderRadius: '8px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                    border: '2px solid #000'
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '1px',
                      left: isWhaleMode ? '17px' : '1px',
                      transition: 'left 0.3s ease',
                      border: '1px solid #333'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Footer text - show in all phases */}
        <div className="text-center" style={{ 
          marginTop: isDegenMode && gamePhase === 'choosing' ? 
                    (typeof window !== 'undefined' && window.innerWidth < 768 ? '8px' : '12px') : 
                    (typeof window !== 'undefined' && window.innerWidth < 768 ? '9px' : '12px')
        }}>
          <p style={{
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '8px' : '10px',
            color: 'rgba(0, 0, 0, 0.5)',
            fontFamily: '"Press Start 2P", "Courier New", monospace'
          }}>
            FLIPZY BY TEAM OBLIQUE!
          </p>
        </div>
      </div>
    </>
  );
}