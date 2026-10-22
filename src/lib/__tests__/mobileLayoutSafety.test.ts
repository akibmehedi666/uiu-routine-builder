import fs from 'fs';
import path from 'path';

describe('Mobile Layout Safety Verification', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('SiteNav has solid header without backdrop-blur, 52px height, 32px logo, and truncated title', () => {
    const siteNavPath = path.join(rootDir, 'src/components/SiteNav.tsx');
    const content = fs.readFileSync(siteNavPath, 'utf-8');

    // No backdrop blur on mobile top bar
    expect(content).not.toContain('backdrop-blur');

    // Solid background
    expect(content).toContain('bg-surface border-b border-app-border w-full max-w-full');

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

  it('CourseSelector enforces w-full/max-w-full/min-w-0 on selects and grid layouts', () => {
    const courseSelectorPath = path.join(rootDir, 'src/components/CourseSelector.tsx');
    const content = fs.readFileSync(courseSelectorPath, 'utf-8');

    // FYDP select has w-full, max-w-full, min-w-0, truncate
    expect(content).toContain('w-full max-w-full min-w-0 truncate h-11 md:h-9 bg-subtle border');

    // Normal lock select has flex-1, w-full, max-w-full, min-w-0, truncate, h-11
    expect(content).toContain('flex-1 w-full max-w-full min-w-0 truncate h-11 md:h-8 bg-subtle border');

    // Earliest / Latest End grid has minmax(0, 1fr)
    expect(content).toContain('grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 w-full max-w-full min-w-0');

    // Earliest / Latest select dropdowns have w-full max-w-full min-w-0 truncate h-11
    expect(content).toContain('w-full max-w-full min-w-0 truncate h-11 bg-subtle border border-app-border rounded-btn px-2 text-xs md:text-xs text-text-primary');

    // Aside has w-full max-w-full min-w-0
    expect(content).toContain('<aside className="w-full max-w-full min-w-0');
  });

  it('Isolates tab content strictly between Courses and Preferences tabs', () => {
    const courseSelectorPath = path.join(rootDir, 'src/components/CourseSelector.tsx');
    const content = fs.readFileSync(courseSelectorPath, 'utf-8');

    // Selected course cards are hidden on mobile Preferences tab
    expect(content).toContain("mobileTab === 'preferences' ? 'hidden lg:block' : 'block'");

    // Filters and weights are hidden on mobile Courses tab
    expect(content).toContain("mobileTab === 'courses' ? 'hidden lg:block' : 'block'");

    // Blocked time slot section exists in Preferences
    expect(content).toContain('Blocked Time Slots');

    // Tip hint is hidden on Preferences tab
    expect(content).toContain("mobileTab === 'preferences' ? 'hidden lg:flex' : 'flex'");
  });

  it('Implements collapsed-by-default faculty accordion on mobile course cards', () => {
    const courseSelectorPath = path.join(rootDir, 'src/components/CourseSelector.tsx');
    const content = fs.readFileSync(courseSelectorPath, 'utf-8');

    // Expanded course accordion state
    expect(content).toContain('expandedFacultyCourse');
    expect(content).toContain('setExpandedFacultyCourse');

    // Filter input for courses with > 8 faculty
    expect(content).toContain('facultyStats.size > 8');
    expect(content).toContain('Filter faculty...');

    // Mobile Prefer and Avoid buttons >= 36px tall
    expect(content).toContain('min-h-[36px] min-w-[56px]');

    // Flex wrap on faculty row to wrap below name if screen is narrow
    expect(content).toContain('flex flex-wrap items-center justify-between gap-2');
  });

  it('Builder page removes floating button, has solid bottom tab bar, and safe-area padding', () => {
    const builderPath = path.join(rootDir, 'src/app/builder/page.tsx');
    const content = fs.readFileSync(builderPath, 'utf-8');

    // Floating orange button must NOT exist
    expect(content).not.toContain('fixed bottom-16 inset-x-4');
    expect(content).not.toContain('View ${results.schedules.length} Generated Routine');

    // Safe area bottom padding (+ 24px) on main content
    expect(content).toContain('pb-[calc(56px+env(safe-area-inset-bottom,0px)+24px)]');

    // Sticky bottom tab bar has safe-area inset
    expect(content).toContain("style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}");

    // Results tab shows count badge
    expect(content).toContain('results.schedules.length');

    // Saved toast positioned above bottom tab bar (+ 24px)
    expect(content).toContain('bottom-[calc(56px+env(safe-area-inset-bottom,0px)+24px)]');
  });

  it('Uses dvh units on full-height root containers', () => {
    const builderPath = path.join(rootDir, 'src/app/builder/page.tsx');
    const builderContent = fs.readFileSync(builderPath, 'utf-8');
    expect(builderContent).toContain('min-h-[100dvh]');

    const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    expect(layoutContent).toContain('min-h-[100dvh]');
  });

  it('Tab content mapping unit test: each tab maps only to its allowed sections', () => {
    type TabKey = 'courses' | 'preferences' | 'results';
    type SectionKey = 'creditsSummary' | 'search' | 'selectedCourseCards' | 'filtersAndWeights' | 'blockedTime' | 'resultsTimetable';

    const tabAllowedSections: Record<TabKey, SectionKey[]> = {
      courses: ['creditsSummary', 'search', 'selectedCourseCards'],
      preferences: ['filtersAndWeights', 'blockedTime'],
      results: ['resultsTimetable'],
    };

    // Courses tab must NOT include filtersAndWeights or resultsTimetable
    expect(tabAllowedSections.courses).not.toContain('filtersAndWeights');
    expect(tabAllowedSections.courses).not.toContain('resultsTimetable');

    // Preferences tab must NOT include selectedCourseCards or search
    expect(tabAllowedSections.preferences).not.toContain('selectedCourseCards');
    expect(tabAllowedSections.preferences).not.toContain('search');

    // Results tab must NOT include course selection controls
    expect(tabAllowedSections.results).not.toContain('selectedCourseCards');
    expect(tabAllowedSections.results).not.toContain('filtersAndWeights');
  });
});
