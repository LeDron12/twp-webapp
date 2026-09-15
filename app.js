// Страница ввода руки: сетка карт, ряды раскладки и кнопка «Считать», которая передаёт выбор боту.
(function () {
  'use strict';
  var P = window.TwpPayload;
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { tg.ready(); tg.expand(); }

  var SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };

  // Колода — из адреса кнопки бота (?deck=…): форма открывается в колоде, выбранной в боте.
  var sel = P.setDeck(P.emptySelection(), P.deckFromQuery(window.location.search));
  var grid = document.getElementById('grid');
  var counter = document.getElementById('counter');
  var layout = document.getElementById('layout');
  var lanes = [].slice.call(layout.querySelectorAll('.lane'));
  var sendBtn = document.getElementById('send');
  var jokerBox = document.getElementById('joker-box');
  var jokerBtn = document.getElementById('joker');
  var jokerCount = document.getElementById('joker-count');
  var arrangeBox = document.getElementById('arrange');
  var deckSelect = document.getElementById('deck');
  var cells = {};

  // Подпись карты: «As» → «A♠»; джокер остаётся «Jk».
  function label(card) {
    return card === 'Jk' ? 'Jk' : card[0] + SUIT_GLYPH[card[1]];
  }

  function isRed(card) { return card !== 'Jk' && (card[1] === 'h' || card[1] === 'd'); }

  P.gridCards().forEach(function (card) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell' + (isRed(card) ? ' red' : '');
    b.textContent = label(card);
    b.dataset.card = card;
    b.addEventListener('click', function () { apply(P.toggleCard(sel, card)); });
    grid.appendChild(b);
    cells[card] = b;
  });

  jokerBtn.addEventListener('click', function () { apply(P.toggleCard(sel, 'Jk')); });
  document.getElementById('clear').addEventListener('click', function () {
    apply(P.setDeck(P.emptySelection(), sel.deck));
  });
  arrangeBox.addEventListener('change', function (e) {
    apply(P.setArrange(sel, e.target.checked));
  });
  ['players', 'deck'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', function (e) {
      var v = Number(e.target.value);
      if (id === 'deck') apply(P.setDeck(sel, v));
      else { var next = P.setDeck(sel, sel.deck); next.players = v; apply(next); }
    });
  });

  sendBtn.addEventListener('click', function () {
    if (!P.isComplete(sel)) return;
    if (P.payloadBytes(sel) > P.SEND_DATA_LIMIT) return;
    if (tg) tg.sendData(P.buildPayload(sel));
    else alert('Откройте форму из Telegram-бота');
  });

  // Ряды раскладки: занятый слот — кнопка возврата карты в сетку, пустой — место под карту.
  function drawLayout() {
    var rows = P.rows(sel);
    lanes.forEach(function (lane, i) {
      var box = lane.querySelector('.slots');
      box.textContent = '';
      for (var k = 0; k < P.ROW_SIZES[i]; k++) {
        var card = rows[i][k];
        var slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'slot' + (card ? ' filled' : '') + (card && isRed(card) ? ' red' : '');
        slot.textContent = card ? label(card) : '';
        if (card) {
          slot.dataset.card = card;
          slot.addEventListener('click', function (e) {
            apply(P.toggleCard(sel, e.currentTarget.dataset.card));
          });
        } else {
          slot.disabled = true;
        }
        box.appendChild(slot);
      }
    });
  }

  function apply(next) {
    sel = next;
    Object.keys(cells).forEach(function (card) {
      cells[card].classList.toggle('on', sel.cards.indexOf(card) >= 0);
    });
    var jokers = P.jokerCount(sel);
    jokerBox.hidden = sel.deck !== 54;
    jokerCount.textContent = jokers + '/2';
    jokerBtn.classList.toggle('on', jokers > 0);
    layout.hidden = !sel.arrange;
    arrangeBox.checked = sel.arrange;
    deckSelect.value = String(sel.deck);
    counter.textContent = sel.arrange
      ? 'выбрано ' + sel.cards.length + ' из 7 — порядок нажатий задаёт раскладку'
      : 'выбрано ' + sel.cards.length + ' из 7';
    drawLayout();
    sendBtn.disabled = !P.isComplete(sel);
  }

  apply(sel);
})();
