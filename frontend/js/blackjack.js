const BLACKJACK_MIN_BET = 10;
const BLACKJACK_STARTING_CHIPS = 1000;
const DEAL_ANIMATION_DURATION = 460;
const DEAL_ANIMATION_STEP_DELAY = 120;
const CARD_WIDTH = 60;
const CARD_HEIGHT = 88;
const CARD_GAP = 10;

const blackjackState = {
    chips: 0,
    bet: 0,
    deck: [],
    playerHand: [],
    dealerHand: [],
    roundActive: false,
    isAnimating: false,
    dealerHoleCardHidden: false,
    message: 'Сделайте ставку и нажмите «Раздать».'
};

const cardsEl = {
    chips: document.getElementById('chips-value'),
    betInput: document.getElementById('bet-input'),
    dealBtn: document.getElementById('deal-btn'),
    hitBtn: document.getElementById('hit-btn'),
    standBtn: document.getElementById('stand-btn'),
    resetBtn: document.getElementById('reset-chips-btn'),
    deck: document.getElementById('deck-pile'),
    dealerCards: document.getElementById('dealer-cards'),
    playerCards: document.getElementById('player-cards'),
    dealerScore: document.getElementById('dealer-score'),
    playerScore: document.getElementById('player-score'),
    message: document.getElementById('game-message')
};

document.addEventListener('DOMContentLoaded', initBlackjack);

async function initBlackjack() {
    await checkAuth();
    loadChips();
    bindBlackjackEvents();
    renderBlackjack();
}

function bindBlackjackEvents() {
    cardsEl.dealBtn.addEventListener('click', () => {
        void startRound();
    });
    cardsEl.hitBtn.addEventListener('click', () => {
        void hitCard();
    });
    cardsEl.standBtn.addEventListener('click', () => {
        void standRound();
    });
    cardsEl.resetBtn.addEventListener('click', resetChips);
}

function getChipsStorageKey() {
    if (currentUser?.id) {
        return `blackjack_chips_user_${currentUser.id}`;
    }
    return 'blackjack_chips_guest';
}

function loadChips() {
    const raw = localStorage.getItem(getChipsStorageKey());
    const parsed = Number.parseInt(raw, 10);
    blackjackState.chips = Number.isFinite(parsed) && parsed >= 0 ? parsed : BLACKJACK_STARTING_CHIPS;
}

function saveChips() {
    localStorage.setItem(getChipsStorageKey(), String(blackjackState.chips));
}

function createDeck() {
    const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const values = {
        A: 11,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        J: 10,
        Q: 10,
        K: 10
    };

    const deck = [];
    suits.forEach((suit) => {
        ranks.forEach((rank) => {
            deck.push({
                rank,
                suit,
                value: values[rank]
            });
        });
    });

    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function drawCard() {
    return blackjackState.deck.pop();
}

function getHandValue(hand) {
    let total = hand.reduce((sum, card) => sum + card.value, 0);
    let aceCount = hand.filter((card) => card.rank === 'A').length;

    while (total > 21 && aceCount > 0) {
        total -= 10;
        aceCount -= 1;
    }

    return total;
}

function isBlackjack(hand) {
    return hand.length === 2 && getHandValue(hand) === 21;
}

async function startRound() {
    if (blackjackState.roundActive || blackjackState.isAnimating) {
        return;
    }

    const bet = Number.parseInt(cardsEl.betInput.value, 10);
    if (!Number.isFinite(bet) || bet < BLACKJACK_MIN_BET) {
        setGameMessage(`Минимальная ставка: ${BLACKJACK_MIN_BET} фишек.`, 'warning');
        return;
    }

    if (bet % 10 !== 0) {
        setGameMessage('Ставка должна быть кратна 10 фишкам.', 'warning');
        return;
    }

    if (bet > blackjackState.chips) {
        setGameMessage('Недостаточно фишек для такой ставки.', 'error');
        return;
    }

    blackjackState.bet = bet;
    blackjackState.chips -= bet;
    blackjackState.deck = createDeck();
    blackjackState.playerHand = [];
    blackjackState.dealerHand = [];
    blackjackState.roundActive = true;
    blackjackState.isAnimating = true;
    blackjackState.dealerHoleCardHidden = true;

    saveChips();
    setGameMessage('Раздача карт...');
    renderBlackjack();

    await dealCardToHand('playerHand', cardsEl.playerCards, true);
    await dealCardToHand('dealerHand', cardsEl.dealerCards, true);
    await dealCardToHand('playerHand', cardsEl.playerCards, true);
    await dealCardToHand('dealerHand', cardsEl.dealerCards, false);

    blackjackState.isAnimating = false;
    setGameMessage('Раунд начался. Ваш ход.');
    renderBlackjack();

    if (isBlackjack(blackjackState.playerHand) || isBlackjack(blackjackState.dealerHand)) {
        finishRoundByBlackjack();
    }
}

async function hitCard() {
    if (!blackjackState.roundActive || blackjackState.isAnimating) {
        return;
    }

    blackjackState.isAnimating = true;
    renderBlackjack();
    await dealCardToHand('playerHand', cardsEl.playerCards, true);
    blackjackState.isAnimating = false;
    renderBlackjack();

    const playerTotal = getHandValue(blackjackState.playerHand);
    if (playerTotal > 21) {
        endRound('Перебор! Победил дилер.', 'error');
        return;
    }

    if (playerTotal === 21) {
        await standRound();
    }
}

async function standRound() {
    if (!blackjackState.roundActive || blackjackState.isAnimating) {
        return;
    }

    blackjackState.isAnimating = true;
    blackjackState.dealerHoleCardHidden = false;
    setGameMessage('Ход дилера...');
    renderBlackjack();
    await wait(220);

    while (getHandValue(blackjackState.dealerHand) < 17) {
        await dealCardToHand('dealerHand', cardsEl.dealerCards, true);
    }

    blackjackState.isAnimating = false;

    const playerTotal = getHandValue(blackjackState.playerHand);
    const dealerTotal = getHandValue(blackjackState.dealerHand);

    if (dealerTotal > 21 || playerTotal > dealerTotal) {
        blackjackState.chips += blackjackState.bet * 2;
        saveChips();
        endRound('Вы выиграли!', 'success');
        return;
    }

    if (playerTotal === dealerTotal) {
        blackjackState.chips += blackjackState.bet;
        saveChips();
        endRound('Ничья. Ставка возвращена.', 'info');
        return;
    }

    endRound('Победил дилер.', 'error');
}

function finishRoundByBlackjack() {
    blackjackState.dealerHoleCardHidden = false;
    renderBlackjack();

    const playerBj = isBlackjack(blackjackState.playerHand);
    const dealerBj = isBlackjack(blackjackState.dealerHand);

    if (playerBj && dealerBj) {
        blackjackState.chips += blackjackState.bet;
        saveChips();
        endRound('Ничья: у обоих блэкджек.', 'info');
        return;
    }

    if (playerBj) {
        blackjackState.chips += blackjackState.bet * 2.5;
        saveChips();
        endRound('Блэкджек! Выплата 3:2.', 'success');
        return;
    }

    endRound('У дилера блэкджек.', 'error');
}

function endRound(message, toastType) {
    blackjackState.roundActive = false;
    blackjackState.isAnimating = false;
    blackjackState.dealerHoleCardHidden = false;
    setGameMessage(message, toastType);
    renderBlackjack();
}

function setGameMessage(message, toastType) {
    blackjackState.message = message;
    if (cardsEl.message) {
        cardsEl.message.textContent = message;
    }
    if (toastType && typeof showToast === 'function') {
        showToast(message, toastType);
    }
}

function resetChips() {
    if (blackjackState.roundActive || blackjackState.isAnimating) {
        setGameMessage('Сначала завершите текущий раунд.', 'warning');
        return;
    }

    blackjackState.chips = BLACKJACK_STARTING_CHIPS;
    saveChips();
    setGameMessage(`Фишки сброшены до ${BLACKJACK_STARTING_CHIPS}.`, 'success');
    renderBlackjack();
}

async function dealCardToHand(handKey, targetContainer, revealCard) {
    const card = drawCard();
    if (!card) {
        return;
    }

    await animateCardFromDeck(targetContainer, card, revealCard);
    blackjackState[handKey].push(card);
    renderBlackjack();
    await wait(DEAL_ANIMATION_STEP_DELAY);
}

async function animateCardFromDeck(targetContainer, card, revealCard) {
    if (!cardsEl.deck || !targetContainer) {
        return;
    }

    const deckRect = cardsEl.deck.getBoundingClientRect();
    const targetRect = targetContainer.getBoundingClientRect();
    const targetIndex = targetContainer.children.length;

    const startLeft = deckRect.left + (deckRect.width - CARD_WIDTH) / 2;
    const startTop = deckRect.top + (deckRect.height - CARD_HEIGHT) / 2;
    const rawTargetLeft = targetRect.left + targetIndex * (CARD_WIDTH + CARD_GAP);
    const maxTargetLeft = Math.max(targetRect.left, targetRect.right - CARD_WIDTH);
    const targetLeft = Math.min(rawTargetLeft, maxTargetLeft);
    const targetTop = targetRect.top;

    const flyingCard = createFlyingCard(card);
    flyingCard.style.left = `${startLeft}px`;
    flyingCard.style.top = `${startTop}px`;

    document.body.appendChild(flyingCard);
    cardsEl.deck.classList.add('is-animating');

    const deltaX = targetLeft - startLeft;
    const deltaY = targetTop - startTop;

    await nextFrame();
    const moveAnimation = flyingCard.animate(
        [
            { transform: 'translate(0px, 0px) rotate(-10deg) scale(0.94)' },
            { transform: `translate(${deltaX}px, ${deltaY}px) rotate(0deg) scale(1)` }
        ],
        {
            duration: DEAL_ANIMATION_DURATION,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            fill: 'forwards'
        }
    );

    if (revealCard) {
        setTimeout(() => {
            flyingCard.classList.add('is-flipped');
        }, Math.floor(DEAL_ANIMATION_DURATION * 0.45));
    }

    try {
        await moveAnimation.finished;
    } catch (_) {
        // Ignore animation cancellation and continue cleanup.
    }

    flyingCard.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    await wait(40);
    flyingCard.remove();
    cardsEl.deck.classList.remove('is-animating');
}

function createFlyingCard(card) {
    const isRed = card.suit === '\u2665' || card.suit === '\u2666';
    const el = document.createElement('div');
    el.className = 'flying-card';
    el.innerHTML = `
        <div class="flying-card-inner">
            <div class="flying-card-face flying-card-back"></div>
            <div class="flying-card-face flying-card-front ${isRed ? 'red' : ''}">
                <span>${card.rank}${card.suit}</span>
                <span class="bottom">${card.rank}${card.suit}</span>
            </div>
        </div>
    `;
    return el;
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function nextFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

function renderCards(container, hand, hideSecondCard) {
    container.innerHTML = hand.map((card, index) => {
        if (hideSecondCard && index === 1) {
            return '<div class="playing-card hidden"></div>';
        }

        const isRed = card.suit === '\u2665' || card.suit === '\u2666';
        return `
            <div class="playing-card ${isRed ? 'red' : ''}">
                <span>${card.rank}${card.suit}</span>
                <span class="bottom">${card.rank}${card.suit}</span>
            </div>
        `;
    }).join('');
}

function renderBlackjack() {
    const hideDealerSecondCard = blackjackState.dealerHoleCardHidden;
    renderCards(cardsEl.dealerCards, blackjackState.dealerHand, hideDealerSecondCard);
    renderCards(cardsEl.playerCards, blackjackState.playerHand, false);

    cardsEl.chips.textContent = formatChipValue(blackjackState.chips);

    const dealerVisibleScore = blackjackState.dealerHand[0]
        ? blackjackState.dealerHand[0].value
        : 0;

    cardsEl.dealerScore.textContent = hideDealerSecondCard
        ? `${dealerVisibleScore} + ?`
        : getHandValue(blackjackState.dealerHand);
    cardsEl.playerScore.textContent = getHandValue(blackjackState.playerHand);
    cardsEl.message.textContent = blackjackState.message;

    const controlsLocked = blackjackState.isAnimating;
    cardsEl.dealBtn.disabled = blackjackState.roundActive || controlsLocked || blackjackState.chips < BLACKJACK_MIN_BET;
    cardsEl.hitBtn.disabled = !blackjackState.roundActive || controlsLocked;
    cardsEl.standBtn.disabled = !blackjackState.roundActive || controlsLocked;
    cardsEl.resetBtn.disabled = controlsLocked;
    cardsEl.betInput.disabled = blackjackState.roundActive || controlsLocked;
}

function formatChipValue(chips) {
    if (!Number.isFinite(chips)) {
        return '0';
    }
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(chips);
}
