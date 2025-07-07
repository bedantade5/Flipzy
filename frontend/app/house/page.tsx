"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig} from "@aptos-labs/ts-sdk";
import { COINFLIP_ADDRESS, NETWORK } from "@/constants";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { WalletSelector } from "@/components/WalletSelector";

const aptosConfig = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(aptosConfig);

export default function HousePage() {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  // Fetch house balance and owner status
  const fetchHouseData = async () => {
    try {
      // Get house balance
      const balanceResult = await aptos.view({
        payload: {
          function: `${COINFLIP_ADDRESS}::coinflip::get_house_balance_v1`,
          functionArguments: [],
        },
      });
      setHouseBalance(Number(balanceResult) / 100_000_000); // Convert from octas to APT

      // Get house owner
      const ownerResult = await aptos.view({
        payload: {
          function: `${COINFLIP_ADDRESS}::coinflip::get_house_owner_v1`,
          functionArguments: [],
        },
      });
      
      // Add null check for account address
      const accountAddress = account?.address?.toString();
      setIsOwner(accountAddress ? accountAddress === ownerResult[0] : false);
    } catch (error) {
      console.error("Error fetching house data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch house data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (account) {
      fetchHouseData();
    }
  }, [account]);

  const handleWithdraw = async () => {
    if (!account || !isOwner) {
      toast({
        title: "Error",
        description: "You must be the house owner to withdraw funds",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > houseBalance) {
      toast({
        title: "Error",
        description: "Insufficient house balance",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const amountInOctas = Math.floor(amount * 100_000_000);
      const response = await signAndSubmitTransaction({
        data: {
          function: `${COINFLIP_ADDRESS}::coinflip::withdraw_house_funds_v1`,
          typeArguments: [],
          functionArguments: [amountInOctas.toString()],
        },
      });

      toast({
        title: "Withdrawal Submitted",
        description: "Waiting for confirmation...",
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast({
        title: "Success",
        description: `Successfully withdrew ${amount} APT`,
      });

      // Refresh house balance
      await fetchHouseData();
      setWithdrawAmount("");
    } catch (error: any) {
      console.error("Error withdrawing funds:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw funds",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!account) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsDepositing(true);
    try {
      const amountInOctas = Math.floor(amount * 100_000_000);
      const response = await signAndSubmitTransaction({
        data: {
          function: `${COINFLIP_ADDRESS}::coinflip::deposit_house_funds_v1`,
          typeArguments: [],
          functionArguments: [amountInOctas.toString()],
        },
      });

      toast({
        title: "Deposit Submitted",
        description: "Waiting for confirmation...",
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast({
        title: "Success",
        description: `Successfully deposited ${amount} APT`,
      });

      // Refresh house balance
      await fetchHouseData();
      setDepositAmount("");
    } catch (error: any) {
      console.error("Error depositing funds:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to deposit funds",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>House Management</CardTitle>
            <CardDescription>
              {isOwner 
                ? "Manage house funds" 
                : "Only the house owner can manage funds"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">House Balance</h3>
                <p className="text-3xl font-bold">{houseBalance.toFixed(2)} APT</p>
              </div>

              {account ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="depositAmount" className="block text-sm font-medium mb-2">
                      Deposit Amount (APT)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.1"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleDeposit}
                        disabled={isDepositing || !depositAmount}
                      >
                        {isDepositing ? "Processing..." : "Deposit"}
                      </Button>
                    </div>
                  </div>

                  {isOwner && (
                    <div>
                      <label htmlFor="withdrawAmount" className="block text-sm font-medium mb-2">
                        Withdraw Amount (APT)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="withdrawAmount"
                          type="number"
                          step="0.1"
                          min="0"
                          max={houseBalance}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleWithdraw}
                          disabled={isLoading || !withdrawAmount}
                        >
                          {isLoading ? "Processing..." : "Withdraw"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <p className="text-sm text-gray-500 mb-4">
                    Please connect your wallet to view house management options.
                  </p>
                  <WalletSelector />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 