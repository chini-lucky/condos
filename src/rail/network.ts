// Static reference data; source verification and topology notes: docs/rail-reference.md.
export type LineId = 'sukhumvit' | 'silom' | 'blue';
export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  label: string;
  lines: readonly LineId[];
}
export interface RailLine {
  name: string;
  badge: string;
  color: string;
  stations: readonly string[];
}
export const stations: readonly Station[] = [
  {
    "id": "N9",
    "name": "Ha Yaek Lat Phrao",
    "x": 385,
    "y": 180,
    "label": "tl",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N8",
    "name": "Mo Chit",
    "x": 385,
    "y": 213,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N7",
    "name": "Saphan Khwai",
    "x": 385,
    "y": 240,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N5",
    "name": "Ari",
    "x": 385,
    "y": 272,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N4",
    "name": "Sanam Pao",
    "x": 385,
    "y": 300,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N3",
    "name": "Victory Monument",
    "x": 385,
    "y": 328,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N2",
    "name": "Phaya Thai",
    "x": 385,
    "y": 360,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N1",
    "name": "Ratchathewi",
    "x": 385,
    "y": 395,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "CEN",
    "name": "Siam",
    "x": 398,
    "y": 450,
    "label": "tl",
    "lines": [
      "sukhumvit",
      "silom"
    ]
  },
  {
    "id": "E1",
    "name": "Chit Lom",
    "x": 440,
    "y": 450,
    "label": "b",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E2",
    "name": "Phloen Chit",
    "x": 470,
    "y": 450,
    "label": "t",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E3",
    "name": "Nana",
    "x": 505,
    "y": 450,
    "label": "b",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E4",
    "name": "Asok",
    "x": 530,
    "y": 450,
    "label": "tl",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E5",
    "name": "Phrom Phong",
    "x": 572,
    "y": 450,
    "label": "t",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E6",
    "name": "Thong Lo",
    "x": 598,
    "y": 468,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E7",
    "name": "Ekkamai",
    "x": 618,
    "y": 488,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E8",
    "name": "Phra Khanong",
    "x": 638,
    "y": 508,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E9",
    "name": "On Nut",
    "x": 658,
    "y": 528,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E10",
    "name": "Bang Chak",
    "x": 678,
    "y": 548,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E11",
    "name": "Punnawithi",
    "x": 690,
    "y": 580,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E12",
    "name": "Udom Suk",
    "x": 690,
    "y": 608,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E13",
    "name": "Bang Na",
    "x": 690,
    "y": 636,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E14",
    "name": "Bearing",
    "x": 690,
    "y": 664,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "W1",
    "name": "National Stadium",
    "x": 352,
    "y": 450,
    "label": "b",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S1",
    "name": "Ratchadamri",
    "x": 405,
    "y": 483,
    "label": "r",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S2",
    "name": "Sala Daeng",
    "x": 405,
    "y": 515,
    "label": "tl",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S3",
    "name": "Chong Nonsi",
    "x": 405,
    "y": 557,
    "label": "r",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S4",
    "name": "Saint Louis",
    "x": 401,
    "y": 589,
    "label": "r",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S5",
    "name": "Surasak",
    "x": 387,
    "y": 603,
    "label": "r",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S6",
    "name": "Saphan Taksin",
    "x": 370,
    "y": 620,
    "label": "r",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S7",
    "name": "Krung Thon Buri",
    "x": 318,
    "y": 643,
    "label": "b",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S8",
    "name": "Wongwian Yai",
    "x": 262,
    "y": 643,
    "label": "b",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S9",
    "name": "Pho Nimit",
    "x": 205,
    "y": 643,
    "label": "b",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S10",
    "name": "Talat Phlu",
    "x": 148,
    "y": 643,
    "label": "b",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S11",
    "name": "Wutthakat",
    "x": 105,
    "y": 600,
    "label": "l",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "S12",
    "name": "Bang Wa",
    "x": 62,
    "y": 557,
    "label": "l",
    "lines": [
      "silom"
    ]
  },
  {
    "id": "BL01",
    "name": "Tha Phra",
    "x": 110,
    "y": 557,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL02",
    "name": "Charan 13",
    "x": 110,
    "y": 518,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL03",
    "name": "Fai Chai",
    "x": 110,
    "y": 480,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL04",
    "name": "Bang Khun Non",
    "x": 110,
    "y": 445,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL05",
    "name": "Bang Yi Khan",
    "x": 110,
    "y": 405,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL06",
    "name": "Sirindhorn",
    "x": 110,
    "y": 370,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL07",
    "name": "Bang Phlat",
    "x": 130,
    "y": 330,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL08",
    "name": "Bang O",
    "x": 155,
    "y": 305,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL09",
    "name": "Bang Pho",
    "x": 180,
    "y": 280,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL10",
    "name": "Tao Poon",
    "x": 235,
    "y": 245,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL11",
    "name": "Bang Sue",
    "x": 290,
    "y": 245,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL12",
    "name": "Kamphaeng Phet",
    "x": 335,
    "y": 245,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL13",
    "name": "Chatuchak Park",
    "x": 365,
    "y": 213,
    "label": "l",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL14",
    "name": "Phahon Yothin",
    "x": 403,
    "y": 180,
    "label": "tr",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL15",
    "name": "Lat Phrao",
    "x": 432,
    "y": 180,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL16",
    "name": "Ratchadaphisek",
    "x": 482,
    "y": 192,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL17",
    "name": "Sutthisan",
    "x": 505,
    "y": 215,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL18",
    "name": "Huai Khwang",
    "x": 528,
    "y": 238,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL19",
    "name": "Thailand Cultural Centre",
    "x": 540,
    "y": 280,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL20",
    "name": "Phra Ram 9",
    "x": 540,
    "y": 315,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL21",
    "name": "Phetchaburi",
    "x": 540,
    "y": 350,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL23",
    "name": "Queen Sirikit National Convention Centre",
    "x": 540,
    "y": 482,
    "label": "r",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL24",
    "name": "Khlong Toei",
    "x": 505,
    "y": 515,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL25",
    "name": "Lumphini",
    "x": 462,
    "y": 515,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL26",
    "name": "Si Lom",
    "x": 420,
    "y": 515,
    "label": "br",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL27",
    "name": "Sam Yan",
    "x": 355,
    "y": 515,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL28",
    "name": "Hua Lamphong",
    "x": 300,
    "y": 515,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL29",
    "name": "Wat Mangkon",
    "x": 255,
    "y": 515,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL30",
    "name": "Sam Yot",
    "x": 225,
    "y": 515,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL31",
    "name": "Sanam Chai",
    "x": 194,
    "y": 536,
    "label": "l",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL32",
    "name": "Itsaraphap",
    "x": 145,
    "y": 557,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL34",
    "name": "Bang Wa",
    "x": 62,
    "y": 570,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL22",
    "name": "Sukhumvit",
    "x": 548,
    "y": 450,
    "label": "br",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL33",
    "name": "Bang Phai",
    "x": 86,
    "y": 557,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL35",
    "name": "Phetkasem 48",
    "x": 24,
    "y": 570,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL36",
    "name": "Phasi Charoen",
    "x": -14,
    "y": 570,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL37",
    "name": "Bang Khae",
    "x": -52,
    "y": 570,
    "label": "t",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "BL38",
    "name": "Lak Song",
    "x": -90,
    "y": 570,
    "label": "b",
    "lines": [
      "blue"
    ]
  },
  {
    "id": "N24",
    "name": "Khu Khot",
    "x": 560,
    "y": -163,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N23",
    "name": "Yaek Kor Por Aor",
    "x": 519,
    "y": -163,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N22",
    "name": "Royal Thai Air Force Museum",
    "x": 476,
    "y": -142,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N21",
    "name": "Bhumibol Adulyadej Hospital",
    "x": 458,
    "y": -124,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N20",
    "name": "Saphan Mai",
    "x": 440,
    "y": -107,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N19",
    "name": "Sai Yud",
    "x": 423,
    "y": -90,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N18",
    "name": "Phahon Yothin 59",
    "x": 405,
    "y": -71,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N17",
    "name": "Wat Phra Sri Mahathat",
    "x": 385,
    "y": -42,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N16",
    "name": "11th Infantry Regiment",
    "x": 385,
    "y": -14,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N15",
    "name": "Bang Bua",
    "x": 385,
    "y": 14,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N14",
    "name": "Royal Forest Department",
    "x": 385,
    "y": 40,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N13",
    "name": "Kasetsart University",
    "x": 385,
    "y": 64,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N12",
    "name": "Sena Nikhom",
    "x": 385,
    "y": 94,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N11",
    "name": "Ratchayothin",
    "x": 385,
    "y": 120,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "N10",
    "name": "Phahon Yothin 24",
    "x": 385,
    "y": 148,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E15",
    "name": "Samrong",
    "x": 690,
    "y": 691,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E16",
    "name": "Pu Chao",
    "x": 690,
    "y": 717,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E17",
    "name": "Chang Erawan",
    "x": 690,
    "y": 742,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E18",
    "name": "Royal Thai Naval Academy",
    "x": 690,
    "y": 768,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E19",
    "name": "Pak Nam",
    "x": 690,
    "y": 794,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E20",
    "name": "Srinagarindra",
    "x": 690,
    "y": 819,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E21",
    "name": "Phraek Sa",
    "x": 690,
    "y": 845,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E22",
    "name": "Sai Luat",
    "x": 690,
    "y": 870,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  },
  {
    "id": "E23",
    "name": "Kheha",
    "x": 716,
    "y": 896,
    "label": "r",
    "lines": [
      "sukhumvit"
    ]
  }
];
export const lines: Record<LineId, RailLine> = {
  "sukhumvit": {
    "name": "BTS Sukhumvit",
    "badge": "BTS",
    "color": "#78BE20",
    "stations": [
      "N24",
      "N23",
      "N22",
      "N21",
      "N20",
      "N19",
      "N18",
      "N17",
      "N16",
      "N15",
      "N14",
      "N13",
      "N12",
      "N11",
      "N10",
      "N9",
      "N8",
      "N7",
      "N5",
      "N4",
      "N3",
      "N2",
      "N1",
      "CEN",
      "E1",
      "E2",
      "E3",
      "E4",
      "E5",
      "E6",
      "E7",
      "E8",
      "E9",
      "E10",
      "E11",
      "E12",
      "E13",
      "E14",
      "E15",
      "E16",
      "E17",
      "E18",
      "E19",
      "E20",
      "E21",
      "E22",
      "E23"
    ]
  },
  "silom": {
    "name": "BTS Silom",
    "badge": "BTS",
    "color": "#00857C",
    "stations": [
      "W1",
      "CEN",
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "S10",
      "S11",
      "S12"
    ]
  },
  "blue": {
    "name": "MRT Blue",
    "badge": "MRT",
    "color": "#1E3E93",
    "stations": [
      "BL01",
      "BL02",
      "BL03",
      "BL04",
      "BL05",
      "BL06",
      "BL07",
      "BL08",
      "BL09",
      "BL10",
      "BL11",
      "BL12",
      "BL13",
      "BL14",
      "BL15",
      "BL16",
      "BL17",
      "BL18",
      "BL19",
      "BL20",
      "BL21",
      "BL22",
      "BL23",
      "BL24",
      "BL25",
      "BL26",
      "BL27",
      "BL28",
      "BL29",
      "BL30",
      "BL31",
      "BL32",
      "BL33",
      "BL34",
      "BL35",
      "BL36",
      "BL37",
      "BL38"
    ]
  }
};
// Separate platforms retain their own identity; Siam is shared between BTS lines.
export const interchanges: readonly (readonly [string, string])[] = [
  ['N8', 'BL13'], ['N9', 'BL14'], ['E4', 'BL22'], ['S2', 'BL26'], ['S12', 'BL34'],
];
export function getStation(id: string): Station | undefined {
  return stations.find(station => station.id === id);
}
export function connectedStations(id: string): string[] {
  const neighbors = new Set<string>();
  for (const line of Object.values(lines)) {
    const index = line.stations.indexOf(id);
    if (index < 0) continue;
    const before = line.stations[index - 1];
    const after = line.stations[index + 1];
    if (before) neighbors.add(before);
    if (after) neighbors.add(after);
  }
  // Blue's western loop closes at Tha Phra, before the Lak Song branch.
  if (id === 'BL32') neighbors.add('BL01');
  if (id === 'BL01') {
    neighbors.delete('BL38');
    neighbors.add('BL32');
    neighbors.add('BL33');
  }
  if (id === 'BL32') neighbors.delete('BL33');
  if (id === 'BL33') {
    neighbors.delete('BL32');
    neighbors.add('BL01');
  }
  for (const [a, b] of interchanges) {
    if (a === id) neighbors.add(b);
    if (b === id) neighbors.add(a);
  }
  return [...neighbors];
}
export const lineRoutes: Record<LineId, readonly (readonly string[])[]> = {
  sukhumvit: [lines.sukhumvit.stations],
  silom: [lines.silom.stations],
  blue: [lines.blue.stations.slice(0, 32).concat('BL01'), ['BL01', ...lines.blue.stations.slice(32)]],
};
