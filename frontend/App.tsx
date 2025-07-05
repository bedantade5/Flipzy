import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal Components
import { Card, CardHeader } from "@/components/ui/card";
import { CoinFlipGame } from "@/components/CoinFlipGame";
import { TopBanner } from "@/components/TopBanner";
import { WalletSelector } from "@/components/WalletSelector";
import { Navbar } from "@/components/Navbar";
import { RecentPlays } from "@/components/RecentPlays";

function App() {
  const { connected } = useWallet();

  return (
    <>
      <TopBanner />
      <Navbar />
      <div className="min-h-screen" style={{ 
        backgroundColor: '#F8F8F6', // Off-white background to match the image
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        paddingTop: 'clamp(5px, 5.5vh, 100px)'
      }}>
        <div className="container mx-auto px-4 space-y-8">
          {connected ? (
            <>
              {/* Main Game Section - Centered */}
              <div className="flex justify-center">
                <CoinFlipGame />
              </div>
              
              {/* Recent Plays Section */}
              <div className="flex justify-center">
                <RecentPlays />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="border-2 border-black shadow-xl max-w-md mx-auto" style={{ 
                  backgroundColor: '#F8F8F6',
                  fontFamily: '"Press Start 2P", "Courier New", monospace'
                }}>
                  <CardHeader className="text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                      <img 
                        src="/icons/smilecoin.png" 
                        alt="Flipzy Logo" 
                        className="w-36 h-36"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    
                    {/* Double or Nothing Title */}
                    <div className="mb-8">
                      <span style={{ 
                        fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '24px' : '36px', 
                        fontWeight: 'bold', 
                        color: 'black', 
                        fontFamily: '"Press Start 2P", "Courier New", monospace', 
                        letterSpacing: '1px', 
                        marginBottom: '2px', 
                        textShadow: '0 2px 0 #FCD34D, 0 4px 8px rgba(0,0,0,0.08)' 
                      }}>
                        DOUBLE OR NOTHING
                      </span>
                    </div>
                    
                    <p className="text-black text-lg mb-6" style={{ 
                      fontFamily: '"Press Start 2P", "Courier New", monospace',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      Connect your wallet to start flipping coins and winning APT!
                    </p>
                    <div className="flex justify-center">
                      <WalletSelector />
                    </div>
                  </CardHeader>
                </Card>
              </div>
              
              {/* Recent Plays Section - Show even when not connected */}
              <div className="flex justify-center">
                <RecentPlays />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;