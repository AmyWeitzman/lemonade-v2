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
import ChatIcon from '@mui/icons-material/Chat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
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
  { label: 'Lemonade', path: '/', Icon: HomeIcon },
  { label: 'Squeeze the Day', path: '/actions', Icon: BoltIcon },
  { label: 'Harvest', path: '/finances', Icon: AccountBalanceIcon },
  { label: 'Seeds to Trees', path: '/jobs', Icon: WorkIcon },
  { label: 'Zest for Learning', path: '/education', Icon: SchoolIcon },
  { label: "You Won't Get A 🍋", path: '/transportation', Icon: DirectionsCarIcon },
  { label: 'Home Sour Home', path: '/housing', Icon: HouseIcon },
  { label: 'Lemonade Stand', path: '/pitcher', Icon: LocalDrinkIcon },
  { label: "Life's Lemons", path: '/scrapbook', Icon: MenuBookIcon },
];

/** Secondary drawer items (profile, chat, notifications, settings) */
export const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  { label: 'Tending the Garden', key: 'profile', Icon: PersonIcon },
  { label: 'Lemon Tea', key: 'chat', Icon: ChatIcon },
  { label: 'Planting & Pruning', key: 'notifications', Icon: NotificationsIcon },
  { label: 'Nutrients', key: 'settings', Icon: SettingsIcon },
];
