import type { AppBootstrap } from "@/lib/types";

export const emptyBootstrap: AppBootstrap = {
  session: null,
  institution: {
    id: "",
    name: "",
    slug: "",
    country: "Colombia",
    defaultLocale: "es-CO",
    enabledLevels: [],
    dataPolicyMode: "TEMPLATE",
    marketingConsentEnabled: false
  },
  courses: [],
  missions: [],
  students: [],
  assignments: [],
  studentWorks: [],
  profile: {
    id: "",
    institutionId: "",
    fullName: "",
    email: "",
    biography: ""
  },
  robots: [],
  classSessions: [],
  pairingRequests: [],
  institutional: {
    campuses: [],
    floors: [],
    spaces: [],
    licenses: [],
    branding: null,
    policies: [],
    templates: [],
    reportSnapshots: [],
    maintenanceRecords: [],
    auditLogs: [],
    summary: {
      campuses: 0,
      spaces: 0,
      activeTeachers: 0,
      activeStudents: 0,
      robots: 0,
      connectedRobots: 0,
      activeLicenses: 0,
      publishedPolicies: 0,
      approvedTemplates: 0
    }
  }
};
