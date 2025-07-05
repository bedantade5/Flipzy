module coinflip_addr::coinflip {
    use std::vector;
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::event;
    use aptos_framework::randomness;
    use aptos_framework::timestamp;

    // ======================== Error codes ========================
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_INVALID_BET_INDEX: u64 = 2;
    const E_HOUSE_INSUFFICIENT_FUNDS: u64 = 3;
    const E_UNAUTHORIZED: u64 = 4;
    const E_GAME_NOT_FOUND: u64 = 5;
    const E_GAME_ALREADY_RESOLVED: u64 = 6;

    // ======================== Constants ========================
    const BET_AMOUNTS: vector<u64> = vector[50000000, 100000000, 200000000, 500000000, 700000000, 900000000]; // 0.5, 1, 2, 5, 7, 9 APT in octas
    const WHALE_BET_AMOUNTS: vector<u64> = vector[2000000000, 3000000000, 5000000000, 7500000000, 9000000000, 10000000000]; // 20, 30, 50, 75, 90, 100 APT in octas
    const FEE_PERCENTAGE: u64 = 350; // 3.5% in basis points (3.5 * 100)
    const BASIS_POINTS: u64 = 10000;
    const HOUSE_OBJECT_SEED: vector<u8> = b"coinflip_house";

    // ======================== Structs ========================
    
    struct HouseData has key {
        house_funds: Coin<AptosCoin>,
        owner: address,
        total_volume: u64,
        total_games: u64,
        house_wins: u64,
        player_wins: u64,
        extend_ref: ExtendRef,
    }

    struct GameResult has key {
        player: address,
        bet_amount: u64,
        player_choice: u8, // 0 = heads, 1 = tails
        coin_result: u8,   // 0 = heads, 1 = tails
        won: bool,
        payout: u64,
        timestamp: u64,
        game_id: u64,
    }

    struct DegenGameResult has key {
        player: address,
        bet_amount1: u64,
        player_choice1: u8,
        coin_result1: u8,
        bet_amount2: u64,
        player_choice2: u8,
        coin_result2: u8,
        games_won: u8, // 0, 1, or 2
        total_payout: u64,
        timestamp: u64,
        game_id: u64,
    }

    // ======================== Events ========================
    
    #[event]
    struct FlipzyyyFlipEvent has drop, store {
        player: address,
        bet_amount: u64,
        player_choice: u8,
        coin_result: u8,
        won: bool,
        payout: u64,
        game_id: u64,
    }

    #[event]
    struct FlipzyyyDoubleFlipEvent has drop, store {
        player: address,
        bet_amount1: u64,
        player_choice1: u8,
        coin_result1: u8,
        bet_amount2: u64,
        player_choice2: u8,
        coin_result2: u8,
        games_won: u8,
        total_payout: u64,
        game_id: u64,
    }

    #[event]
    struct HouseFundsDeposited has drop, store {
        amount: u64,
        new_balance: u64,
    }

    #[event]
    struct HouseFundsWithdrawn has drop, store {
        amount: u64,
        new_balance: u64,
    }

    // ======================== Initialize ========================
    
    fun init_module(sender: &signer) {
        let constructor_ref = &object::create_named_object(sender, HOUSE_OBJECT_SEED);
        let house_signer = &object::generate_signer(constructor_ref);
        
        move_to(house_signer, HouseData {
            house_funds: coin::zero<AptosCoin>(),
            owner: signer::address_of(sender),
            total_volume: 0,
            total_games: 0,
            house_wins: 0,
            player_wins: 0,
            extend_ref: object::generate_extend_ref(constructor_ref),
        });
    }

    // ======================== Write Functions ========================

    #[randomness]
    entry fun flip_coin_v1(
        player: &signer,
        bet_amount_index: u64,
        player_choice: u8, // 0 = heads, 1 = tails
    ) acquires HouseData, GameResult {
        // Validate inputs
        assert!(bet_amount_index < vector::length(&BET_AMOUNTS), E_INVALID_BET_INDEX);
        assert!(player_choice <= 1, E_INVALID_BET_INDEX);

        let player_addr = signer::address_of(player);
        let bet_amount = *vector::borrow(&BET_AMOUNTS, bet_amount_index);
        let fee = (bet_amount * FEE_PERCENTAGE) / BASIS_POINTS;
        let total_cost = bet_amount + fee;

        // Check player has enough balance
        assert!(coin::balance<AptosCoin>(player_addr) >= total_cost, E_INSUFFICIENT_BALANCE);

        let house_data = borrow_global_mut<HouseData>(get_house_address());
        
        // Check house has enough funds for potential payout
        let potential_payout = bet_amount * 2; // Double or nothing
        assert!(coin::value(&house_data.house_funds) >= potential_payout, E_HOUSE_INSUFFICIENT_FUNDS);

        // Generate random coin flip result
        let coin_result = randomness::u8_range(0, 2); // 0 or 1

        // Collect payment from player
        let payment = coin::withdraw<AptosCoin>(player, total_cost);
        
        // Add fee to house funds
        let fee_coin = coin::extract(&mut payment, fee);
        coin::merge(&mut house_data.house_funds, fee_coin);
        
        let won = coin_result == player_choice;
        let payout = if (won) {
            // Player wins - pay out double, return bet amount
            let winnings = coin::extract(&mut house_data.house_funds, bet_amount);
            coin::merge(&mut payment, winnings);
            let total_payout = coin::value(&payment);
            coin::deposit(player_addr, payment);
            house_data.player_wins = house_data.player_wins + 1;
            total_payout
        } else {
            // House wins - keep the bet amount
            coin::merge(&mut house_data.house_funds, payment);
            house_data.house_wins = house_data.house_wins + 1;
            0
        };

        // Update statistics
        house_data.total_volume = house_data.total_volume + bet_amount;
        house_data.total_games = house_data.total_games + 1;
        let game_id = house_data.total_games;

        // Remove existing game result if it exists
        if (exists<GameResult>(player_addr)) {
            let GameResult { player: _, bet_amount: _, player_choice: _, coin_result: _, won: _, payout: _, timestamp: _, game_id: _ } = move_from<GameResult>(player_addr);
        };

        // Store new game result
        let game_result = GameResult {
            player: player_addr,
            bet_amount,
            player_choice,
            coin_result,
            won,
            payout,
            timestamp: timestamp::now_seconds(),
            game_id,
        };
        move_to(player, game_result);

        // Emit event
        event::emit(FlipzyyyFlipEvent {
            player: player_addr,
            bet_amount,
            player_choice,
            coin_result,
            won,
            payout,
            game_id,
        });
    }

    #[randomness]
    entry fun flip_coin_degen_v1(
        player: &signer,
        bet_amount_index1: u64,
        player_choice1: u8,
        bet_amount_index2: u64,
        player_choice2: u8,
    ) acquires HouseData, DegenGameResult {
        // Validate inputs
        assert!(bet_amount_index1 < vector::length(&BET_AMOUNTS), E_INVALID_BET_INDEX);
        assert!(bet_amount_index2 < vector::length(&BET_AMOUNTS), E_INVALID_BET_INDEX);
        assert!(player_choice1 <= 1, E_INVALID_BET_INDEX);
        assert!(player_choice2 <= 1, E_INVALID_BET_INDEX);

        let player_addr = signer::address_of(player);
        let bet_amount1 = *vector::borrow(&BET_AMOUNTS, bet_amount_index1);
        let bet_amount2 = *vector::borrow(&BET_AMOUNTS, bet_amount_index2);
        
        let fee1 = (bet_amount1 * FEE_PERCENTAGE) / BASIS_POINTS;
        let fee2 = (bet_amount2 * FEE_PERCENTAGE) / BASIS_POINTS;
        let total_cost = bet_amount1 + fee1 + bet_amount2 + fee2;

        // Check player has enough balance
        assert!(coin::balance<AptosCoin>(player_addr) >= total_cost, E_INSUFFICIENT_BALANCE);

        let house_data = borrow_global_mut<HouseData>(get_house_address());
        
        // Check house has enough funds for potential payout (worst case: both wins)
        let max_potential_payout = bet_amount1 * 2 + bet_amount2 * 2;
        assert!(coin::value(&house_data.house_funds) >= max_potential_payout, E_HOUSE_INSUFFICIENT_FUNDS);

        // Generate random coin flip results
        let coin_result1 = randomness::u8_range(0, 2);
        let coin_result2 = randomness::u8_range(0, 2);

        // Collect payment from player
        let payment = coin::withdraw<AptosCoin>(player, total_cost);
        
        // Add fees to house funds
        let total_fee = fee1 + fee2;
        let fee_coin = coin::extract(&mut payment, total_fee);
        coin::merge(&mut house_data.house_funds, fee_coin);

        // Calculate wins
        let won1 = coin_result1 == player_choice1;
        let won2 = coin_result2 == player_choice2;
        let games_won = (if (won1) 1 else 0) + (if (won2) 1 else 0);

        let total_payout = if (won1 && won2) {
            // Both wins - pay out double for both
            let winnings1 = coin::extract(&mut house_data.house_funds, bet_amount1);
            let winnings2 = coin::extract(&mut house_data.house_funds, bet_amount2);
            coin::merge(&mut payment, winnings1);
            coin::merge(&mut payment, winnings2);
            let payout = coin::value(&payment);
            coin::deposit(player_addr, payment);
            house_data.player_wins = house_data.player_wins + 2;
            payout
        } else if (won1) {
            // First flip wins - pay out double for first, house keeps second bet
            let winnings = coin::extract(&mut house_data.house_funds, bet_amount1);
            coin::merge(&mut payment, winnings);
            let bet2_coin = coin::extract(&mut payment, bet_amount2);
            coin::merge(&mut house_data.house_funds, bet2_coin);
            let payout = coin::value(&payment);
            coin::deposit(player_addr, payment);
            house_data.player_wins = house_data.player_wins + 1;
            house_data.house_wins = house_data.house_wins + 1;
            payout
        } else if (won2) {
            // Second flip wins - pay out double for second, house keeps first bet
            let winnings = coin::extract(&mut house_data.house_funds, bet_amount2);
            coin::merge(&mut payment, winnings);
            let bet1_coin = coin::extract(&mut payment, bet_amount1);
            coin::merge(&mut house_data.house_funds, bet1_coin);
            let payout = coin::value(&payment);
            coin::deposit(player_addr, payment);
            house_data.player_wins = house_data.player_wins + 1;
            house_data.house_wins = house_data.house_wins + 1;
            payout
        } else {
            // Both lose - house keeps all bets
            coin::merge(&mut house_data.house_funds, payment);
            house_data.house_wins = house_data.house_wins + 2;
            0
        };

        // Update statistics
        house_data.total_volume = house_data.total_volume + bet_amount1 + bet_amount2;
        house_data.total_games = house_data.total_games + 1; // Degen mode counts as 1 game with 2 flips
        let game_id = house_data.total_games;

        // Remove existing degen game result if it exists
        if (exists<DegenGameResult>(player_addr)) {
            let DegenGameResult { 
                player: _, 
                bet_amount1: _, 
                player_choice1: _, 
                coin_result1: _, 
                bet_amount2: _, 
                player_choice2: _, 
                coin_result2: _, 
                games_won: _, 
                total_payout: _, 
                timestamp: _, 
                game_id: _ 
            } = move_from<DegenGameResult>(player_addr);
        };

        // Store game result
        let degen_result = DegenGameResult {
            player: player_addr,
            bet_amount1,
            player_choice1,
            coin_result1,
            bet_amount2,
            player_choice2,
            coin_result2,
            games_won,
            total_payout,
            timestamp: timestamp::now_seconds(),
            game_id,
        };
        move_to(player, degen_result);

        // Emit event
        event::emit(FlipzyyyDoubleFlipEvent {
            player: player_addr,
            bet_amount1,
            player_choice1,
            coin_result1,
            bet_amount2,
            player_choice2,
            coin_result2,
            games_won,
            total_payout,
            game_id,
        });
    }

    #[randomness]
    entry fun flip_coin_whale_v1(
        player: &signer,
        bet_amount_index: u64,
        player_choice: u8, // 0 = heads, 1 = tails
    ) acquires HouseData, GameResult {
        // Validate inputs
        assert!(bet_amount_index < vector::length(&WHALE_BET_AMOUNTS), E_INVALID_BET_INDEX);
        assert!(player_choice <= 1, E_INVALID_BET_INDEX);

        let player_addr = signer::address_of(player);
        let bet_amount = *vector::borrow(&WHALE_BET_AMOUNTS, bet_amount_index);
        let fee = (bet_amount * FEE_PERCENTAGE) / BASIS_POINTS;
        let total_cost = bet_amount + fee;

        // Check player has enough balance
        assert!(coin::balance<AptosCoin>(player_addr) >= total_cost, E_INSUFFICIENT_BALANCE);

        let house_data = borrow_global_mut<HouseData>(get_house_address());
        
        // Check house has enough funds for potential payout
        let potential_payout = bet_amount * 2; // Double or nothing
        assert!(coin::value(&house_data.house_funds) >= potential_payout, E_HOUSE_INSUFFICIENT_FUNDS);

        // Generate random coin flip result
        let coin_result = randomness::u8_range(0, 2); // 0 or 1

        // Collect payment from player
        let payment = coin::withdraw<AptosCoin>(player, total_cost);
        
        // Add fee to house funds
        let fee_coin = coin::extract(&mut payment, fee);
        coin::merge(&mut house_data.house_funds, fee_coin);
        
        let won = coin_result == player_choice;
        let payout = if (won) {
            // Player wins - pay out double, return bet amount
            let winnings = coin::extract(&mut house_data.house_funds, bet_amount);
            coin::merge(&mut payment, winnings);
            let total_payout = coin::value(&payment);
            coin::deposit(player_addr, payment);
            house_data.player_wins = house_data.player_wins + 1;
            total_payout
        } else {
            // House wins - keep the bet amount
            coin::merge(&mut house_data.house_funds, payment);
            house_data.house_wins = house_data.house_wins + 1;
            0
        };

        // Update statistics
        house_data.total_volume = house_data.total_volume + bet_amount;
        house_data.total_games = house_data.total_games + 1;
        let game_id = house_data.total_games;

        // Remove existing game result if it exists
        if (exists<GameResult>(player_addr)) {
            let GameResult { player: _, bet_amount: _, player_choice: _, coin_result: _, won: _, payout: _, timestamp: _, game_id: _ } = move_from<GameResult>(player_addr);
        };

        // Store new game result
        let game_result = GameResult {
            player: player_addr,
            bet_amount,
            player_choice,
            coin_result,
            won,
            payout,
            timestamp: timestamp::now_seconds(),
            game_id,
        };
        move_to(player, game_result);

        // Emit event
        event::emit(FlipzyyyFlipEvent {
            player: player_addr,
            bet_amount,
            player_choice,
            coin_result,
            won,
            payout,
            game_id,
        });
    }

    // ======================== House Management Functions ========================

    public entry fun deposit_house_funds_v1(
        owner: &signer,
        amount: u64,
    ) acquires HouseData {
        let house_data = borrow_global_mut<HouseData>(get_house_address());
        assert!(signer::address_of(owner) == house_data.owner, E_UNAUTHORIZED);
        
        let deposit = coin::withdraw<AptosCoin>(owner, amount);
        coin::merge(&mut house_data.house_funds, deposit);
        
        event::emit(HouseFundsDeposited {
            amount,
            new_balance: coin::value(&house_data.house_funds),
        });
    }

    public entry fun withdraw_house_funds_v1(
        owner: &signer,
        amount: u64,
    ) acquires HouseData {
        let house_data = borrow_global_mut<HouseData>(get_house_address());
        assert!(signer::address_of(owner) == house_data.owner, E_UNAUTHORIZED);
        assert!(coin::value(&house_data.house_funds) >= amount, E_INSUFFICIENT_BALANCE);
        
        let withdrawal = coin::extract(&mut house_data.house_funds, amount);
        coin::deposit(signer::address_of(owner), withdrawal);
        
        event::emit(HouseFundsWithdrawn {
            amount,
            new_balance: coin::value(&house_data.house_funds),
        });
    }

    public entry fun transfer_ownership_v1(
        current_owner: &signer,
        new_owner: address,
    ) acquires HouseData {
        let house_data = borrow_global_mut<HouseData>(get_house_address());
        assert!(signer::address_of(current_owner) == house_data.owner, E_UNAUTHORIZED);
        house_data.owner = new_owner;
    }

    // ======================== View Functions ========================

    #[view]
    public fun get_house_balance_v1(): u64 acquires HouseData {
        let house_data = borrow_global<HouseData>(get_house_address());
        coin::value(&house_data.house_funds)
    }

    #[view]
    public fun get_house_stats_v1(): (u64, u64, u64, u64) acquires HouseData {
        let house_data = borrow_global<HouseData>(get_house_address());
        (house_data.total_volume, house_data.total_games, house_data.house_wins, house_data.player_wins)
    }

    #[view]
    public fun get_house_owner_v1(): address acquires HouseData {
        let house_data = borrow_global<HouseData>(get_house_address());
        house_data.owner
    }

    #[view]
    public fun get_bet_amounts_v1(): vector<u64> {
        BET_AMOUNTS
    }

    #[view]
    public fun get_whale_bet_amounts_v1(): vector<u64> {
        WHALE_BET_AMOUNTS
    }

    #[view]
    public fun get_fee_percentage_v1(): u64 {
        FEE_PERCENTAGE
    }

    #[view]
    public fun calculate_total_cost_v1(bet_amount_index: u64): u64 {
        assert!(bet_amount_index < vector::length(&BET_AMOUNTS), E_INVALID_BET_INDEX);
        let bet_amount = *vector::borrow(&BET_AMOUNTS, bet_amount_index);
        let fee = (bet_amount * FEE_PERCENTAGE) / BASIS_POINTS;
        bet_amount + fee
    }

    #[view]
    public fun calculate_whale_total_cost_v1(bet_amount_index: u64): u64 {
        assert!(bet_amount_index < vector::length(&WHALE_BET_AMOUNTS), E_INVALID_BET_INDEX);
        let bet_amount = *vector::borrow(&WHALE_BET_AMOUNTS, bet_amount_index);
        let fee = (bet_amount * FEE_PERCENTAGE) / BASIS_POINTS;
        bet_amount + fee
    }

    #[view]
    public fun get_last_game_result_v1(player: address): (u64, u8, u8, bool, u64, u64) acquires GameResult {
        assert!(exists<GameResult>(player), E_GAME_NOT_FOUND);
        let result = borrow_global<GameResult>(player);
        (result.bet_amount, result.player_choice, result.coin_result, result.won, result.payout, result.timestamp)
    }

    #[view]
    public fun get_last_degen_result_v1(player: address): (u64, u8, u8, u64, u8, u8, u8, u64, u64) acquires DegenGameResult {
        assert!(exists<DegenGameResult>(player), E_GAME_NOT_FOUND);
        let result = borrow_global<DegenGameResult>(player);
        (result.bet_amount1, result.player_choice1, result.coin_result1, 
         result.bet_amount2, result.player_choice2, result.coin_result2,
         result.games_won, result.total_payout, result.timestamp)
    }

    // ======================== Helper Functions ========================

    fun get_house_address(): address {
        object::create_object_address(&@coinflip_addr, HOUSE_OBJECT_SEED)
    }

    // ======================== Test Functions ========================

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    public fun test_bet_amounts(): vector<u64> {
        BET_AMOUNTS
    }
} 