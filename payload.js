// Логика выбора карт и сборки данных формы: без сети и без обращений к странице,
// поэтому её можно проверять отдельно от браузера.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TwpPayload = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  var SUITS = ['s', 'h', 'd', 'c'];
  var HAND_SIZE = 7;
  var MAX_JOKERS = 2;          // в колоде 54 два джокера
  var SEND_DATA_LIMIT = 4096;  // предел размера данных, которые Telegram принимает от формы, байт
  var DEFAULT_DECK = 54;       // по умолчанию — игра с джокерами

  // Все 52 карты в порядке сетки: 4 ряда мастей × 13 рангов.
  function gridCards() {
    var out = [];
    for (var s = 0; s < SUITS.length; s++) {
      for (var r = 0; r < RANKS.length; r++) out.push(RANKS[r] + SUITS[s]);
    }
    return out;
  }

  // Состояние выбора: карты в порядке нажатий. Порядок нажатий задаёт и раскладку:
  // карта 1 → ряд 1, карты 2–3 → ряд 2, карты 4–7 → ряд 4.
  function emptySelection() {
    return { cards: [], deck: DEFAULT_DECK, players: 2, arrange: true };
  }

  // Копия состояния: вход не изменяется.
  function clone(sel) {
    return { cards: sel.cards.slice(), deck: sel.deck, players: sel.players, arrange: sel.arrange };
  }

  // Размеры рядов: 1 / 2 / 4.
  var ROW_SIZES = [1, 2, 4];

  // Выбранные карты по рядам; неполные ряды отдаются как есть.
  function rows(sel) {
    var out = [], at = 0;
    for (var i = 0; i < ROW_SIZES.length; i++) {
      out.push(sel.cards.slice(at, at + ROW_SIZES[i]));
      at += ROW_SIZES[i];
    }
    return out;
  }

  // Раскладка строкой: "Js | Ac 2c | Th 8d 6h 6d".
  function arrangementText(sel) {
    return rows(sel).map(function (row) { return row.join(' '); }).join(' | ');
  }

  function setArrange(sel, on) {
    var next = clone(sel);
    next.arrange = !!on;
    return next;
  }

  function jokerCount(sel) {
    var n = 0;
    for (var i = 0; i < sel.cards.length; i++) if (sel.cards[i] === 'Jk') n++;
    return n;
  }

  // Одно нажатие по карте: снимает выбор, если карта уже выбрана, иначе добавляет.
  function toggleCard(sel, card) {
    var next = clone(sel);
    if (card === 'Jk') {
      if (next.deck !== 54) return sel;                       // джокеры только в колоде 54
      var jokers = jokerCount(next);
      if (jokers >= MAX_JOKERS) {                             // третье нажатие снимает оба
        next.cards = next.cards.filter(function (c) { return c !== 'Jk'; });
        return next;
      }
      if (next.cards.length >= HAND_SIZE) return sel;
      next.cards.push('Jk');
      return next;
    }
    var at = next.cards.indexOf(card);
    if (at >= 0) { next.cards.splice(at, 1); return next; }   // снятие выбора — 1 нажатие
    if (next.cards.length >= HAND_SIZE) return sel;           // больше 7 карт не набрать
    next.cards.push(card);
    return next;
  }

  // Смена колоды: при переходе на 52 джокеры из выбора выпадают.
  function setDeck(sel, deck) {
    var next = clone(sel);
    next.deck = deck;
    if (deck !== 54) next.cards = next.cards.filter(function (c) { return c !== 'Jk'; });
    return next;
  }

  // Колода при открытии формы — из адреса (?deck=52 или ?deck=54), иначе колода по умолчанию.
  function deckFromQuery(search) {
    var deck = Number(new URLSearchParams(search || '').get('deck'));
    return deck === 52 || deck === 54 ? deck : DEFAULT_DECK;
  }

  function isComplete(sel) { return sel.cards.length === HAND_SIZE; }

  // Данные для бота: рука, колода, число мест, а при включённом разборе и полной руке — раскладка.
  function buildPayload(sel) {
    var out = {
      v: 2,
      hand: sel.cards.join(''),
      deck: sel.deck,
      players: sel.players
    };
    if (sel.arrange && isComplete(sel)) out.arrangement = arrangementText(sel);
    return JSON.stringify(out);
  }

  // Размер данных в байтах.
  function payloadBytes(sel) {
    var s = buildPayload(sel);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return Buffer.byteLength(s, 'utf8');
  }

  return {
    RANKS: RANKS, SUITS: SUITS, HAND_SIZE: HAND_SIZE, MAX_JOKERS: MAX_JOKERS,
    SEND_DATA_LIMIT: SEND_DATA_LIMIT, ROW_SIZES: ROW_SIZES, DEFAULT_DECK: DEFAULT_DECK,
    gridCards: gridCards, emptySelection: emptySelection, toggleCard: toggleCard,
    setDeck: setDeck, setArrange: setArrange, isComplete: isComplete,
    rows: rows, arrangementText: arrangementText, buildPayload: buildPayload,
    payloadBytes: payloadBytes, jokerCount: jokerCount, deckFromQuery: deckFromQuery
  };
});
