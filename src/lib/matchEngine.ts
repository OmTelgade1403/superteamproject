export interface Player {
  id: string;
  name: string;
  country: string;
  position: 'FWD' | 'MID' | 'DEF' | 'GK';
  avatar: string;
  stats: {
    attack: number;
    defense: number;
    discipline: number; // Higher means fewer fouls/cards
  };
}

export interface MatchEvent {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  playerCountry: string;
  type: 'PASS' | 'MISSED_PASS' | 'SHOT' | 'GOAL' | 'FOUL' | 'YELLOW_CARD' | 'RED_CARD' | 'SAVE' | 'TACKLE' | 'OWN_GOAL' | 'CONNECTED';
  description: string;
  hpDelta: number; // Positive = heal, Negative = damage
}

export const PLAYERS_ROSTER: Player[] = [
  { id: '1', name: 'Lionel Messi', country: 'Argentina', position: 'FWD', avatar: '🇦🇷', stats: { attack: 95, defense: 35, discipline: 90 } },
  { id: '2', name: 'Cristiano Ronaldo', country: 'Portugal', position: 'FWD', avatar: '🇵🇹', stats: { attack: 92, defense: 30, discipline: 85 } },
  { id: '3', name: 'Kylian Mbappé', country: 'France', position: 'FWD', avatar: '🇫🇷', stats: { attack: 94, defense: 32, discipline: 88 } },
  { id: '4', name: 'Kevin De Bruyne', country: 'Belgium', position: 'MID', avatar: '🇧🇪', stats: { attack: 88, defense: 68, discipline: 82 } },
  { id: '5', name: 'Jude Bellingham', country: 'England', position: 'MID', avatar: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', stats: { attack: 85, defense: 78, discipline: 80 } },
  { id: '6', name: 'Luka Modrić', country: 'Croatia', position: 'MID', avatar: '🇭🇷', stats: { attack: 82, defense: 72, discipline: 92 } },
  { id: '7', name: 'Virgil van Dijk', country: 'Netherlands', position: 'DEF', avatar: '🇳🇱', stats: { attack: 60, defense: 95, discipline: 88 } },
  { id: '8', name: 'Antonio Rüdiger', country: 'Germany', position: 'DEF', avatar: '🇩🇪', stats: { attack: 55, defense: 90, discipline: 70 } },
  { id: '9', name: 'Achraf Hakimi', country: 'Morocco', position: 'DEF', avatar: '🇲🇦', stats: { attack: 78, defense: 84, discipline: 78 } },
  { id: '10', name: 'Emiliano Martínez', country: 'Argentina', position: 'GK', avatar: '🇦🇷', stats: { attack: 10, defense: 92, discipline: 65 } },
  { id: '11', name: 'Alisson Becker', country: 'Brazil', position: 'GK', avatar: '🇧🇷', stats: { attack: 10, defense: 94, discipline: 95 } },
  { id: '12', name: 'Erling Haaland', country: 'Norway', position: 'FWD', avatar: '🇳🇴', stats: { attack: 96, defense: 30, discipline: 85 } }
];

const EVENT_TEMPLATES = [
  { type: 'PASS', probability: 40, hpDelta: 2, messages: ['completed a neat short pass.', 'delivered a precise diagonal ball.', 'switched play beautifully.', 'combined with a quick one-two.'] },
  { type: 'TACKLE', probability: 20, hpDelta: 6, messages: ['won a crucial tackle.', 'dispossessed the opponent cleanly.', 'intercepted a dangerous pass.', 'broke up a counter-attack.'] },
  { type: 'SHOT', probability: 15, hpDelta: 5, messages: ['fired a powerful shot on target.', 'attempted a volley from outside the box.', 'directed a header just over the crossbar.', 'tested the keeper with a curling shot.'] },
  { type: 'SAVE', probability: 10, hpDelta: 12, messages: ['made a stunning fingertip save!', 'collected a dangerous cross from the air.', 'parried away a fierce shot.', 'blocked a close-range header.'] },
  { type: 'GOAL', probability: 5, hpDelta: 25, messages: ['SCORED A WONDERFUL GOAL!', 'slotted the ball into the bottom corner!', 'tucked home the rebound!', 'scored with a bullet header!'] },
  { type: 'MISSED_PASS', probability: 15, hpDelta: -4, messages: ['misplaced a pass under pressure.', 'sent the ball directly out of bounds.', 'gave away possession in midfield.', 'had a pass intercepted.'] },
  { type: 'FOUL', probability: 12, hpDelta: -8, messages: ['committed a late challenge.', 'tripped the opponent from behind.', 'was whistled for blocking.', 'conceded a dangerous free kick.'] },
  { type: 'YELLOW_CARD', probability: 3, hpDelta: -20, messages: ['received a YELLOW CARD for a reckless challenge.', 'was booked for persistent fouling.', 'saw yellow for tactical clipping.'] },
  { type: 'RED_CARD', probability: 0.5, hpDelta: -50, messages: ['WAS SENT OFF with a straight RED CARD!', 'was shown a second yellow and sent off.'] },
  { type: 'OWN_GOAL', probability: 0.5, hpDelta: -40, messages: ['accidentally deflected the ball into their own net!', 'scored a catastrophic OWN GOAL.'] }
];

export function generateEvent(draftedPlayerIds: string[]): MatchEvent {
  // 70% chance the event is about one of the drafted players to keep action intense;
  // 30% chance it is about another random player.
  const isDrafted = Math.random() < 0.7 && draftedPlayerIds.length > 0;
  const targetId = isDrafted 
    ? draftedPlayerIds[Math.floor(Math.random() * draftedPlayerIds.length)]
    : PLAYERS_ROSTER[Math.floor(Math.random() * PLAYERS_ROSTER.length)].id;
  
  const player = PLAYERS_ROSTER.find(p => p.id === targetId) || PLAYERS_ROSTER[0];
  
  // Filter events matching player position
  let validTemplates = EVENT_TEMPLATES;
  if (player.position === 'GK') {
    // Keep saves and passes, restrict goals and shots
    validTemplates = EVENT_TEMPLATES.filter(t => t.type !== 'GOAL' && t.type !== 'SHOT');
  } else {
    // Restrict saves
    validTemplates = EVENT_TEMPLATES.filter(t => t.type !== 'SAVE');
  }

  // Choose template based on probability weights
  const totalWeight = validTemplates.reduce((sum, t) => sum + t.probability, 0);
  let randomWeight = Math.random() * totalWeight;
  let chosenTemplate = validTemplates[0];

  for (const t of validTemplates) {
    randomWeight -= t.probability;
    if (randomWeight <= 0) {
      chosenTemplate = t;
      break;
    }
  }

  // Adjust red card/yellow card probability based on player discipline
  if ((chosenTemplate.type === 'YELLOW_CARD' || chosenTemplate.type === 'RED_CARD' || chosenTemplate.type === 'FOUL') && Math.random() * 100 < (player.stats.discipline - 60)) {
    // Player discipline saved them from a foul/card! Downgrade to a simple pass or clean tackle
    chosenTemplate = EVENT_TEMPLATES.find(t => t.type === 'PASS')!;
  }

  // Pick a random message
  const msgTemplate = chosenTemplate.messages[Math.floor(Math.random() * chosenTemplate.messages.length)];
  const description = `${player.avatar} **${player.name}** (${player.country}) ${msgTemplate}`;

  // If this event is about a player NOT on our drafted team, we do NOT take damage/healing
  const hpDelta = draftedPlayerIds.includes(player.id) ? chosenTemplate.hpDelta : 0;

  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    playerId: player.id,
    playerName: player.name,
    playerCountry: player.country,
    type: chosenTemplate.type as MatchEvent['type'],
    description,
    hpDelta
  };
}
