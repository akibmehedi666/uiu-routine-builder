import fs from 'fs';
import path from 'path';
import { PAGE_MAX_W } from '../../config/layout';

describe('Layout Desktop Width Consistency & Safety Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('exports PAGE_MAX_W as max-w-[1400px]', () => {
    expect(PAGE_MAX_W).toBe('max-w-[1400px]');
  });

  it('Builder page uses shared PAGE_MAX_W on <main> and does NOT have max-w-full or max-w-[1600px]', () => {
    const builderPath = path.join(rootDir, 'src/app/builder/page.tsx');
    const content = fs.readFileSync(builderPath, 'utf-8');

    // Must import and use PAGE_MAX_W
    expect(content).toContain('PAGE_MAX_W');
    expect(content).toMatch(/<main[^>]*\$\{PAGE_MAX_W\}[^>]*>/);

    // Must NOT contain old 1600px max-width
    expect(content).not.toContain('max-w-[1600px]');

    // Must NOT have max-w-full next to or on <main>
    const mainTagMatch = content.match(/<main[^>]*>/);
    expect(mainTagMatch).not.toBeNull();
    const mainTag = mainTagMatch![0];
    expect(mainTag).not.toContain('max-w-full');
    expect(mainTag).not.toContain('100vw');
    expect(mainTag).not.toContain('overflow-x-clip');
    expect(mainTag).not.toContain('overflow-x-hidden');
  });

  it('Course Directory page uses shared PAGE_MAX_W across all containers without hardcoding 1400px or 1600px', () => {
    const facultyPath = path.join(rootDir, 'src/app/faculty/page.tsx');
    const content = fs.readFileSync(facultyPath, 'utf-8');

    // Must import and use PAGE_MAX_W
    expect(content).toContain('PAGE_MAX_W');
    expect(content).toMatch(/<main[^>]*\$\{PAGE_MAX_W\}[^>]*>/);

    // Hardcoded max-width values should be replaced
    expect(content).not.toContain('max-w-[1400px]');
    expect(content).not.toContain('max-w-[1600px]');
  });

  it('SiteNav uses shared PAGE_MAX_W so header aligns with content on all pages', () => {
    const navPath = path.join(rootDir, 'src/components/SiteNav.tsx');
    const content = fs.readFileSync(navPath, 'utf-8');

    expect(content).toContain('PAGE_MAX_W');
    expect(content).toContain('${PAGE_MAX_W} mx-auto px-3 sm:px-6');
    expect(content).not.toContain('max-w-[1600px]');
    expect(content).not.toContain('max-w-[1400px]');
  });

  it('SiteFooter uses shared PAGE_MAX_W without hardcoding 1400px or 1600px', () => {
    const footerPath = path.join(rootDir, 'src/components/SiteFooter.tsx');
    const content = fs.readFileSync(footerPath, 'utf-8');

    expect(content).toContain('PAGE_MAX_W');
    expect(content).toContain('${PAGE_MAX_W} mx-auto px-4 sm:px-6');
    expect(content).not.toContain('max-w-[1400px]');
    expect(content).not.toContain('max-w-[1600px]');
  });

  it('Timetable grid columns shrink with 56px time column and minmax(0,1fr) for day columns', () => {
    const timetablePath = path.join(rootDir, 'src/components/Timetable.tsx');
    const content = fs.readFileSync(timetablePath, 'utf-8');

    expect(content).toContain('grid-cols-[56px_repeat(5,minmax(0,1fr))]');
    expect(content).toContain('left-[56px]');
  });
});
