import fs from 'fs';
import path from 'path';

describe('Mobile Layout Safety Verification', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('SiteNav has single row 52px mobile header, 32px logo, and truncated title', () => {
    const siteNavPath = path.join(rootDir, 'src/components/SiteNav.tsx');
    const content = fs.readFileSync(siteNavPath, 'utf-8');

    // Header height
    expect(content).toContain('h-[52px] md:h-14');

    // Logo size
    expect(content).toContain('w-8 h-8 md:w-9 md:h-9');

    // Title truncation
    expect(content).toContain('Routine Builder');
    expect(content).toContain('truncate');

    // Fall 2026 badge hidden on mobile phones
    expect(content).toMatch(/hidden sm:inline-block[\s\S]*?Fall 2026/);
  });

  it('CourseSelector implements mobile full-screen search sheet with history popstate & scroll lock', () => {
    const courseSelectorPath = path.join(rootDir, 'src/components/CourseSelector.tsx');
    const content = fs.readFileSync(courseSelectorPath, 'utf-8');

    // Mobile search sheet state and history handling
    expect(content).toContain('mobileSearchOpen');
    expect(content).toContain("history.pushState({ mobileSearch: true }, '')");
    expect(content).toContain('popstate');
    expect(content).toContain("document.body.style.overflow = 'hidden'");

    // Input has text-base (16px) to prevent iOS auto-zoom
    expect(content).toContain('text-base text-text-primary');

    // Safe area top and bottom on mobile search sheet
    expect(content).toContain('pt-[env(safe-area-inset-top,0px)]');
    expect(content).toContain('pb-[env(safe-area-inset-bottom,0px)]');

    // Selected courses box is natural flow (overflow-visible) on mobile
    expect(content).toContain('overflow-visible lg:overflow-y-auto');

    // Compact collapsible credit warning on mobile
    expect(content).toContain('creditWarningExpanded');
  });

  it('Builder page removes floating button, has solid bottom tab bar, and safe-area padding', () => {
    const builderPath = path.join(rootDir, 'src/app/builder/page.tsx');
    const content = fs.readFileSync(builderPath, 'utf-8');

    // Floating orange button must NOT exist
    expect(content).not.toContain('fixed bottom-16 inset-x-4');
    expect(content).not.toContain('View ${results.schedules.length} Generated Routine');

    // Safe area bottom padding on main content
    expect(content).toContain('pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)]');

    // Sticky bottom tab bar has safe-area inset
    expect(content).toContain("style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}");

    // Results tab shows count badge
    expect(content).toContain('results.schedules.length');

    // Saved toast positioned above bottom tab bar
    expect(content).toContain('bottom-[calc(56px+env(safe-area-inset-bottom,0px)+16px)]');
  });

  it('Uses dvh units on full-height root containers', () => {
    const builderPath = path.join(rootDir, 'src/app/builder/page.tsx');
    const builderContent = fs.readFileSync(builderPath, 'utf-8');
    expect(builderContent).toContain('min-h-[100dvh]');

    const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    expect(layoutContent).toContain('min-h-[100dvh]');
  });
});
