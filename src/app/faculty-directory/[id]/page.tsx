import type { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import {
  getAllFacultyStats,
  getFacultyStatsById,
} from '../../../lib/facultyStats';
import { resolveFacultyId, facultyIdAliases } from '../../../lib/facultyAliases';
import { FacultyDetailView } from './FacultyDetailView';

// Static params generation for all canonical faculty members plus old aliases for zero 404s
export function generateStaticParams() {
  const allFaculty = getAllFacultyStats();
  const params: { id: string }[] = allFaculty.map((f) => ({
    id: f.id,
  }));

  // Include legacy alias IDs so old links and bookmarks statically resolve
  for (const oldId of Object.keys(facultyIdAliases)) {
    params.push({ id: oldId });
  }

  return params;
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const canonicalId = resolveFacultyId(params.id);
  const faculty = getFacultyStatsById(canonicalId);
  if (!faculty) {
    return {
      title: 'Faculty Not Found',
    };
  }

  return {
    title: faculty.name,
    description: `Teaching timetable and course section assignments for ${faculty.name} (${faculty.programs.join(
      ', '
    )}) at UIU for Fall 2026.`,
  };
}

export default function FacultyDetailPage({ params }: { params: { id: string } }) {
  const canonicalId = resolveFacultyId(params.id);
  const faculty = getFacultyStatsById(canonicalId);

  if (!faculty) {
    notFound();
  }

  return <FacultyDetailView faculty={faculty} />;
}
