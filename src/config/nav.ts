/**
 * Navigation Bar Configuration.
 * Single source of truth driving route-based navigation items and right-cluster actions.
 */

export type NavRoute = 'home' | 'builder' | 'directory' | 'faculty-directory' | 'exams';

export interface NavItem {
  route: NavRoute;
  href: string;
  label: string;
  mobileLabel?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'home', href: '/', label: 'Home' },
  { route: 'builder', href: '/builder', label: 'Builder', mobileLabel: 'Routine Builder' },
  { route: 'directory', href: '/faculty', label: 'Course Directory' },
  { route: 'faculty-directory', href: '/faculty-directory', label: 'Faculty Directory' },
  { route: 'exams', href: '/exams', label: 'Exams' },
];

export interface NavActionConfig {
  showSaved: boolean;
  showShortcuts: boolean;
  showGuide: boolean;
  showBuildCta: boolean;
}

export interface NavRouteConfig {
  activeRoute: NavRoute;
  actions: NavActionConfig;
}

export function getNavConfig(pathname: string): NavRouteConfig {
  if (pathname === '/builder') {
    return {
      activeRoute: 'builder',
      actions: {
        showSaved: true,
        showShortcuts: true,
        showGuide: true,
        showBuildCta: false,
      },
    };
  }

  // Handle Faculty Directory before generic /faculty prefix
  if (pathname.startsWith('/faculty-directory')) {
    return {
      activeRoute: 'faculty-directory',
      actions: {
        showSaved: false,
        showShortcuts: false,
        showGuide: true,
        showBuildCta: true,
      },
    };
  }

  if (pathname.startsWith('/faculty') || pathname.startsWith('/courses')) {
    return {
      activeRoute: 'directory',
      actions: {
        showSaved: true,
        showShortcuts: false,
        showGuide: true,
        showBuildCta: true,
      },
    };
  }

  if (pathname.startsWith('/exams')) {
    return {
      activeRoute: 'exams',
      actions: {
        showSaved: true,
        showShortcuts: false,
        showGuide: true,
        showBuildCta: true,
      },
    };
  }

  // Default: Landing / Home (and any fallback page)
  return {
    activeRoute: 'home',
    actions: {
      showSaved: false,
      showShortcuts: false,
      showGuide: false,
      showBuildCta: true,
    },
  };
}
