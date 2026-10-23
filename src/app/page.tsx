import type { Metadata } from 'next';
import { LandingContent } from '../components/LandingContent';
import { getNoticeData } from '../lib/noticeCourses';

export const metadata: Metadata = {
  title: {
    absolute: 'UIU Routine Builder - Build conflict-free class routines',
  },
  description:
    'Automated clash-free routine generator and section optimizer for United International University (UIU), Dhaka. Dept. of CSE & Data Science.',
};

export default function LandingPage() {
  const noticeData = getNoticeData();
  return <LandingContent noticeData={noticeData} />;
}
