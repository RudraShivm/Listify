import { Tag } from './types';

export const APP_NAME = "Listify";

export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Academic', color: '#6B7FA0' },
  { id: '2', name: 'Personal', color: '#52796F' },
  { id: '3', name: 'Urgent', color: '#C1666B' },
  { id: '4', name: 'Work', color: '#D4A574' },
];

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;      // RGB triplet for light mode
    primaryDark: string;  // RGB triplet for dark mode
    bgLight: string;      // RGB triplet
    bgDark: string;       // RGB triplet
    surfaceLight: string; // RGB triplet
    surfaceDark: string;  // RGB triplet
  }
}

export const THEMES: AppTheme[] = [
  {
    id: 'notion',
    name: 'Notion',
    colors: {
      primary: '55 53 47',        // #37352F - Warm brown-gray
      primaryDark: '167 167 167', // #A7A7A7 - Medium gray for dark mode
      bgLight: '255 255 255',     // #FFFFFF
      bgDark: '25 25 25',         // #191919
      surfaceLight: '251 251 250', // #FBFBFA
      surfaceDark: '47 47 47',    // #2F2F2F
    }
  },
  {
    id: 'todoist',
    name: 'Todoist',
    colors: {
      primary: '219 64 53',       // #DB4035 - Todoist signature red
      primaryDark: '255 115 105', // #FF7369 - Vibrant coral red
      bgLight: '250 250 250',     // #FAFAFA
      bgDark: '31 31 31',         // #1F1F1F
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '41 41 41',    // #292929
    }
  },
  {
    id: 'calm-focus',
    name: 'Calm Focus',
    colors: {
      primary: '76 115 105',      // #4C7369 - Deep sage
      primaryDark: '156 202 189', // #9CCABD - Light mint
      bgLight: '247 249 248',     // #F7F9F8
      bgDark: '28 40 36',         // #1C2824
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '42 54 49',    // #2A3631
    }
  },
  {
    id: 'warm-productivity',
    name: 'Warm Productivity',
    colors: {
      primary: '184 134 77',      // #B8864D - Rich amber
      primaryDark: '251 191 118', // #FBBF76 - Warm gold
      bgLight: '253 251 247',     // #FDFBF7
      bgDark: '42 35 28',         // #2A231C
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '54 46 37',    // #362E25
    }
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    colors: {
      primary: '37 99 235',       // #2563EB - Strong blue
      primaryDark: '96 165 250',  // #60A5FA - Bright sky blue
      bgLight: '248 250 252',     // #F8FAFC
      bgDark: '15 23 42',         // #0F172A
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '30 41 59',    // #1E293B
    }
  },
  {
    id: 'forest-zen',
    name: 'Forest Zen',
    colors: {
      primary: '34 197 94',       // #22C55E - Vibrant green
      primaryDark: '134 239 172', // #86EFAC - Soft mint green
      bgLight: '247 254 247',     // #F7FEF7
      bgDark: '20 29 24',         // #141D18
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '34 47 39',    // #222F27
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    colors: {
      primary: '115 138 219',     // #738ADB - Periwinkle
      primaryDark: '187 154 247', // #BB9AF7 - Soft lavender
      bgLight: '246 247 251',     // #F6F7FB
      bgDark: '26 27 38',         // #1A1B26
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '36 40 59',    // #24283B
    }
  },
  {
    id: 'sunset-warmth',
    name: 'Sunset Warmth',
    colors: {
      primary: '239 68 68',       // #EF4444 - Warm red
      primaryDark: '251 146 60',  // #FB923C - Sunset orange
      bgLight: '255 250 240',     // #FFFAF0
      bgDark: '41 24 20',         // #291814
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '58 33 28',    // #3A211C
    }
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    colors: {
      primary: '124 58 237',      // #7C3AED - Deep purple
      primaryDark: '196 181 253', // #C4B5FD - Soft lavender
      bgLight: '250 245 255',     // #FAF5FF
      bgDark: '24 24 39',         // #181827
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '39 39 57',    // #272739
    }
  },
  {
    id: 'minimalist-mono',
    name: 'Minimalist',
    colors: {
      primary: '64 64 64',        // #404040 - Dark gray
      primaryDark: '156 163 175', // #9CA3AF - Medium gray for dark mode
      bgLight: '255 255 255',     // #FFFFFF
      bgDark: '23 23 23',         // #171717
      surfaceLight: '250 250 250', // #FAFAFA
      surfaceDark: '38 38 38',    // #262626
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colors: {
      primary: '6 182 212',       // #06B6D4 - Cyan
      primaryDark: '103 232 249', // #67E8F9 - Light cyan
      bgLight: '240 253 250',     // #F0FDFA
      bgDark: '19 47 56',         // #132F38
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '30 58 69',    // #1E3A45
    }
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    colors: {
      primary: '219 39 119',      // #DB2777 - Pink
      primaryDark: '244 114 182', // #F472B6 - Soft pink
      bgLight: '253 242 248',     // #FDF2F8
      bgDark: '40 24 32',         // #281820
      surfaceLight: '255 255 255', // #FFFFFF
      surfaceDark: '54 34 44',    // #36222C
    }
  }
];