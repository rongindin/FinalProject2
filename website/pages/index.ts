import { send } from "clientUtilities";
import type { User } from "types";

type Card = {
  suit: string;
  rank: string;
  value: number;
};

let deck: Card[] = [];
let player: Card[] = [];
let dealer: Card[] = [];

let balance = 10000;
let bet = 0;

let gameStarted = false;
let hideDealerCard = true;

const userToken = localStorage.getItem("userToken");

if (userToken == null) {
  location.href = "login.html";
}

const user = await send<User | null>("getUser", userToken);

if (user == null) {
  localStorage.removeItem("userToken");
  location.href = "login.html";
}

const currentUser = user!;

const balanceText = document.getElementById("balance")!;
const betText = document.getElementById("currentBet")!;
const betInput = document.getElementById("betInput") as HTMLInputElement;

const dealerCards = document.getElementById("dealerCards")!;
const playerCards = document.getElementById("playerCards")!;

const dealerScore = document.getElementById("dealerScore")!;
const playerScore = document.getElementById("playerScore")!;
const message = document.getElementById("message")!;

const dealBtn = document.getElementById("dealBtn") as HTMLButtonElement;
const hitBtn = document.getElementById("hitBtn") as HTMLButtonElement;
const standBtn = document.getElementById("standBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

const usernameText = document.getElementById("usernameText")!;
const logoutBtn = document.getElementById("logoutBtn") as HTMLButtonElement;

const doubleBtn = document.getElementById("doubleBtn") as HTMLButtonElement | null;

usernameText.textContent = currentUser.name;

async function loadBalance(): Promise<void> {
  const savedBalance = await send<number | null>("getBalance", userToken);

  if (savedBalance != null) {
    balance = savedBalance;
  }

  updateScreen();
}

async function saveBalance(): Promise<void> {
  await send<boolean>("saveBalance", userToken, balance);
}

function makeDeck(): Card[] {
  const suits = ["♠", "♥", "♦", "♣"];

  const ranks = [
    ["A", 11],
    ["2", 2],
    ["3", 3],
    ["4", 4],
    ["5", 5],
    ["6", 6],
    ["7", 7],
    ["8", 8],
    ["9", 9],
    ["10", 10],
    ["J", 10],
    ["Q", 10],
    ["K", 10],
  ];

  const newDeck: Card[] = [];

  for (const suit of suits) {
    for (const rankInfo of ranks) {
      newDeck.push({
        suit: suit,
        rank: String(rankInfo[0]),
        value: Number(rankInfo[1]),
      });
    }
  }

  return shuffle(newDeck);
}

function shuffle(cards: Card[]): Card[] {
  for (let i = cards.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    const temp = cards[i];
    cards[i] = cards[randomIndex];
    cards[randomIndex] = temp;
  }

  return cards;
}

function draw(): Card {
  return deck.pop()!;
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += card.value;

    if (card.rank == "A") {
      aces++;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function showCard(card: Card, hidden = false): string {
  if (hidden) {
    return `
      <div class="card back">
        <span>?</span>
      </div>
    `;
  }

  let redClass = "";

  if (card.suit == "♥" || card.suit == "♦") {
    redClass = "red";
  }

  return `
    <div class="card ${redClass}">
      <span>${card.rank}${card.suit}</span>
      <span class="bottom">${card.rank}${card.suit}</span>
    </div>
  `;
}

function updateScreen(): void {
  balanceText.textContent = "$" + balance.toLocaleString();
  betText.textContent = "$" + bet.toLocaleString();

  playerCards.innerHTML = "";
  for (const card of player) {
    playerCards.innerHTML += showCard(card);
  }

  dealerCards.innerHTML = "";
  for (let i = 0; i < dealer.length; i++) {
    const shouldHide = hideDealerCard && i == 1;
    dealerCards.innerHTML += showCard(dealer[i], shouldHide);
  }

  if (player.length == 0) {
    playerScore.textContent = "";
  } else {
    playerScore.textContent = "— " + handValue(player);
  }

  if (dealer.length == 0) {
    dealerScore.textContent = "";
  } else if (hideDealerCard) {
    dealerScore.textContent = "— ?";
  } else {
    dealerScore.textContent = "— " + handValue(dealer);
  }

  dealBtn.disabled = gameStarted || balance <= 0;
  hitBtn.disabled = !gameStarted;
  standBtn.disabled = !gameStarted;
  betInput.disabled = gameStarted;

  if (doubleBtn != null) {
    doubleBtn.disabled = !gameStarted || player.length != 2 || balance < bet;
  }
}

function startGame(): void {
  bet = Number(betInput.value);

  if (bet <= 0) {
    message.textContent = "Enter a valid bet.";
    return;
  }

  if (bet > balance) {
    message.textContent = "You cannot bet more than your balance.";
    return;
  }

  deck = makeDeck();

  player = [draw(), draw()];
  dealer = [draw(), draw()];

  balance -= bet;
  gameStarted = true;
  hideDealerCard = true;

  message.textContent = "Hit or stand?";

  if (handValue(player) == 21) {
    endGame("blackjack");
    return;
  }

  updateScreen();
}

function hit(): void {
  player.push(draw());

  if (handValue(player) > 21) {
    endGame("lose");
  } else if (handValue(player) == 21) {
    stand();
  } else {
    message.textContent = "Hit or stand?";
    updateScreen();
  }
}

function stand(): void {
  hideDealerCard = false;

  while (handValue(dealer) < 17) {
    dealer.push(draw());
  }

  const playerTotal = handValue(player);
  const dealerTotal = handValue(dealer);

  if (dealerTotal > 21) {
    endGame("win");
  } else if (playerTotal > dealerTotal) {
    endGame("win");
  } else if (playerTotal < dealerTotal) {
    endGame("lose");
  } else {
    endGame("push");
  }
}

function doubleDown(): void {
  if (!gameStarted) {
    return;
  }

  if (player.length != 2) {
    return;
  }

  if (balance < bet) {
    message.textContent = "Not enough balance to double down.";
    return;
  }

  balance -= bet;
  bet *= 2;

  player.push(draw());

  if (handValue(player) > 21) {
    endGame("lose");
  } else {
    stand();
  }
}

function endGame(result: string): void {
  gameStarted = false;
  hideDealerCard = false;

  if (result == "blackjack") {
    balance += bet * 2.5;
    message.textContent = "Blackjack! You win!";
  }

  if (result == "win") {
    balance += bet * 2;
    message.textContent = "You win!";
  }

  if (result == "lose") {
    message.textContent = "You lose.";
  }

  if (result == "push") {
    balance += bet;
    message.textContent = "Push. Bet returned.";
  }

  bet = 0;

  if (balance <= 0) {
    message.textContent = "Game over. Press reset to start again.";
  }

  updateScreen();
  saveBalance();
}

function resetGame(): void {
  balance = 10000;
  bet = 0;

  player = [];
  dealer = [];

  gameStarted = false;
  hideDealerCard = true;

  message.textContent = "Balance reset. Place your bet and deal.";

  updateScreen();
  saveBalance();
}

dealBtn.onclick = startGame;
hitBtn.onclick = hit;
standBtn.onclick = stand;
resetBtn.onclick = resetGame;

logoutBtn.onclick = function () {
  localStorage.removeItem("userToken");
  location.href = "login.html";
};

if (doubleBtn != null) {
  doubleBtn.onclick = doubleDown;
}

loadBalance();