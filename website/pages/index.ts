import { send } from "clientUtilities";
import type { User, LeaderboardUser } from "types";
import type { Card } from "types";

/*
  A card has:
  - suit: heart, diamond, spade, or club
  - rank: A, 2, 3, J, Q, K, etc.
  - value: the number value used in Blackjack
*/

/* -----------------------------
   Game variables
----------------------------- */

let deck: Card[] = [];
let playerCardsList: Card[] = [];
let dealerCardsList: Card[] = [];

let balance = 10000;
let bet = 0;
let streak = 0;

let gameStarted = false;
let hideDealerSecondCard = true;

/* -----------------------------
   Login check
----------------------------- */

const userToken = localStorage.getItem("userToken");

if (userToken == null) {
  location.href = "login.html";
  throw new Error("User is not logged in.");
}

const user = await send<User | null>("getUser", userToken);

if (user == null) {
  localStorage.removeItem("userToken");
  location.href = "login.html";
  throw new Error("User token is not valid.");
}

const currentUser = user;

/* -----------------------------
   HTML elements
----------------------------- */

const balanceText = document.getElementById("balance")!;
const betText = document.getElementById("currentBet")!;
const winstreakText = document.getElementById("currentStreak")!;
const betInput = document.getElementById("betInput") as HTMLInputElement;

const dealerCardsDiv = document.getElementById("dealerCards")!;
const playerCardsDiv = document.getElementById("playerCards")!;

const dealerScoreText = document.getElementById("dealerScore")!;
const playerScoreText = document.getElementById("playerScore")!;
const messageText = document.getElementById("message")!;

const dealButton = document.getElementById("dealBtn") as HTMLButtonElement;
const hitButton = document.getElementById("hitBtn") as HTMLButtonElement;
const standButton = document.getElementById("standBtn") as HTMLButtonElement;
const resetButton = document.getElementById("resetBtn") as HTMLButtonElement;
const doubleButton = document.getElementById("doubleBtn") as HTMLButtonElement | null;
const allinButton = document.getElementById("allinBtn") as HTMLButtonElement;

const usernameText = document.getElementById("usernameText")!;
const logoutButton = document.getElementById("logoutBtn") as HTMLButtonElement;

const leaderboardList = document.getElementById("leaderboardList")!;
const refreshLeaderboardButton = document.getElementById("refreshLeaderboardBtn") as HTMLButtonElement;

const themeSelect = document.getElementById("themeSelect") as HTMLSelectElement;

usernameText.textContent = currentUser.name;

/* -----------------------------
   Theme functions
----------------------------- */

function loadTheme(): void {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme == null) {
    document.body.className = "theme-green";
    themeSelect.value = "theme-green";
    return;
  }

  document.body.className = savedTheme;
  themeSelect.value = savedTheme;
}

function saveTheme(): void {
  const selectedTheme = themeSelect.value;

  document.body.className = selectedTheme;
  localStorage.setItem("theme", selectedTheme);
}

const streakKey = "winstreak_" + currentUser.name;

async function loadStreak(): Promise<void> {
  const savedStreak = await send<number | null>("getStreak", userToken);

  if (savedStreak !== null) {
    streak = savedStreak;
  } else {
    streak = 0;
  }

  updateScreen();
}

async function saveStreak(): Promise<void> {
  await send<boolean>("saveStreak", userToken, streak);
}
/* -----------------------------
   Database functions
----------------------------- */

async function loadBalance(): Promise<void> {
  const savedBalance = await send<number | null>("getBalance", userToken);

  if (savedBalance != null) {
    balance = savedBalance;
  }
  
  updateScreen();
}

async function saveBalance(): Promise<void> {
  await send<boolean>("saveBalance", userToken, balance);
  await loadLeaderboard();
}

async function loadLeaderboard(): Promise<void> {
  const leaderboard = await send<LeaderboardUser[]>("getLeaderboard");

  leaderboardList.innerHTML = "";

  if (leaderboard.length == 0) {
    leaderboardList.textContent = "No players yet.";   
    return;
  }

  for (let index = 0; index < leaderboard.length; index++) {
    const leaderboardPlayer = leaderboard[index];

    let rowClass = "leaderboard-row";

    if (leaderboardPlayer.name == currentUser.name) {
      rowClass += " me";
    }

    leaderboardList.innerHTML += `
      <div class="${rowClass}">
        <div class="leaderboard-rank">#${index + 1}</div>
        <div class="leaderboard-name">${leaderboardPlayer.name}</div>
        <div class="leaderboard-balance">$${leaderboardPlayer.balance.toLocaleString()}  | |   Streak: ${leaderboardPlayer.streak.toLocaleString()}</div>
    `;
  }
}

/* -----------------------------
   Deck functions
----------------------------- */

function createDeck(): Card[] {
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
      const card: Card = {
        suit: suit,
        rank: String(rankInfo[0]),
        value: Number(rankInfo[1]),
      };

      newDeck.push(card);
    }
  }

  shuffleDeck(newDeck);

  return newDeck;
}

function shuffleDeck(cards: Card[]): void {
  for (let index = cards.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    const savedCard = cards[index];
    cards[index] = cards[randomIndex];
    cards[randomIndex] = savedCard;
  }
}

function drawCard(): Card {
  return deck.pop()!;
}

/* -----------------------------
   Blackjack score
----------------------------- */

function getHandValue(cards: Card[]): number {
  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    total += card.value;

    if (card.rank == "A") {
      aceCount++;
    }
  }

  /*
    Ace starts as 11.
    If the player is over 21, we change Ace from 11 to 1.
    That means we subtract 10.
  */
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  return total;
}

/* -----------------------------
   Card display
----------------------------- */

function createCardHtml(card: Card, isHidden = false): string {
  if (isHidden) {
    return `
      <div class="card back">
        <span>?</span>
      </div>
    `;
  }

  let colorClass = "";

  if (card.suit == "♥" || card.suit == "♦") {
    colorClass = "red";
  }

  return `
    <div class="card ${colorClass}">
      <span>${card.rank}${card.suit}</span>
      <span class="bottom">${card.rank}${card.suit}</span>
    </div>
  `;
}

/* -----------------------------
   Screen update
----------------------------- */

function updateScreen(): void {
  balanceText.textContent = "$" + balance.toLocaleString();
  betText.textContent = "$" + bet.toLocaleString();

  if(streak > 0)
  {
    winstreakText.textContent = streak.toLocaleString() + "🔥";
  }
  else{
    winstreakText.textContent = streak.toLocaleString();
  }

  showPlayerCards();
  showDealerCards();
  showScores();
  updateButtons();
}

function showPlayerCards(): void {
  playerCardsDiv.innerHTML = "";

  for (const card of playerCardsList) {
    playerCardsDiv.innerHTML += createCardHtml(card);
  }
}

function showDealerCards(): void {
  dealerCardsDiv.innerHTML = "";

  for (let index = 0; index < dealerCardsList.length; index++) {
    const card = dealerCardsList[index];

    const shouldHideCard = hideDealerSecondCard && index == 1;

    dealerCardsDiv.innerHTML += createCardHtml(card, shouldHideCard);
  }
}

function showScores(): void {
  if (playerCardsList.length == 0) {
    playerScoreText.textContent = "";
  } else {
    playerScoreText.textContent = "— " + getHandValue(playerCardsList);
  }

  if (dealerCardsList.length == 0) {
    dealerScoreText.textContent = "";
  } else if (hideDealerSecondCard) {
    dealerScoreText.textContent = "— ?";
  } else {
    dealerScoreText.textContent = "— " + getHandValue(dealerCardsList);
  }
}

function updateButtons(): void {
  dealButton.disabled = gameStarted || balance <= 0;
  hitButton.disabled = !gameStarted;
  standButton.disabled = !gameStarted;
  betInput.disabled = gameStarted;
  allinButton.disabled = gameStarted || balance <= 0;
  
  if(balance == 0 && !gameStarted)
  {
    betInput.valueAsNumber = 0;
  }

  if (doubleButton != null) {
    const canDouble =
      gameStarted &&
      playerCardsList.length == 2 &&
      balance >= bet;

    doubleButton.disabled = !canDouble;
  }
}

/* -----------------------------
   Game actions
----------------------------- */

function startGame(): void {
  bet = Number(betInput.value);

  if (bet <= 0) {
    messageText.textContent = "Enter a valid bet.";
    return;
  }

  if (bet > balance) {
    messageText.textContent = "You cannot bet more than your balance.";
    return;
  }

  deck = createDeck();

  playerCardsList = [drawCard(), drawCard()];
  dealerCardsList = [drawCard(), drawCard()];

  balance -= bet;

  gameStarted = true;
  hideDealerSecondCard = true;

  messageText.textContent = "Hit or stand?";

  if (getHandValue(playerCardsList) == 21) {
    endGame("blackjack");
    return;
  }

  updateScreen();
}

function hit(): void {
  playerCardsList.push(drawCard());

  const playerTotal = getHandValue(playerCardsList);

  if (playerTotal > 21) {
    endGame("lose");
    return;
  }

  if (playerTotal == 21) {
    stand();
    return;
  }

  messageText.textContent = "Hit or stand?";
  updateScreen();
}

function stand(): void {
  hideDealerSecondCard = false;

  while (getHandValue(dealerCardsList) < 17) {
    dealerCardsList.push(drawCard());
  }

  const playerTotal = getHandValue(playerCardsList);
  const dealerTotal = getHandValue(dealerCardsList);

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

function allIn(): void {

  if(balance == 0)
  {
    return;
  }

  betInput.valueAsNumber = balance;
  startGame();

}

function doubleDown(): void {
  if (gameStarted == false) {
    return;
  }

  if (playerCardsList.length != 2) {
    return;
  }

  if (balance < bet) {
    messageText.textContent = "Not enough balance to double down.";
    return;
  }

  balance -= bet;
  bet *= 2;

  playerCardsList.push(drawCard());

  if (getHandValue(playerCardsList) > 21) {
    endGame("lose");
  } else {
    stand();
  }
}

function endGame(result: string): void {
  gameStarted = false;
  hideDealerSecondCard = false;

  if (result == "blackjack") {
    balance += bet * 2.5;
    messageText.textContent = "Blackjack! You win!";
    streak += 1;
    saveStreak();
  }

  if (result == "win") {
    balance += bet * 2;
    messageText.textContent = "You win!";
    streak += 1;
    saveStreak();
  }

  if (result == "lose") {
    messageText.textContent = "You lose.";
    streak = 0;
    saveStreak();
  }

  if (result == "push") {
    balance += bet;
    messageText.textContent = "Push. Bet returned.";
  }

  bet = 0;

  if (balance <= 0) {
    messageText.textContent = "Game over. Press reset to start again.";
  }

  updateScreen();
  saveBalance();
}

function resetGame(): void {
  if(balance == 0)
    {
       balance = 10000;
       bet = 0;
    

  playerCardsList = [];
  dealerCardsList = [];

  gameStarted = false;
  hideDealerSecondCard = true;

  messageText.textContent = "Balance reset. Place your bet and deal.";

  updateScreen();
  saveBalance();
}
else
{
 messageText.textContent = "Can't reset. You still have money."
}
}



/* -----------------------------
   Button clicks
----------------------------- */

allinButton.onclick = allIn;
dealButton.onclick = startGame;
hitButton.onclick = hit;
standButton.onclick = stand;
resetButton.onclick = resetGame;

logoutButton.onclick = function () {
  localStorage.removeItem("userToken");
  location.href = "login.html";
};

if (doubleButton != null) {
  doubleButton.onclick = doubleDown;
}

refreshLeaderboardButton.onclick = loadLeaderboard;
themeSelect.onchange = saveTheme;


/* -----------------------------
   Start page
----------------------------- */

loadTheme();
await loadStreak();
await loadBalance();
loadLeaderboard();