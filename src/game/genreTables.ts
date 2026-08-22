// Genre-specific random tables from the rulebook (Ch.5 "Random Tables",
// p.70-96) — Locations, Objects, Clues, Keywords, Obligations, and Threats
// for each of the four genres. Paired with the general tables in oracles.ts.

import type { Genre } from './types';
import type { OracleTable } from './oracles';

export interface GenreTableSet {
  locations: OracleTable;
  objects: OracleTable;
  clues: OracleTable;
  keywords: OracleTable;
  obligations: OracleTable;
  threats: OracleTable;
}

// ── Noir (p.70-75) ────────────────────────────────────────────────────────

const noir: GenreTableSet = {
  locations: {
    id: 'noir-locations', name: 'Noir locations',
    entries: [
      'Café', 'Prison', 'Boat', 'Alleyway', 'Abandoned building', 'Church',
      'University', 'Home', 'Gallery', 'Train station', 'Beach', 'Apartment',
      'Car park', 'Zoo', 'Restaurant', 'Gas station', 'Basement', 'Police station',
      'Morgue', 'Museum', 'Hotel', 'Factory', 'Warehouse', 'Pub',
      'Casino', 'Gym', 'Amusement park', 'Courthouse', 'Park', 'Bank',
      'Storage unit', 'Pier', 'Shopping centre', 'Airport', 'Backyard', 'Stadium',
    ],
  },
  objects: {
    id: 'noir-objects', name: 'Noir objects',
    entries: [
      'Family', 'Figurehead', 'Artefact', 'Secret document', 'Plant', 'Animal',
      'Vehicle', 'Money', 'Medicine', 'Weapons', 'Officer', 'Disease',
      'Investigation', 'Criminal', 'Interloper', 'Passerby', 'Key', 'Community',
      'Drug', 'Reporter', 'Paperwork', 'Evidence', 'Owner', 'Safe',
      'Group', 'Witness', 'Map', 'Photograph', 'Rival', 'Prisoner',
      'Discovery', 'Structure', 'Survivor', 'Resident', 'Visitor', 'Goods',
    ],
  },
  clues: {
    id: 'noir-clues', name: 'Noir clues',
    entries: [
      'Email', 'Recorded conversation', 'Witness account', 'Suspicious behaviour', 'Trail of carnage', 'Recurring symbol',
      'Recent visit', 'Forensic evidence', 'Associated group', 'Another location', 'Meeting invitation', 'Handwritten notes',
      'False alibi', 'Business card', 'Cadaver', 'Secret room', 'Hidden cache', 'Criminal record',
      'Anonymous phone call', 'Abandoned vehicle', 'Partial confession', 'Ransom letter', 'Body part', 'Getaway trail',
      'Trophy', 'Personal connection', 'Accusatory statement', 'Pattern', 'Manifesto', 'Urban legend',
      'Newspaper clippings', 'Cipher', 'Vacant mark', 'Testimony', 'Eviction notice', 'Incongruous object',
    ],
  },
  keywords: {
    id: 'noir-keywords', name: 'Noir keywords',
    entries: [
      'Mantra', 'Weapon', 'Companion', 'Knowledge', 'Jewellery', 'Dialect',
      'Artefact', 'Key', 'Polaroid', 'Tool', 'Distraction', 'Connection',
      'Clothing', 'Code', 'Cabal', 'Forgotten', 'Reason', 'Scent',
      'Kidnapping', 'Stolen', 'Grudge', 'Family', 'Carving', 'Backdoor',
      'Medicine', 'Aid', 'Dream', 'Missing', 'Conspiracy', 'Lie',
      'Betrayal', 'Avenue of escape', 'Presence', 'Powerful ally', 'Voice', 'Trail',
    ],
  },
  obligations: {
    id: 'noir-obligations', name: 'Noir obligations',
    entries: [
      'Help a sick partner', 'Manage alcoholism', 'Rekindle a relationship', 'Pay off debts', 'Overcome a trauma', 'Protect a person',
      'Manage a disability', 'Protect a secret', 'Absolve sins', 'Fuel a drug addiction', 'Indulge dark urges', 'Be a good parent',
      'Escape the rat race', 'Repair a marriage', 'Write a novel', 'Volunteer locally', 'Preserve a legacy', 'Care for a pet',
      'Hide an affair', 'Run a family business', 'Mentor youth', 'Work at a day job', 'Remain undiscovered', 'Topple an organisation',
      'Prove your innocence', 'Stalk your next victim', 'Attend therapy', 'Continue education', 'Reclaim an old career', 'Remain stable',
      'Obey secret society', 'Track a missing item', 'Win a legal battle', 'Get revenge', 'Find peace', 'Tend to a garden',
    ],
  },
  threats: {
    id: 'noir-threats', name: 'Noir threats',
    entries: [
      'Invasive thoughts', 'Sudden landslide', 'Armed individual', 'Government agent', 'Restless crowd', 'Dangerous animal',
      'Blazing fire', 'Guard patrol', 'Angry boss', 'Unrelenting stalker', 'Security system', 'Man-made trap',
      'Eerie darkness', 'Interested faction', 'Criminal activity', 'Police presence', 'Rival detective', 'Toxic chemical',
      'Unstable structure', 'Media presence', 'Hidden fanatic', 'Drunk bystander', 'Nauseating stench', 'Distant pursuer',
      'Environmental anomaly', 'Altered state', 'Imposter syndrome', 'Heavy rain', 'Faulty equipment', 'Distracting noise',
      'Consuming fear', 'Inconsolable victim', 'Assassin', 'Trauma trigger', 'Persistent exhaustion', 'Frustrated resident',
    ],
  },
};

// ── Fantasy (p.76-82) ─────────────────────────────────────────────────────

const fantasy: GenreTableSet = {
  locations: {
    id: 'fantasy-locations', name: 'Fantasy locations',
    entries: [
      'Tavern', 'Castle', 'Dungeon', 'Smithy', 'Forest', 'Campsite',
      'Armoury', 'Monastery', 'Carnival', 'Watch tower', 'Ruins', 'Mine',
      'Farmland', 'Apothecary', 'Battlefield', 'Market', 'Guild hall', 'Training grounds',
      "Creature's lair", 'Barracks', 'Mountain path', 'Lake', 'Rampart', 'Fighting pits',
      'Hamlet', 'Bridge', 'Sanctuary', 'Crypt', 'Archives', 'Workshop',
      'Tourney grounds', 'Cave system', "Peasant's home", 'Cathedral', 'Town square', 'Torture chamber',
    ],
  },
  objects: {
    id: 'fantasy-objects', name: 'Fantasy objects',
    entries: [
      'Sky', 'Vow', 'Warrior', 'Royalty', 'Assassin', 'Treasure',
      'Treaty', 'Priest', 'Adviser', 'Tapestry', 'Elder', 'Relative',
      'Prophecy', 'Townsfolk', 'Guild', 'Party', 'Traveller', 'Messenger',
      'Merchant', 'Bodyguard', 'Sorcerer', 'Amulet', 'Golem', 'God',
      'Sword', 'Horde', 'Natural feature', 'Performer', 'Relic', 'Dragon',
      'Magic', 'Successor', 'Wand', 'Faerie', 'Sentient object', 'Sacrifice',
    ],
  },
  clues: {
    id: 'fantasy-clues', name: 'Fantasy clues',
    entries: [
      'Ledger', 'Spiritual act', 'Arcane illusion', 'Beastly evidence', 'Folklore', 'Directions',
      'Guild iconography', 'Soiled footprint', 'Strange weather', 'Claw marks', 'House seal', 'Hidden people',
      'Decorated weapon', 'Whispered rumour', 'Overheard plot', 'Suspicious sighting', 'Remains of ritual', 'Sign of struggle',
      'Specific instructions', 'Lost history', 'Lingering aura', 'Blood trail', 'Secret order', 'Depicted prophecy',
      'Abandoned structure', 'Town crier', 'Animal gathering', 'Ancient relic', 'Shrine carvings', 'Foreign object',
      'Scorched earth', 'Poisonous substance', 'Esoteric doctrine', 'Torn clothing', 'Recent camp', 'Disappearance',
    ],
  },
  keywords: {
    id: 'fantasy-keywords', name: 'Fantasy keywords',
    entries: [
      'Iron chunk', 'Sword', 'Stable', 'Portal', 'Armour', 'Tome',
      'Tracks', 'Heraldry', 'Spell', 'Beast', 'Rune', 'Scroll',
      'Fealty', 'Dragon', 'Feather', 'Bellows', 'Crown', 'Talisman',
      'Hearth', 'History', 'Faerie', 'Rotten', 'Declaration', 'Mead',
      'Sign', 'Market', 'Knight', 'Temple', 'Tournament', 'Oath',
      'Poison', 'Tavern', 'Sigil', 'Herald', 'Feast', 'Dungeon',
    ],
  },
  obligations: {
    id: 'fantasy-obligations', name: 'Fantasy obligations',
    entries: [
      'Protect a relic', 'Serve a monarch', 'Avoid a prophecy', 'Mentor young warriors', 'Sustain a devotion', 'Secure a bloodline',
      'Provide for a household', 'Reclaim a lost title', 'Discover lost archives', 'Seek power', 'Revive a lost craft', 'Prepare for a war',
      'Fend off creatures', 'Rebuild a hometown', 'Support a guild', 'Forge a weapon', 'Repair an old castle', 'Care for a beast',
      'Interrogate a prisoner', 'Ward off corruption', 'Repel invaders', 'Learn magic', 'Obey a demon', 'Protect a village',
      'Learn from a mentor', 'Gamble in a tavern', 'Run a tavern', 'Overthrow a leader', 'Guard ancestral lands', 'Tax peasants',
      'Train with a weapon', 'Find bounty work', 'Replenish supplies', 'Honour the gods', 'Best your rival', 'Hone skills',
    ],
  },
  threats: {
    id: 'fantasy-threats', name: 'Fantasy threats',
    entries: [
      'Dark mage', 'Hungry bandits', 'Black magic', 'Town guards', 'Paid mercenaries', 'Ferocious winds',
      'Hostile wildlife', 'Dangerous creature', 'Crazed zealot', 'Magical ward', 'Irritating bard', 'Manipulative faerie',
      'Protective nomads', 'Belligerent drunk', 'Possessed guide', 'Divine interference', 'Fickle elemental', 'Spreading necrosis',
      'Undead swarm', 'Treacherous terrain', 'Cursed relic', 'Arcane interference', 'Doppelganger', 'Scouting party',
      'Violent raiders', 'Sinister townsfolk', 'Scaled beast', 'Diseased bystanders', 'Sneaky pickpocket', 'Heckling priest',
      'Dense parade', 'Cruel monarch', 'Blood moon', 'Fallen knight', 'Mistaken thug', 'Self-doubt',
    ],
  },
};

// ── Horror (p.83-89) ──────────────────────────────────────────────────────

const horror: GenreTableSet = {
  locations: {
    id: 'horror-locations', name: 'Horror locations',
    entries: [
      'Manor', 'Cellar', 'Townhouse', 'Garden', "Servant's quarters", 'Ballroom',
      'Docks', 'Private study', 'Rural farmhouse', 'Surveyor camp', 'Hospital', 'Attic',
      'Chapel', 'Library', 'Cemetery', 'Family mansion', 'City streets', 'Moor',
      'Country road', 'Theatre', 'Asylum', 'Inn', 'Catacombs', 'Reading room',
      'Lighthouse', 'Sewers', 'Bell tower', 'Cabin', 'Parlour', 'Estate',
      'Stables', 'Island', 'Observatory', 'Shipwreck', 'Windmill', 'Office',
    ],
  },
  objects: {
    id: 'horror-objects', name: 'Horror objects',
    entries: [
      'Sun', 'Servant', 'Doll', 'Letter', 'Heirloom', 'Sibling',
      'Grimoire', 'Partygoer', 'Fortune', 'Family', 'Animal', 'Deed',
      'Gentleperson', 'Cult', 'Reflection', 'Creature', 'Spirit', 'Lord',
      'Vampire', 'Storm', 'Journal', 'Memory', 'Heiress', 'Painting',
      'Curse', 'Vagrant', 'Corpse', 'Oracle', 'Secret', 'Veil',
      'Statue', 'Light', 'Thrall', 'Memoir', 'Lady', 'Decorative saber',
    ],
  },
  clues: {
    id: 'horror-clues', name: 'Horror clues',
    entries: [
      'Repeated phrase', 'Suspicious package', 'False account', 'Family deed', 'Drug stash', 'Town gossip',
      'Hidden crawlspace', 'Memory fragment', 'Unfinished ritual', 'Prophetic visions', 'Esoteric sight', 'Bribe',
      'Out of place weapon', 'Unearthed remains', 'Cursed bloodline', 'Lost diary', 'Stashed toxins', 'Forbidden knowledge',
      'Scrawlings', 'Scandal', 'Revealing letter', 'Powerful artefact', 'Familiar melody', 'Half-destroyed papers',
      'Notable absence', 'Absent hour', 'Family tree', 'Suspect motivation', 'Obsession', 'Last will and testament',
      'Odd sensation', 'Unstable behaviour', 'Personal trace', 'Distinct smell', 'Patron', 'Strange remnants',
    ],
  },
  keywords: {
    id: 'horror-keywords', name: 'Horror keywords',
    entries: [
      'Strand', 'Cabinet', 'Blood', 'Dream', 'Ritual', 'Spectre',
      'Duel', 'Gossip', 'Void', 'Vial', 'Lantern', 'Oubliette',
      'Haunt', 'Trapdoor', 'Servant', 'Storm', 'Carriage', 'Inheritance',
      'Plague', 'Illusion', 'Family', 'Fashion', 'Cellar', 'Violin',
      'Powder', 'Ointment', 'Mirror', 'Bookcase', 'Newspaper', 'Wealth',
      'Scheme', 'Gown', 'Growth', 'Omen', 'Grave', 'Skittering noises',
    ],
  },
  obligations: {
    id: 'horror-obligations', name: 'Horror obligations',
    entries: [
      'Sunder a dark curse', 'Repair an estate', 'Trace your lineage', 'Punish the wicked', 'Attend a meeting', 'Honour a family pact',
      'Write a letter', 'Discover a cure', 'Serve your master', 'Maintain your nobility', 'Obtain wealth', 'Attend church',
      'Further your research', 'Oust your rival', 'Exonerate a sibling', 'Satiate your blood lust', 'Run an apothecary', 'Find the family crypt',
      'Guard sacred grounds', 'Enact your visions', 'Nourish a creature', 'Stalk a gentleperson', 'Overcome your fears', 'Advise an aristocrat',
      'Maintain your sanity', 'Feed the ravens', 'Plan a ball', 'Atone for your sins', 'Escape your marriage', 'Assist a relative',
      'Obfuscate a truth', 'Forget your dreams', 'Decode an old tome', 'Answer the call', 'Pay off a benefactor', 'Hide your vile affliction',
    ],
  },
  threats: {
    id: 'horror-threats', name: 'Horror threats',
    entries: [
      'Demonic presence', 'Skulking shadows', 'Restless peasant', 'Unstable mind', 'Hopeless thoughts', 'Nagging twitch',
      'Grasping hands', 'Unhappy gentry', 'Growing mould', 'Watchful eyes', 'Sickly substance', 'Floating grimoire',
      'Summoning circle', 'Lurking insecurity', 'Ceaseless tickling', 'Rat swarm', 'Prowling monster', 'Ferocious storm',
      'Cultists', 'Encroaching screeching', 'Meddling sibling', 'Disruptive servant', 'Unhallowed ground', 'Witch hunter',
      'Village mob', 'Supernatural lord', 'Indescribable horror', 'Maddening bells', 'Strange reflection', 'Pulsing void',
      'Sudden vertigo', 'Shifting structures', 'Jealous lover', 'Crushing anxiety', 'Hidden trap', 'Corrupt constable',
    ],
  },
};

// ── Sci-fi (p.90-96) ──────────────────────────────────────────────────────

const scifi: GenreTableSet = {
  locations: {
    id: 'scifi-locations', name: 'Sci-fi locations',
    entries: [
      'Space station', 'Galactic cruiser', 'Slums', 'Brothel', 'Drug den', 'Corporate HQ',
      'Megacity underground', 'Black market', 'Rooftop', 'Skyscraper', 'Junkyard', 'Arcade',
      'Hideout', 'Cockpit', 'Space freighter', 'Lunar base', 'Penthouse', 'Dive bar',
      'Speakeasy', 'VR world', 'Server room', 'Highway', 'Dig site', 'Abandoned ship',
      'Private residence', 'Gene lab', 'Military base', 'Nightclub', 'Union office', 'Bio-dome',
      'Back alley', 'Gang safe-house', 'Cryo-chamber', 'Ship port', 'Alien planet', 'Laboratory',
    ],
  },
  objects: {
    id: 'scifi-objects', name: 'Sci-fi objects',
    entries: [
      'Data set', 'Microchip', 'Android', 'Chemical', 'Patent', 'AI',
      'Agent', 'Contraband shipment', 'Gang', 'Hardware', 'Bioweapon', 'Flight path',
      'CEO', 'Power source', 'Communication device', 'Pilot', 'Surveillance system', 'Group of workers',
      'Algorithm', 'Life-support system', 'Engineer', 'Cargo container', 'Formula', 'Program',
      'Occupant', 'Tracker', 'Crew', 'Whistleblower', 'Doctor', 'Contract',
      'Monolith', 'Network', 'Addict', 'New technology', 'Population', 'Solar array',
    ],
  },
  clues: {
    id: 'scifi-clues', name: 'Sci-fi clues',
    entries: [
      'Digital footprint', 'Disembodied implant', 'Distinct damage', 'Nanite liquid', 'Weird coordinates', 'Biometric data',
      'Timestamp', 'Tampered electronics', 'Redacted documents', 'Digital files', 'Hidden agenda', 'Unpaid debts',
      'Encrypted server', 'Bug-out bag', 'Spray tag', 'Audio log', 'Mechanical remains', 'Unregistered implant',
      'Altered surveillance', 'Strange biology', 'Unidentified object', 'Unlogged cargo', 'Scientific research', 'Evidence of life',
      'Televised report', 'Destroyed ship', 'DNA mismatch', 'Biological sample', 'Camera footage', 'Encrypted message',
      'Heightened security', 'Distress signal', 'Altered data', 'Black-market lead', 'Nefarious plans', 'Planetary anomaly',
    ],
  },
  keywords: {
    id: 'scifi-keywords', name: 'Sci-fi keywords',
    entries: [
      'Gun', 'Chip', 'Synthetic', 'Android', 'Binary', 'Alien',
      'Glass', 'Surveillance', 'Scan', 'Lock', 'Technology', 'Core',
      'Loop', 'Security', 'Engine', 'Signal', 'Sludge', 'Visor',
      'Med-kit', 'Augmentation', 'Network', 'Corporation', 'Bridge', 'Wire',
      'Scavenge', 'Star', 'Laser', 'Keypad', 'Digit', 'Station',
      'Program', 'Jargon', 'Slum', 'Fluid', 'Orbit', 'Toxic',
    ],
  },
  obligations: {
    id: 'scifi-obligations', name: 'Sci-fi obligations',
    entries: [
      'Erase a digital trace', 'Pay for medical bills', 'Distribute manifestos', 'Run a podcast', 'Conceal true identity', 'Perform at nightclub',
      'Hide illegal clones', 'Support an AI', 'Tend to a bio-dome', 'Resist AI influence', 'Repay hacking debts', 'Feed the homeless',
      'File daily reports', 'Keep a corporate job', 'Indulge in a drug', 'Reintroduce flora', 'Hunt an android', 'Repair a robot',
      'Scan for survivors', 'Enact mutual aid', 'Pursue hedonism', 'Get out of the slums', 'Aid the revolution', 'Restore a server',
      'Attend an inspection', 'Fund a body mod', 'Enforce a curfew', 'Smuggle contraband', 'Pay landlord', 'Attend virtual therapy',
      'Repair an old ship', 'Catalogue data', 'Play a VR game', 'Unlock lost memories', 'Synthesise food', 'Avoid media',
    ],
  },
  threats: {
    id: 'scifi-threats', name: 'Sci-fi threats',
    entries: [
      'Chemical fumes', 'Rogue android', 'Drone presence', 'Malfunctioning tech', 'Security turrets', 'Corporate police',
      'Drug addict', 'Blaring alarm', 'Scavenger', 'Blackout', 'Neural hackers', 'Unknown entity',
      'Scrambler signal', 'Military presence', 'Toxic rain', 'Tracer signal', 'Active firefight', 'Industrial pollution',
      'Singularity', 'Solar storm', 'Lingering guilt', 'Meteor shower', 'Oxygen breach', 'Organ thief',
      'Space pirates', 'Post-human activist', 'Union riot', 'Freezing temperatures', 'Radiation', 'Electrical surge',
      'Bioscanner', 'Sentient AI', 'Alternative gravity', 'Dangerous traffic', 'Biker gang', 'Virus',
    ],
  },
};

export const GENRE_TABLES: Record<Genre, GenreTableSet> = { noir, fantasy, horror, scifi };
