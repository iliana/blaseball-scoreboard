function compareGames(a, b) {
  if (a.id > b.id) {
    return 1;
  }
  if (a.id < b.id) {
    return -1;
  }
  return 0;
}

function ordinal(i) {
  const j = i % 10;
  const k = i % 100;

  if (j === 1 && k !== 11) {
    return `${i}st`;
  }
  if (j === 2 && k !== 12) {
    return `${i}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${i}rd`;
  }
  return `${i}th`;
}

function outs(n) {
  if (n === 1) {
    return '1 Out';
  }
  return `${n} Outs`;
}

// We could get the shorthands from the allTeams endpoint but honestly the
// canonical shorthands are kind of bad and if we don't like them we might as
// well save a request.
const shorthand = {
  'adc5b394-8f76-416d-9ce9-813706877b84': 'KC',
  '8d87c468-699a-47a8-b40d-cfb73a5660ad': 'BAL',
  'b63be8c2-576a-4d6e-8daf-814f8bcea96f': 'MIA',
  'ca3f1c8c-c025-4d8e-8eef-5be6accbeb16': 'CHI',
  '3f8bbb15-61c0-4e3f-8e4a-907a5fb1565e': 'BOS',
  '979aee4a-6d80-4863-bf1c-ee1a78e06024': 'FRI',
  '105bc3ff-1320-4e37-8ef0-8d595cb95dd0': 'SEA',
  'a37f9158-7f82-46bc-908c-c9e2dda7c33b': 'BRK',
  'b72f3061-f573-40d7-832a-5ad475bd7909': 'SF',
  '7966eb04-efcc-499b-8f03-d13916330531': 'YELL',
  '36569151-a2fb-43c1-9df7-2df512424c82': 'NY',
  'eb67ae5e-c4bf-46ca-bbbc-425cd34182ff': 'CAN',
  '23e4cbc1-e9cd-47fa-a35b-bfa06f726cb7': 'PHL',
  'bfd38797-8404-4b38-8b82-341da28b1f83': 'CHS',
  '9debc64f-74b7-4ae1-a4d6-fce0144b6ea5': 'HOU',
  'b024e975-1c4a-4575-8936-a3754a08806a': 'DAL',
  'f02aeae2-5e6a-4098-9842-02d2273f25c7': 'HELL',
  '878c1bf6-0d21-4659-bfee-916c8314d69c': 'TACO',
  '747b8e4a-7e50-4638-a973-ea7950a3e739': 'HAD',
  '57ec08cc-0411-4643-b304-0e80dbc15ac7': 'MEX',
};

function newGame(game) {
  const clone = document.body.querySelector('#template-game').content.cloneNode(true);
  const gameElement = clone.querySelector('.game');

  gameElement.dataset.id = game.id;

  ['away', 'home'].forEach((team) => {
    gameElement.querySelector(`.${team} .emoji`).textContent = String.fromCodePoint(parseInt(game[`${team}TeamEmoji`], 16));
    const abbr = gameElement.querySelector(`.${team} abbr`);
    abbr.setAttribute('title', game[`${team}TeamName`]);
    abbr.textContent = shorthand[game[`${team}Team`]];
  });

  document.body.append(clone);
  return gameElement;
}

function setupSource() {
  const source = new EventSource('https://cors-proxy.blaseball-reference.com/events/streamData');

  source.addEventListener('message', (e) => {
    const schedule = JSON.parse(e.data).value.games.schedule.sort(compareGames);
    const gameIds = schedule.map((g) => g.id);

    document.body.querySelectorAll('.game').forEach((gameElement) => {
      if (gameElement.dataset.id && !gameIds.includes(gameElement.dataset.id)) {
        gameElement.remove();
      }
    });

    schedule.forEach((game) => {
      const gameElement = document.body.querySelector(`.game[data-id="${game.id}"]`) ?? newGame(game);
      if (game.gameComplete) {
        gameElement.classList.add('complete');
      }

      const overview = gameElement.querySelector('.overview');
      if (game.gameComplete) {
        overview.classList.remove('active');
        overview.textContent = 'Final';
        if (game.shame) {
          overview.classList.add('shame');
          overview.textContent += '/SHAME';
        }
        if (game.inning > 8) {
          overview.textContent += `/${game.inning + 1}`;
        }

        gameElement.querySelector('.away').classList.add(game.awayScore > game.homeScore ? 'winner' : 'loser');
        gameElement.querySelector('.home').classList.add(game.awayScore < game.homeScore ? 'winner' : 'loser');
      } else {
        if (game.shame) {
          overview.classList.add('shame');
          overview.textContent = 'SHAME';
          if (game.inning > 8) {
            overview.textContent += `/${game.inning + 1}`;
          }
        } else {
          overview.textContent = `${game.topOfInning ? 'Top' : 'Bot'} ${ordinal(game.inning + 1)}`;
        }

        gameElement.querySelector('.outs').textContent = outs(game.halfInningOuts);
      }

      ['away', 'home'].forEach((team) => {
        gameElement.querySelector(`.${team} .score`).textContent = game[`${team}Score`];
      });

      const bases = gameElement.querySelector('.bases');
      [['first', 0], ['second', 1], ['third', 2]].forEach(([base, baseId]) => {
        bases.dataset[base] = game.basesOccupied.includes(baseId) ? 'true' : 'false';
      });
    });
  });

  source.addEventListener('error', () => {
    source.close();
    setupSource();
  });
}

setupSource();
