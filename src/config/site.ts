/**
 * Centralized Site and Creator Configuration.
 * Edit all footer links, creator information, feedback URL, and disclaimers here.
 */

export interface SiteConfig {
  name: string;
  creator: {
    name: string;
    department: string;
    university: string;
    creditPrefix: string;
    creditText: string;
    github: string;
    linkedin: string;
    email: string;
    labels: {
      github: string;
      linkedin: string;
      email: string;
    };
  };
  feedback: {
    label: string;
    url: string;
  };
  disclaimer: string;
  copyright: string;
  links: {
    routineBuilder: string;
    courseDirectory: string;
    facultyDirectory: string;
    userGuide: string;
    githubRepo: string;
  };
}

export const DATA_UPDATED = '2026-10-23';
export const DATA_NOTE = 'Faculty assignments synced with the UCAM portal.';

export const siteConfig: SiteConfig = {
  name: 'UIU Routine Builder',
  creator: {
    name: 'Md. Akib Mehedi',
    department: 'CSE',
    university: 'United International University',
    creditPrefix: 'Built by',
    creditText: 'Built by Md. Akib Mehedi · CSE, United International University',
    github: 'https://github.com/akibmehedi666/',
    linkedin: 'https://www.linkedin.com/in/akib-mehedi',
    email: 'mailto:akibmehedi666@gmail.com',
    labels: {
      github: 'GitHub',
      linkedin: 'LinkedIn',
      email: 'Email',
    },
  },
  feedback: {
    label: 'Report a wrong section / feedback',
    url: 'https://github.com/akibmehedi666/uiu-routine-builder/issues',
  },
  disclaimer: `Unofficial student project, not affiliated with UIU. Updated ${DATA_UPDATED} (${DATA_NOTE}). Confirm sections in UCAM before registering.`,
  copyright: '© 2026',
  links: {
    routineBuilder: '/builder',
    courseDirectory: '/faculty',
    facultyDirectory: '/faculty-directory',
    userGuide: 'https://github.com/akibmehedi666/uiu-routine-builder#readme',
    githubRepo: 'https://github.com/akibmehedi666/uiu-routine-builder',
  },
};
