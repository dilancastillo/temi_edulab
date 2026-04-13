import type { AppBootstrap } from "@/lib/types";

export const emptyBootstrap: AppBootstrap = {
  session: null,
  institution: {
    id: "",
    name: "",
    slug: ""
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
  classSessions: []
};
