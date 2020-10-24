// We could get the shorthands from the allTeams endpoint but honestly the
// canonical shorthands are kind of bad and if we don't like them we might as
// well save a request.
const shorthand = {
  'adc5b394-8f76-416d-9ce9-813706877b84': 'KCBM',
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
  '57ec08cc-0411-4643-b304-0e80dbc15ac7': 'CDMX',
  'c73b705c-40ad-4633-a6ed-d357ee2e2bcf': 'TYO',
};

function compareGames(a, b) {
  if (!a.gameComplete && b.gameComplete) { return -1; }
  if (a.gameComplete && !b.gameComplete) { return 1; }

  if (a.id < b.id) { return -1; }
  if (a.id > b.id) { return 1; }

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

function cloneTemplate() {
  const clone = document.querySelector('#template-game').content.cloneNode(true);
  const gameElement = clone.querySelector('.game');
  document.body.append(clone);
  return gameElement;
}

function emoji(e) {
  const n = Number(e);
  return Number.isNaN(n) ? e : String.fromCodePoint(n);
}

function newGame(game) {
  const gameElement = cloneTemplate();
  gameElement.dataset.id = game.id;

  ['away', 'home'].forEach((team) => {
    gameElement.querySelector(`.${team} .emoji`).textContent = emoji(game[`${team}TeamEmoji`]);
    const abbr = gameElement.querySelector(`.${team} abbr`);
    abbr.setAttribute('title', game[`${team}TeamName`]);
    abbr.textContent = shorthand[game[`${team}Team`]];
  });

  return gameElement;
}

function setupSource() {
  const source = new EventSource('https://cors-proxy.blaseball-reference.com/events/streamData');

  source.addEventListener('message', (e) => {
    const event = JSON.parse(e.data).value.games;
    const postseason = Object.keys(event.postseason).length > 0;

    if (postseason) {
      document.body.classList.add('postseason');
      document.querySelector('header.postseason .season').textContent = event.sim.season + 1;
      document.querySelector('header.postseason .gameindex').textContent = event.postseason.round.gameIndex + 1;
      document.querySelector('header.postseason .phase').textContent = event.postseason.round.name;
    } else {
      document.body.classList.remove('postseason');
      document.querySelector('header.regular .season').textContent = event.sim.season + 1;
      document.querySelector('header.regular .day').textContent = event.sim.day + 1;
    }

    const schedule = event.schedule.sort(compareGames);
    const gameIds = schedule.map((g) => g.id);

    document.querySelectorAll('.game').forEach((gameElement) => {
      if (!gameIds.includes(gameElement.dataset.id)) {
        gameElement.remove();
      }
    });

    schedule.forEach((game) => {
      const gameElement = document.querySelector(`.game[data-id="${game.id}"]`) ?? newGame(game);
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
        overview.textContent = game.topOfInning ? '\u25b2 ' : '\u25bc ';
        if (game.shame) {
          overview.classList.add('shame');
          overview.textContent += `SHAME/${game.inning + 1}`;
        } else {
          overview.textContent += `${game.topOfInning ? 'Top' : 'Bot'} ${ordinal(game.inning + 1)}`;
        }

        gameElement.querySelector('.outs').textContent = `${game.halfInningOuts} Out`;
      }

      if (postseason) {
        const matchup = event.postseason.matchups
          .find((m) => [game.awayTeam, game.homeTeam].includes(m.awayTeam));
        const flipped = game.awayTeam !== matchup.awayTeam;

        [['away', 'home'], ['home', 'away']].forEach(([team, other]) => {
          gameElement.querySelector(`.${team} .seed`).textContent = (flipped ? matchup[`${other}Seed`] : matchup[`${team}Seed`]) + 1;
        });

        if (matchup.awayWins > 0 || matchup.homeWins > 0) {
          const extra = gameElement.querySelector('.extra');
          if (matchup.awayWins === matchup.homeWins) {
            extra.textContent = `Series tied ${matchup.awayWins}\u2013${matchup.homeWins}`;
          } else {
            const leader = (matchup.awayWins > matchup.homeWins)
              ? shorthand[matchup.awayTeam] : shorthand[matchup.homeTeam];
            const awayWins = flipped ? matchup.homeWins : matchup.awayWins;
            const homeWins = flipped ? matchup.awayWins : matchup.homeWins;
            const word = Math.abs(awayWins - homeWins) >= Number(matchup.gamesNeeded) && awayWins !== homeWins ? 'wins' : 'leads';
            extra.textContent = `${leader} ${word} ${awayWins}\u2013${homeWins}`;
          }
        }
      }

      ['away', 'home'].forEach((team) => {
        gameElement.querySelector(`.${team} .score`).textContent = game[`${team}Score`];
      });

      const bases = gameElement.querySelector('.bases');
      [['first', 0], ['second', 1], ['third', 2], ['fourth', 3]].forEach(([base, baseId]) => {
        bases.dataset[base] = game.basesOccupied.includes(baseId) ? 'true' : 'false';
      });
      bases.dataset.hasFourth = `${(game.topOfInning ? game.awayBases : game.homeBases) === 5}`;
    });
  });

  source.addEventListener('error', () => {
    source.close();
    setTimeout(setupSource, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  'LOADING...'.split('').forEach((c) => {
    const element = cloneTemplate();
    element.querySelector('.away abbr').textContent = c;
  });
  setupSource();
});
