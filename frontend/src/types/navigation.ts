import { ReactNode } from 'react';

export interface NavigationItem {
  title: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}
