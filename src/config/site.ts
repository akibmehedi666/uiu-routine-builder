/**
 * Centralized Site and Creator Configuration.
 * Edit links, creator information, feedback URL, and disclaimers here.
 */

export interface SiteConfig {
  name: string;
  trimester: string;
  creator: {
    name: string;
    department: string;
    university: string;
    creditText: string;
    github: string;
    linkedin: string;
    email: string;
  };
  feedback: {
    label: string;
    url: string;
  };
  disclaimer: string;
  links: {
    routineBuilder: string;
    courseDirectory: string;
    userGuide: string;
    githubRepo: string;
  };
}

export const siteConfig: SiteConfig = {
  name: 'UIU Routine Builder',
  trimester: 'Fall 2026 Trimester • Dept. of CSE & BSDS',
  creator: {
    name: 'Md. Akib Mehedi',
    department: 'CSE',
    university: 'United International University',
    creditText: 'Built by Md. Akib Mehedi · CSE, United International University',
    github: 'https://github.com/akibmehedi666/',
    linkedin: 'https://www.linkedin.com/in/akib-mehedi',
    email: 'mailto:akibmehedi666@gmail.com',
  },
  feedback: {
    label: 'Report a wrong section / feedback',
    url: 'https://github.com/akibmehedi666/uiu-routine-builder/issues',
  },
  disclaimer:
    'Unofficial student project, not affiliated with UIU. Confirm sections in UCAM before registering.',
  links: {
    routineBuilder: '/builder',
    courseDirectory: '/faculty',
    userGuide: 'https://github.com/akibmehedi666/uiu-routine-builder#readme',
    githubRepo: 'https://github.com/akibmehedi666/uiu-routine-builder',
  },
};
