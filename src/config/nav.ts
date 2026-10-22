/**
 * Navigation Bar Configuration.
 * Single source of truth driving route-based navigation items and right-cluster actions.
 */

export type NavRoute = 'home' | 'builder' | 'directory' | 'faculty-directory';

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
