# Career Tracks Admin Panel Documentation

## Overview

The **Career Tracks Admin Panel** enables maintainers and administrators to create, edit, and adjust target career tracks and their associated required and optional skill sets. 

Changes take effect immediately across candidate resume analysis, readiness evaluation, and target score benchmarking without requiring application restarts.

---

## Key Features

- **Dynamic Track Creation**: Add new specialized job roles (e.g. AI Engineer, Mobile Developer).
- **Skill Association Engine**: Classify skills as *Required* (core requirements) vs *Optional / Recommended*.
- **Score Threshold Tuning**: Set minimum readiness thresholds and target experience levels per role.
- **Immediate Calculation Sync**: Integrated with `careerTrackManager.calculateTrackMatch` for real-time candidate feedback.

---

## Usage Guide

1. Navigate to the Admin Dashboard / Career Tracks section.
2. View existing role tracks, target experience levels, and required/optional skill chips.
3. Click **+ Create Career Track** to add a new role or click **Edit** on an existing card.
4. Modify skill lists using comma-separated values (e.g. `React.js, TypeScript, Next.js`).
5. Save changes to update candidate score calculations dynamically.
