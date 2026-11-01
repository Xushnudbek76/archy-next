import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Folder,
  GraduationCap,
  House,
  LibraryBig,
  LogOut,
  Menu,
  Mic,
  Plus,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  X,
  AudioLines,
} from 'lucide-react';

const icons = {
  grid: House,
  book: BookOpenText,
  audio: AudioLines,
  settings: Settings2,
  arrow: ArrowRight,
  spark: Sparkles,
  check: Check,
  calendar: CalendarDays,
  chevron: ChevronRight,
  help: CircleHelp,
  document: FileText,
  folder: Folder,
  courses: GraduationCap,
  history: LibraryBig,
  logout: LogOut,
  menu: Menu,
  mic: Mic,
  plus: Plus,
  search: Search,
  user: UserRound,
  close: X,
};
export type IconName = keyof typeof icons;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" />;
}
