/**
 * R.J. College — B.Sc. IT LMS demo data (edit freely).
 * Demo logins are under `students` and `teachers`.
 * Teacher uploads & “submit notes” tasks persist in the browser (localStorage).
 */
(function () {
  "use strict";

  window.COLLEGE_CONFIG = {
    college: {
      /** Shown in headers and titles. */
      name: "R.J. College",
      shortName: "R.J. College",
      /**
       * Full written name of the institution (“College” in full, not “Clg”).
       * Edit `fullOfficialName` if your trust or legal title is longer.
       */
      fullOfficialName:
        "R.J. College of Arts, Science and Information Technology",
      tagline: "B.Sc. IT — notes, submissions, and coursework in one place.",
      establishedYear: 1963,
      affiliation: "Affiliated college (example)",
      accreditation: "NAAC accredited (example)",
      address: "R.J. College Campus, Ring Road, Block 3, City 400001, India",
      phone: "+91 22 0000 0000",
      email: "office@rjcollege.edu.example",
      website: "https://rjcollege.edu.example",
      logoLetter: "R",
      /** Optional: real admissions URL opens in a new tab from the registration screen. */
      registrationExternalUrl: "",
    },

    programBscIt: "B.Sc. Information Technology (B.Sc. IT)",

    academicYear: "2025–26",
    currentSemester: "Semester IV (Even)",

    departments: [
      { id: "it", name: "Information Technology (B.Sc. IT)", hod: "Dr. Rajesh Kulkarni" },
    ],

    courses: [
      {
        code: "BIT301",
        name: "Data Structures using C/C++",
        credits: 4,
        deptId: "it",
        instructor: "Prof. Meera Joshi",
        room: "IT Lab — Block B",
        module: "Unit 3 — Trees & traversals",
        assignments: [
          {
            title: "Implement BST with inorder, preorder, postorder print",
            status: "Incomplete",
            dueOffsetDays: 3,
          },
          {
            title: "Tutorial: AVL rotation cases (written)",
            status: "Pending",
            dueOffsetHours: 30,
          },
        ],
      },
      {
        code: "BIT302",
        name: "Database Management Systems",
        credits: 4,
        deptId: "it",
        instructor: "Prof. Amit Desai",
        room: "Room 204 — Block B",
        module: "SQL joins & subqueries",
        assignments: [
          {
            title: "Lab: Library schema in 3NF + 10 SQL queries",
            status: "Incomplete",
            dueOffsetDays: 6,
          },
        ],
      },
      {
        code: "BIT303",
        name: "Web Technologies",
        credits: 3,
        deptId: "it",
        instructor: "Prof. Sneha Iyer",
        room: "Lab L1 — Block B",
        module: "HTML/CSS layout & responsive basics",
        assignments: [
          {
            title: "Mini site: 3 pages + shared navbar (hosted zip)",
            status: "Pending",
            dueOffsetDays: 10,
          },
        ],
      },
    ],

    /**
     * Teachers — staff code + simple demo password.
     * Each `courseCodes` must match entries in `courses`.
     */
    teachers: [
      {
        teacherId: "501",
        password: "1234",
        firstName: "Meera",
        lastName: "Joshi",
        designation: "Assistant Professor",
        courseCodes: ["BIT301", "BIT302"],
      },
      {
        teacherId: "502",
        password: "1234",
        firstName: "Amit",
        lastName: "Desai",
        designation: "Associate Professor",
        courseCodes: ["BIT302", "BIT303"],
      },
    ],

    /**
     * Students — `studentId` is the number printed on the college ID card (digits only).
     * Password is a short demo PIN; change both in this file for your needs.
     */
    students: [
      {
        studentId: "240045",
        password: "1234",
        firstName: "Karan",
        lastName: "Malhotra",
        program: "B.Sc. Information Technology",
        rollNo: "BIT24-045",
        semester: 4,
        enrolledCourseCodes: ["BIT301", "BIT302", "BIT303"],
      },
      {
        studentId: "230012",
        password: "1234",
        firstName: "Priya",
        lastName: "Nair",
        program: "B.Sc. Information Technology",
        rollNo: "BIT23-012",
        semester: 6,
        enrolledCourseCodes: ["BIT301", "BIT302"],
      },
    ],

    /**
     * First-time browser seed for teacher notes & submission requests (merged into localStorage once).
     */
    seedDynamicContent: {
      notes: [
        {
          teacherId: "501",
          courseCode: "BIT301",
          title: "Unit 3 — Tree traversals (PDF outline)",
          fileName: "BIT301_U3_trees.pdf",
        },
        {
          teacherId: "502",
          courseCode: "BIT303",
          title: "Week 4 — Flexbox & grid cheat-sheet",
          fileName: "BIT303_layout_cheatsheet.pdf",
        },
      ],
      noteSubmissionRequests: [
        {
          teacherId: "501",
          courseCode: "BIT301",
          title: "Submit handwritten notes — Chapter 5 (Trees)",
          description:
            "Scan or photograph neat notes. File name: RollNo_BIT301_Ch5.pdf. Max 5 MB in real deployment.",
          dueOffsetDays: 4,
        },
        {
          teacherId: "502",
          courseCode: "BIT302",
          title: "Submit ER diagram + relational schema (assignment)",
          description: "One PDF per group; mention group ID in the first page.",
          dueOffsetDays: 7,
        },
      ],
    },
  };
})();
