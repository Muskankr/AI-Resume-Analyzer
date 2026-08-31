export type ReleaseType = "new" | "improved" | "fixed";

export interface ReleaseChange {
  type: ReleaseType;
  title: string;
  description: string;
  issue?: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: ReleaseChange[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: "Unreleased",
    date: "Latest updates",
    title: "What's New",
    description:
      "We've been making Resume Analyzer more helpful, reliable, and easier to use. Here's what's new and improved.",
    changes: [
      {
        type: "new",
        title: "Resume Roast",
        description:
          "Try an optional playful feedback mode that gives humorously constructive suggestions while keeping the advice useful.",
        issue: "#497",
      },
      {
        type: "new",
        title: "Action Plan exports",
        description:
          "Generate a prioritized checklist of resume improvements ranked by their estimated ATS score impact. Export it as Markdown or PDF.",
        issue: "#379",
      },
      {
        type: "new",
        title: "First-time onboarding",
        description:
          "New users can now follow a guided walkthrough to understand the key features of Resume Analyzer.",
      },
      {
        type: "new",
        title: "Resume history improvements",
        description:
          "Keep track of previously analyzed resumes with an improved history experience.",
      },
      {
        type: "new",
        title: "Multi-resume downloads",
        description:
          "Download reports for multiple resumes at once as a single ZIP file, including PDF and JSON reports.",
        issue: "#495",
      },
      {
        type: "new",
        title: "Weekly resume tips",
        description:
          "Opt in to a weekly email containing a practical resume tip and a personalized suggestion for improving your ATS score.",
        issue: "#496",
      },
      {
        type: "new",
        title: "Privacy Policy",
        description:
          "A dedicated Privacy Policy explains data collection, document deletion, history controls, and cookie usage.",
        issue: "#470",
      },
      {
        type: "new",
        title: "Terms of Service",
        description:
          "A dedicated Terms of Service page explains acceptable use, account terms, data handling, intellectual property, and disclaimers.",
        issue: "#469",
      },
      {
        type: "new",
        title: "Automatic draft saving",
        description:
          "Job Description text is automatically saved as a draft so you don't lose your work when refreshing or navigating away.",
        issue: "#533",
      },
      {
        type: "new",
        title: "Granular privacy controls",
        description:
          "Choose whether to opt in to optional analytics and AI Resume Roast features. Optional data collection is off by default.",
        issue: "#536",
      },
      {
        type: "new",
        title: "Responsive navigation",
        description:
          "A mobile-friendly navigation menu is now available on smaller screens, with smooth animations, backdrop support, and Escape-key dismissal.",
        issue: "#245",
      },
      {
        type: "new",
        title: "SEO improvements",
        description:
          "Added sitemap and robots files to help search engines discover and index the application.",
        issue: "#354",
      },
      {
        type: "new",
        title: "Better resume previews",
        description:
          "See the selected resume's name, file size, and file type immediately after uploading it.",
        issue: "#140",
      },
      {
        type: "new",
        title: "Analysis progress indicator",
        description:
          "Follow your progress while Resume Analyzer processes your resume and generates results.",
      },
      {
        type: "improved",
        title: "Resume upload experience",
        description:
          "The upload screen now has a clearer visual hierarchy, structured cards, step indicators, and a more prominent call to action.",
        issue: "#67",
      },
      {
        type: "improved",
        title: "Resume analysis workflow",
        description:
          "Refined the analysis experience to make resume scoring, skill matching, and recommendations easier to understand.",
      },
      {
        type: "improved",
        title: "Skill matching",
        description:
          "Improved the way matching and missing skills are presented so you can quickly identify areas to work on.",
      },
      {
        type: "improved",
        title: "Onboarding and usability",
        description:
          "Improved the onboarding experience and made the interface more consistent across the application.",
      },
      {
        type: "improved",
        title: "Visual design",
        description:
          "Refined application styling, custom scrollbars, navigation elements, and the overall landing page experience.",
      },
      {
        type: "improved",
        title: "Application performance",
        description:
          "Optimized frontend performance and compressed image assets, reducing the image bundle size by approximately 16.8%.",
        issue: "#353",
      },
      {
        type: "improved",
        title: "Account security",
        description:
          "Password hashing now uses Argon2 as the primary method, while existing users can be transparently migrated from the previous hashing method.",
        issue: "#478",
      },
      {
        type: "improved",
        title: "Backend and frontend testing",
        description:
          "Added test coverage reporting and documented coverage thresholds to improve confidence in application changes.",
        issue: "#214",
      },
      {
        type: "fixed",
        title: "Improved text readability",
        description:
          "Fixed low-opacity and faded text appearing across statistics, How It Works cards, the upload area, and footer.",
        issue: "#242",
      },
      {
        type: "fixed",
        title: "Password manager compatibility",
        description:
          "Added appropriate autocomplete attributes to authentication and account forms for better password manager support.",
        issue: "#531",
      },
      {
        type: "fixed",
        title: "UI consistency",
        description:
          "Fixed various styling, responsiveness, and rendering issues throughout the application.",
      },
      {
        type: "fixed",
        title: "Resume analysis issues",
        description:
          "Resolved several bugs affecting resume analysis and result rendering.",
      },
    ],
  },
];