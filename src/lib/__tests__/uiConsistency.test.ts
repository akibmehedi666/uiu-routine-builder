import fs from 'fs';
import path from 'path';
import { PAGE_MAX_W } from '../../config/layout';

describe('UI Consistency & Alignment Audit Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(full));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(full);
      }
    });
    return results;
  }

  describe('A. Navigation Bar & Root Layout Integration', () => {
    it('SiteNav is rendered in RootLayout and NOT imported or rendered by individual pages', () => {
      const layoutContent = fs.readFileSync(path.join(rootDir, 'src/app/layout.tsx'), 'utf-8');
      expect(layoutContent).toContain('<SiteNav />');

      const pageFiles = [
        'src/app/page.tsx',
        'src/components/LandingContent.tsx',
        'src/app/builder/page.tsx',
        'src/app/faculty/page.tsx',
      ];

      for (const relPath of pageFiles) {
        const content = fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
        expect(content).not.toContain('<SiteNav');
      }
    });

    it('SiteNav implements 3-column CSS Grid with reserved 2px border for active links', () => {
      const navContent = fs.readFileSync(path.join(rootDir, 'src/components/SiteNav.tsx'), 'utf-8');

      // 3-column CSS Grid
      expect(navContent).toContain('grid-cols-[1fr_auto_1fr]');
      expect(navContent).toContain('justify-self-start');
      expect(navContent).toContain('justify-self-center');
      expect(navContent).toContain('justify-self-end');

      // Desktop height is 64px (h-16)
      expect(navContent).toContain('h-16');

      // Uses shared PAGE_MAX_W
      expect(navContent).toContain('PAGE_MAX_W');

      // Nav links in fixed order: Home, Builder, Course Directory
      const homeIdx = navContent.indexOf('Home');
      const builderIdx = navContent.indexOf('Builder');
      const dirIdx = navContent.indexOf('Course Directory');
      expect(homeIdx).toBeGreaterThan(-1);
      expect(builderIdx).toBeGreaterThan(homeIdx);
      expect(dirIdx).toBeGreaterThan(builderIdx);

      // Reserved border-b-2 on all links
      expect(navContent).toContain('border-b-2');
      expect(navContent).toContain('border-transparent');
      expect(navContent).toContain('border-orange-500 font-semibold text-orange-600');
    });
  });

  describe('B. Max-Width & Wrapper Safety', () => {
    it('no hardcoded 1400px, 1536px, or 1600px max-width outside layout.ts config', () => {
      const srcFiles = walk(path.join(rootDir, 'src'));
      const hardcodedPatterns = [/max-w-\[1400px\]/, /max-w-\[1536px\]/, /max-w-\[1600px\]/];

      for (const file of srcFiles) {
        // Skip layout config definition itself and test files
        if (file.endsWith('layout.ts') || file.includes('__tests__')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of hardcodedPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it('no max-w-full, w-screen, 100vw, or overflow-x-hidden/clip on main or root page containers', () => {
      const builderContent = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
      const mainMatch = builderContent.match(/<main[^>]*>/);
      expect(mainMatch).not.toBeNull();
      const mainTag = mainMatch![0];
      expect(mainTag).not.toContain('max-w-full');
      expect(mainTag).not.toContain('w-screen');
      expect(mainTag).not.toContain('100vw');
      expect(mainTag).not.toContain('overflow-x-clip');
      expect(mainTag).not.toContain('overflow-x-hidden');
    });
  });

  describe('C. Typography Scale & Readability', () => {
    it('all arbitrary text-[Npx] in src are strictly within defined scale [11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40]', () => {
      const validScale = new Set([11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40]);
      const srcFiles = walk(path.join(rootDir, 'src'));
      const offScale: { file: string; size: number }[] = [];

      for (const file of srcFiles) {
        if (file.includes('__tests__')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.matchAll(/text-\[(\d+)px\]/g);
        for (const m of matches) {
          const size = parseInt(m[1], 10);
          if (!validScale.has(size)) {
            offScale.push({ file: path.relative(rootDir, file), size });
          }
        }
      }

      expect(offScale).toEqual([]);
    });

    it('timetable and chip micro text is never below 11px', () => {
      const srcFiles = walk(path.join(rootDir, 'src'));
      for (const file of srcFiles) {
        if (file.includes('__tests__')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toMatch(/text-\[[0-9]px\]/);
        expect(content).not.toMatch(/text-\[10px\]/);
      }
    });

    it('page H1 on Course Directory is 28px bold', () => {
      const dirContent = fs.readFileSync(path.join(rootDir, 'src/app/faculty/page.tsx'), 'utf-8');
      expect(dirContent).toMatch(/<h1[^>]*text-\[28px\][^>]*font-bold[^>]*>/);
    });
  });

  describe('D. Unified BrandLogo Component', () => {
    it('BrandLogo component exists and provides standard size variants', () => {
      const logoContent = fs.readFileSync(path.join(rootDir, 'src/components/BrandLogo.tsx'), 'utf-8');
      expect(logoContent).toContain('export function BrandLogo');
      expect(logoContent).toContain('size?:');
      expect(logoContent).toContain('w-8 h-8 md:w-9 md:h-9'); // 32px mobile, 36px desktop
      expect(logoContent).toContain('UIU');
    });

    it('legacy Header.tsx component is completely removed', () => {
      const headerPath = path.join(rootDir, 'src/components/Header.tsx');
      expect(fs.existsSync(headerPath)).toBe(false);
    });
  });

  describe('E. Favicon, Manifest & Tab Titles', () => {
    it('generates and provides all standard favicon and PWA icons', () => {
      expect(fs.existsSync(path.join(rootDir, 'src/app/icon.svg'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'src/app/favicon.ico'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'src/app/apple-icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'public/icon-192.png'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'public/icon-512.png'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'src/app/manifest.ts'))).toBe(true);
    });

    it('RootLayout declares metadata title template and cache-busting icons', () => {
      const layoutContent = fs.readFileSync(path.join(rootDir, 'src/app/layout.tsx'), 'utf-8');
      expect(layoutContent).toContain("template: '%s | UIU Routine Builder'");
      expect(layoutContent).toContain("default: 'Routine Builder | UIU'");
      expect(layoutContent).toContain('/icon.svg?v=2');
      expect(layoutContent).toContain('/favicon.ico?v=2');
      expect(layoutContent).toContain('/apple-icon.png?v=2');
    });

    it('Landing page declares absolute title', () => {
      const pageContent = fs.readFileSync(path.join(rootDir, 'src/app/page.tsx'), 'utf-8');
      expect(pageContent).toContain('UIU Routine Builder - Build conflict-free class routines');
    });

    it('Builder layout sets Builder title', () => {
      const builderLayoutContent = fs.readFileSync(path.join(rootDir, 'src/app/builder/layout.tsx'), 'utf-8');
      expect(builderLayoutContent).toContain("title: 'Builder'");
    });

    it('Faculty directory layout sets Course Directory title', () => {
      const facultyLayoutContent = fs.readFileSync(path.join(rootDir, 'src/app/faculty/layout.tsx'), 'utf-8');
      expect(facultyLayoutContent).toContain("title: 'Course Directory'");
    });
  });
});
