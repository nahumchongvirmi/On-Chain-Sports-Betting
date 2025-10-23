(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_EVENT_NOT_FOUND (err u101))
(define-constant ERR_EVENT_ENDED (err u102))
(define-constant ERR_EVENT_NOT_ENDED (err u103))
(define-constant ERR_INVALID_OUTCOME (err u104))
(define-constant ERR_INSUFFICIENT_FUNDS (err u105))
(define-constant ERR_ORACLE_NOT_AUTHORIZED (err u106))
(define-constant ERR_EVENT_ALREADY_RESOLVED (err u107))
(define-constant ERR_NO_BET_FOUND (err u108))
(define-constant ERR_ALREADY_CLAIMED (err u109))
(define-constant ERR_INVALID_EVENT_ID (err u110))
(define-constant ERR_EVENT_CANCELLED (err u111))
(define-constant ERR_CANNOT_CANCEL_RESOLVED (err u112))
(define-constant PROTOCOL_FEE_PERCENTAGE u3)

(define-data-var next-event-id uint u1)
(define-data-var protocol-fees uint u0)

(define-map events uint {
    creator: principal,
    description: (string-ascii 256),
    end-block: uint,
    oracle: principal,
    outcome: (optional uint),
    total-pool: uint,
    resolved: bool,
    outcome-count: uint,
    cancelled: bool
})

(define-map event-outcomes { event-id: uint, outcome: uint } {
    total-staked: uint,
    bettors: uint
})

(define-map user-bets { user: principal, event-id: uint, outcome: uint } {
    amount: uint,
    claimed: bool
})

(define-map oracles principal bool)

(define-read-only (get-event (event-id uint))
    (map-get? events event-id)
)

(define-read-only (get-event-outcome (event-id uint) (outcome uint))
    (map-get? event-outcomes { event-id: event-id, outcome: outcome })
)

(define-read-only (get-user-bet (user principal) (event-id uint) (outcome uint))
    (map-get? user-bets { user: user, event-id: event-id, outcome: outcome })
)

(define-read-only (is-oracle-authorized (oracle principal))
    (default-to false (map-get? oracles oracle))
)

(define-read-only (get-protocol-fees)
    (var-get protocol-fees)
)

(define-read-only (get-next-event-id)
    (var-get next-event-id)
)

(define-public (authorize-oracle (oracle principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
        (map-set oracles oracle true)
        (ok true)
    )
)

(define-public (revoke-oracle (oracle principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
        (map-delete oracles oracle)
        (ok true)
    )
)

(define-public (create-event (description (string-ascii 256)) (end-block uint) (oracle principal) (outcome-count uint))
    (let (
        (event-id (var-get next-event-id))
        (current-block stacks-block-height)
    )
        (asserts! (> end-block current-block) ERR_EVENT_ENDED)
        (asserts! (is-oracle-authorized oracle) ERR_ORACLE_NOT_AUTHORIZED)
        (asserts! (> outcome-count u0) ERR_INVALID_OUTCOME)
        
        (map-set events event-id {
            creator: tx-sender,
            description: description,
            end-block: end-block,
            oracle: oracle,
            outcome: none,
            total-pool: u0,
            resolved: false,
            outcome-count: outcome-count,
            cancelled: false
        })
        
        (var-set next-event-id (+ event-id u1))
        (ok event-id)
    )
)

(define-public (place-bet (event-id uint) (outcome uint))
    (let (
        (bet-amount (stx-get-balance tx-sender))
        (event-data (unwrap! (map-get? events event-id) ERR_EVENT_NOT_FOUND))
        (current-block stacks-block-height)
        (outcome-data (default-to { total-staked: u0, bettors: u0 } 
                      (map-get? event-outcomes { event-id: event-id, outcome: outcome })))
        (existing-bet (map-get? user-bets { user: tx-sender, event-id: event-id, outcome: outcome }))
    )
        (asserts! (< current-block (get end-block event-data)) ERR_EVENT_ENDED)
        (asserts! (not (get resolved event-data)) ERR_EVENT_ALREADY_RESOLVED)
        (asserts! (not (get cancelled event-data)) ERR_EVENT_CANCELLED)
        (asserts! (< outcome (get outcome-count event-data)) ERR_INVALID_OUTCOME)
        (asserts! (> bet-amount u0) ERR_INSUFFICIENT_FUNDS)
        (asserts! (is-none existing-bet) ERR_ALREADY_CLAIMED)
        
        (try! (stx-transfer? bet-amount tx-sender (as-contract tx-sender)))
        
        (map-set event-outcomes { event-id: event-id, outcome: outcome } {
            total-staked: (+ (get total-staked outcome-data) bet-amount),
            bettors: (+ (get bettors outcome-data) u1)
        })
        
        (map-set user-bets { user: tx-sender, event-id: event-id, outcome: outcome } {
            amount: bet-amount,
            claimed: false
        })
        
        (map-set events event-id 
            (merge event-data { total-pool: (+ (get total-pool event-data) bet-amount) })
        )
        
        (ok true)
    )
)

(define-public (resolve-event (event-id uint) (winning-outcome uint))
    (let (
        (event-data (unwrap! (map-get? events event-id) ERR_EVENT_NOT_FOUND))
        (current-block stacks-block-height)
    )
        (asserts! (is-eq tx-sender (get oracle event-data)) ERR_ORACLE_NOT_AUTHORIZED)
        (asserts! (>= current-block (get end-block event-data)) ERR_EVENT_NOT_ENDED)
        (asserts! (not (get resolved event-data)) ERR_EVENT_ALREADY_RESOLVED)
        (asserts! (not (get cancelled event-data)) ERR_EVENT_CANCELLED)
        (asserts! (< winning-outcome (get outcome-count event-data)) ERR_INVALID_OUTCOME)
        
        (let (
            (total-pool (get total-pool event-data))
            (protocol-fee (/ (* total-pool PROTOCOL_FEE_PERCENTAGE) u100))
        )
            (var-set protocol-fees (+ (var-get protocol-fees) protocol-fee))
            
            (map-set events event-id 
                (merge event-data { 
                    outcome: (some winning-outcome), 
                    resolved: true 
                })
            )
            
            (ok true)
        )
    )
)

(define-public (claim-winnings (event-id uint) (outcome uint))
    (let (
        (event-data (unwrap! (map-get? events event-id) ERR_EVENT_NOT_FOUND))
        (user-bet (unwrap! (map-get? user-bets { user: tx-sender, event-id: event-id, outcome: outcome }) ERR_NO_BET_FOUND))
        (winning-outcome (unwrap! (get outcome event-data) ERR_EVENT_NOT_ENDED))
    )
        (asserts! (get resolved event-data) ERR_EVENT_NOT_ENDED)
        (asserts! (not (get cancelled event-data)) ERR_EVENT_CANCELLED)
        (asserts! (not (get claimed user-bet)) ERR_ALREADY_CLAIMED)
        (asserts! (is-eq outcome winning-outcome) ERR_INVALID_OUTCOME)
        
        (let (
            (total-pool (get total-pool event-data))
            (protocol-fee (/ (* total-pool PROTOCOL_FEE_PERCENTAGE) u100))
            (prize-pool (- total-pool protocol-fee))
            (winning-outcome-data (unwrap! (map-get? event-outcomes { event-id: event-id, outcome: winning-outcome }) ERR_INVALID_OUTCOME))
            (winning-total (get total-staked winning-outcome-data))
            (user-share (/ (* prize-pool (get amount user-bet)) winning-total))
        )
            (map-set user-bets { user: tx-sender, event-id: event-id, outcome: outcome }
                (merge user-bet { claimed: true })
            )
            
            (as-contract (try! (stx-transfer? user-share tx-sender tx-sender)))
            (ok user-share)
        )
    )
)

(define-public (withdraw-protocol-fees)
    (let (
        (current-fees (var-get protocol-fees))
    )
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
        (asserts! (> current-fees u0) ERR_INSUFFICIENT_FUNDS)
        
        (var-set protocol-fees u0)
        (as-contract (try! (stx-transfer? current-fees tx-sender CONTRACT_OWNER)))
        (ok current-fees)
    )
)

(define-public (cancel-event (event-id uint))
    (let (
        (event-data (unwrap! (map-get? events event-id) ERR_EVENT_NOT_FOUND))
        (caller-is-owner (is-eq tx-sender CONTRACT_OWNER))
        (caller-is-oracle (is-eq tx-sender (get oracle event-data)))
    )
        (asserts! (or caller-is-owner caller-is-oracle) ERR_UNAUTHORIZED)
        (asserts! (not (get resolved event-data)) ERR_CANNOT_CANCEL_RESOLVED)
        (asserts! (not (get cancelled event-data)) ERR_EVENT_CANCELLED)
        
        (map-set events event-id 
            (merge event-data { cancelled: true })
        )
        
        (ok true)
    )
)

(define-public (claim-refund (event-id uint) (outcome uint))
    (let (
        (event-data (unwrap! (map-get? events event-id) ERR_EVENT_NOT_FOUND))
        (user-bet (unwrap! (map-get? user-bets { user: tx-sender, event-id: event-id, outcome: outcome }) ERR_NO_BET_FOUND))
    )
        (asserts! (get cancelled event-data) ERR_EVENT_NOT_FOUND)
        (asserts! (not (get claimed user-bet)) ERR_ALREADY_CLAIMED)
        
        (let (
            (refund-amount (get amount user-bet))
        )
            (map-set user-bets { user: tx-sender, event-id: event-id, outcome: outcome }
                (merge user-bet { claimed: true })
            )
            
            (as-contract (try! (stx-transfer? refund-amount tx-sender tx-sender)))
            (ok refund-amount)
        )
    )
)
