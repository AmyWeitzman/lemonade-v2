/**
 * NavItems — shared route and navigation item definitions.
 */
import HomeIcon from '@mui/icons-material/Home';
import BoltIcon from '@mui/icons-material/Bolt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HouseIcon from '@mui/icons-material/House';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonIcon from '@mui/icons-material/Person';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  subtext: string;
  path: string;
  Icon: SvgIconComponent;
}

export interface SecondaryNavItem {
  label: string;
  key: string;
  Icon: SvgIconComponent;
}

/** Primary page routes shown in main navigation */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Tending the Garden', subtext: 'Profile', path: '/', Icon: HomeIcon },
  { label: 'Squeeze the Day', subtext: 'Actions', path: '/actions', Icon: BoltIcon },
  { label: 'Harvest', subtext: 'Finances', path: '/finances', Icon: AccountBalanceIcon },
  { label: 'Seeds to Trees', subtext: 'Jobs', path: '/jobs', Icon: WorkIcon },
  { label: 'Zest for Learning', subtext: 'Education', path: '/education', Icon: SchoolIcon },
  { label: "You Won't Get A 🍋", subtext: 'Transportation', path: '/transportation', Icon: DirectionsCarIcon },
  { label: 'Home Sour Home', subtext: 'Housing', path: '/housing', Icon: HouseIcon },
  { label: 'Lemonade Stand', subtext: 'Community Pitcher', path: '/pitcher', Icon: LocalDrinkIcon },
  { label: "Life's Lemons", subtext: 'Scrapbook', path: '/scrapbook', Icon: MenuBookIcon },
];

/** Nav items for the profile setup workflow */
export const SETUP_NAV_ITEMS: NavItem[] = [
  { label: 'Seeds to Trees', subtext: 'Jobs', path: '/setup/jobs', Icon: WorkIcon },
  { label: 'Zest for Learning', subtext: 'Education', path: '/setup/education', Icon: SchoolIcon },
  { label: 'Profile Setup', subtext: 'Profile', path: '/setup/profile', Icon: PersonIcon },
];
